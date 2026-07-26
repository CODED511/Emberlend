// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount)
        external
        returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

/**
 * @title EmberLendMarket
 * @notice Multi-asset lending market for Emberlend on Hedera.
 *
 * Supersedes EmberLendPool, which was HBAR-only and — critically — tracked
 * supply as a single global counter, so lenders had no claim on what they put
 * in. Here every position is per user, per asset, and withdrawable.
 *
 * Model, deliberately Aave-shaped but much smaller:
 *  - Any listed asset can be supplied, withdrawn, borrowed and repaid.
 *    HBAR participates as `NATIVE` (address(0)) so one code path covers both.
 *  - Supplied assets flagged as collateral back your borrows. Each asset has
 *    its own LTV (how much you may borrow against it) and liquidation
 *    threshold (how far it may fall before you are unhealthy).
 *  - Health factor = collateral value × threshold ÷ debt value, in 1e18.
 *    Below 1e18 a position is liquidatable. No debt means infinite health.
 *  - Borrow interest accrues linearly and is capitalised into principal on
 *    each interaction, so health factor drifts with time as real debt would.
 *
 * Units: HBAR amounts are tinybar (8 dp) because that is what the Hedera EVM
 * gives us in msg.value. Token amounts use each token's own decimals. Prices
 * are USD in 8 dp, and all internal value math normalises to 8 dp USD.
 */
contract EmberLendMarket {
    address public constant NATIVE = address(0);
    uint256 public constant BPS = 10_000;
    uint256 public constant WAD = 1e18;
    uint256 public constant YEAR = 365 days;
    /** Returned by healthFactor() when an account has no debt. */
    uint256 public constant NO_DEBT = type(uint256).max;

    struct Market {
        bool listed;
        uint8 decimals;
        uint256 price; // USD, 8 dp
        uint256 supplyRateBps; // display APY for suppliers
        uint256 borrowRateBps; // APR actually charged
        uint256 ltvBps; // borrowing power granted by this collateral
        uint256 liqThresholdBps; // health factor threshold
        uint256 totalSupplied;
        uint256 totalBorrowed;
    }

    struct Debt {
        uint256 principal;
        uint256 lastAccrual;
    }

    mapping(address => Market) public markets;
    address[] public assets;

    mapping(address => mapping(address => uint256)) public supplied;
    mapping(address => mapping(address => Debt)) public debts;
    mapping(address => mapping(address => bool)) public collateralOn;

    address public owner;
    bool public paused;

    event MarketListed(address indexed asset, uint8 decimals, uint256 price);
    event MarketUpdated(address indexed asset, uint256 price);
    event Supplied(address indexed user, address indexed asset, uint256 amount);
    event Withdrawn(address indexed user, address indexed asset, uint256 amount);
    event Borrowed(address indexed user, address indexed asset, uint256 amount);
    event Repaid(
        address indexed user,
        address indexed asset,
        uint256 amount,
        uint256 interest
    );
    event CollateralSet(
        address indexed user,
        address indexed asset,
        bool enabled
    );
    event Paused(bool state);

    error NotOwner();
    error IsPaused();
    error Reentrant();
    error NotListed();
    error ZeroAmount();
    error InsufficientBalance();
    error InsufficientLiquidity();
    error Undercollateralized();
    error NoDebt();
    error NativeValueMismatch();
    error TransferFailed();

    uint256 private _lock = 1;

    modifier nonReentrant() {
        if (_lock == 2) revert Reentrant();
        _lock = 2;
        _;
        _lock = 1;
    }
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    modifier notPaused() {
        if (paused) revert IsPaused();
        _;
    }
    modifier listed(address asset) {
        if (!markets[asset].listed) revert NotListed();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // --- Admin ---------------------------------------------------------------

    function listMarket(
        address asset,
        uint8 dec,
        uint256 price,
        uint256 supplyRateBps,
        uint256 borrowRateBps,
        uint256 ltvBps,
        uint256 liqThresholdBps
    ) external onlyOwner {
        require(ltvBps <= liqThresholdBps, "ltv > threshold");
        require(liqThresholdBps <= BPS, "threshold > 100%");
        if (!markets[asset].listed) assets.push(asset);
        Market storage m = markets[asset];
        m.listed = true;
        m.decimals = dec;
        m.price = price;
        m.supplyRateBps = supplyRateBps;
        m.borrowRateBps = borrowRateBps;
        m.ltvBps = ltvBps;
        m.liqThresholdBps = liqThresholdBps;
        emit MarketListed(asset, dec, price);
    }

    /// @dev Testnet price feed. Mainnet would read an oracle instead.
    function setPrice(address asset, uint256 price)
        external
        onlyOwner
        listed(asset)
    {
        markets[asset].price = price;
        emit MarketUpdated(asset, price);
    }

    function setPaused(bool state) external onlyOwner {
        paused = state;
        emit Paused(state);
    }

    // --- Supply / withdraw ---------------------------------------------------

    function supply(address asset, uint256 amount)
        external
        payable
        notPaused
        listed(asset)
        nonReentrant
    {
        uint256 amt = _pullFunds(asset, amount);
        if (amt == 0) revert ZeroAmount();

        supplied[msg.sender][asset] += amt;
        markets[asset].totalSupplied += amt;

        // First supply of an asset defaults to being collateral, matching
        // what users expect from the "collateral: yes" column.
        if (!collateralOn[msg.sender][asset]) {
            collateralOn[msg.sender][asset] = true;
            emit CollateralSet(msg.sender, asset, true);
        }
        emit Supplied(msg.sender, asset, amt);
    }

    function withdraw(address asset, uint256 amount)
        external
        notPaused
        listed(asset)
        nonReentrant
    {
        if (amount == 0) revert ZeroAmount();
        if (supplied[msg.sender][asset] < amount) revert InsufficientBalance();
        if (_available(asset) < amount) revert InsufficientLiquidity();

        supplied[msg.sender][asset] -= amount;
        markets[asset].totalSupplied -= amount;

        // Pulling collateral must not push the account underwater.
        if (_healthFactor(msg.sender) < WAD) revert Undercollateralized();

        _sendFunds(asset, msg.sender, amount);
        emit Withdrawn(msg.sender, asset, amount);
    }

    function setCollateral(address asset, bool enabled)
        external
        listed(asset)
        nonReentrant
    {
        collateralOn[msg.sender][asset] = enabled;
        if (!enabled && _healthFactor(msg.sender) < WAD) {
            revert Undercollateralized();
        }
        emit CollateralSet(msg.sender, asset, enabled);
    }

    // --- Borrow / repay ------------------------------------------------------

    function borrow(address asset, uint256 amount)
        external
        notPaused
        listed(asset)
        nonReentrant
    {
        if (amount == 0) revert ZeroAmount();
        if (_available(asset) < amount) revert InsufficientLiquidity();

        _capitalize(msg.sender, asset);
        debts[msg.sender][asset].principal += amount;
        markets[asset].totalBorrowed += amount;

        // New debt is limited by borrowing power (LTV), which is stricter than
        // the liquidation threshold. Checking only the health factor here would
        // let a borrower open a position that is already at the liquidation
        // edge; LTV leaves the intended buffer between the two.
        (, uint256 powerUsd, uint256 debtUsd) = _positions(msg.sender);
        if (debtUsd > powerUsd) revert Undercollateralized();

        _sendFunds(asset, msg.sender, amount);
        emit Borrowed(msg.sender, asset, amount);
    }

    function repay(address asset, uint256 amount)
        external
        payable
        notPaused
        listed(asset)
        nonReentrant
    {
        _capitalize(msg.sender, asset);
        Debt storage d = debts[msg.sender][asset];
        if (d.principal == 0) revert NoDebt();

        uint256 paid = _pullFunds(asset, amount);
        if (paid == 0) revert ZeroAmount();

        uint256 applied = paid > d.principal ? d.principal : paid;
        d.principal -= applied;
        markets[asset].totalBorrowed -= applied;

        // Overpayment goes straight back rather than sitting in the contract.
        uint256 refund = paid - applied;
        if (refund > 0) _sendFunds(asset, msg.sender, refund);

        emit Repaid(msg.sender, asset, applied, 0);
    }

    // --- Views ---------------------------------------------------------------

    function assetCount() external view returns (uint256) {
        return assets.length;
    }

    function allAssets() external view returns (address[] memory) {
        return assets;
    }

    /// @notice Debt including interest accrued since the last interaction.
    function borrowBalance(address user, address asset)
        public
        view
        returns (uint256)
    {
        Debt memory d = debts[user][asset];
        if (d.principal == 0) return 0;
        uint256 elapsed = block.timestamp - d.lastAccrual;
        uint256 interest = (d.principal *
            markets[asset].borrowRateBps *
            elapsed) / (BPS * YEAR);
        return d.principal + interest;
    }

    /**
     * @notice Portfolio snapshot, all USD figures in 8 dp.
     * @return collateralUsd  value of supplied assets flagged as collateral
     * @return debtUsd        value of all outstanding debt
     * @return borrowableUsd  remaining borrowing power after existing debt
     * @return health         health factor in 1e18, NO_DEBT when debt is zero
     */
    function accountData(address user)
        external
        view
        returns (
            uint256 collateralUsd,
            uint256 debtUsd,
            uint256 borrowableUsd,
            uint256 health
        )
    {
        uint256 powerUsd;
        (collateralUsd, powerUsd, debtUsd) = _positions(user);
        borrowableUsd = powerUsd > debtUsd ? powerUsd - debtUsd : 0;
        health = _healthFactor(user);
    }

    function healthFactor(address user) external view returns (uint256) {
        return _healthFactor(user);
    }

    /// @notice Liquidity available to borrow or withdraw for an asset.
    function available(address asset) external view returns (uint256) {
        return _available(asset);
    }

    // --- Internals -----------------------------------------------------------

    function _available(address asset) internal view returns (uint256) {
        return
            asset == NATIVE
                ? address(this).balance
                : IERC20(asset).balanceOf(address(this));
    }

    /// @dev Folds accrued interest into principal and resets the clock.
    function _capitalize(address user, address asset) internal {
        Debt storage d = debts[user][asset];
        if (d.principal > 0) {
            uint256 owed = borrowBalance(user, asset);
            markets[asset].totalBorrowed += owed - d.principal;
            d.principal = owed;
        }
        d.lastAccrual = block.timestamp;
    }

    /**
     * @dev Receives funds for supply/repay. For HBAR the amount is msg.value
     * (the `amount` argument is ignored, since value is authoritative); for
     * tokens it is pulled via transferFrom and msg.value must be zero.
     */
    function _pullFunds(address asset, uint256 amount)
        internal
        returns (uint256)
    {
        if (asset == NATIVE) return msg.value;
        if (msg.value != 0) revert NativeValueMismatch();
        if (!IERC20(asset).transferFrom(msg.sender, address(this), amount)) {
            revert TransferFailed();
        }
        return amount;
    }

    function _sendFunds(address asset, address to, uint256 amount) internal {
        if (asset == NATIVE) {
            (bool ok, ) = to.call{value: amount}("");
            if (!ok) revert TransferFailed();
        } else if (!IERC20(asset).transfer(to, amount)) {
            revert TransferFailed();
        }
    }

    /**
     * @dev Walks every listed market once and returns the three USD figures
     * the risk model needs. Collateral value uses the liquidation threshold;
     * borrowing power uses the (lower) LTV.
     */
    function _positions(address user)
        internal
        view
        returns (uint256 collateralUsd, uint256 powerUsd, uint256 debtUsd)
    {
        uint256 n = assets.length;
        for (uint256 i = 0; i < n; i++) {
            address asset = assets[i];
            Market memory m = markets[asset];

            uint256 sup = supplied[user][asset];
            if (sup > 0 && collateralOn[user][asset]) {
                uint256 v = _usd(sup, m);
                collateralUsd += (v * m.liqThresholdBps) / BPS;
                powerUsd += (v * m.ltvBps) / BPS;
            }

            uint256 owed = borrowBalance(user, asset);
            if (owed > 0) debtUsd += _usd(owed, m);
        }
    }

    function _usd(uint256 amount, Market memory m)
        internal
        pure
        returns (uint256)
    {
        return (amount * m.price) / (10 ** m.decimals);
    }

    function _healthFactor(address user) internal view returns (uint256) {
        (uint256 collateralUsd, , uint256 debtUsd) = _positions(user);
        if (debtUsd == 0) return NO_DEBT;
        return (collateralUsd * WAD) / debtUsd;
    }

    receive() external payable {}
}
