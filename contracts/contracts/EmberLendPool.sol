// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title EmberLendPool
 * @notice Minimal collateralized micro-lending pool for Emberlend on Hedera EVM.
 *
 * Design notes (idiomatic Hedera path):
 *  - HBAR is used as both collateral and the borrowable asset in this v1 so the
 *    pool is self-contained and testable on a local Hedera node without extra
 *    token associations. Swapping the borrow asset for an HTS token is a v2 step
 *    (mint/associate handled by the Hedera SDK scripts in ../../hedera).
 *  - Every borrow/repay emits an event. An off-chain worker mirrors these into a
 *    Hedera Consensus Service (HCS) topic to form an immutable credit history.
 *  - Interest is a simple linear rate for the demo; a dynamic curve based on
 *    utilization is a follow-up.
 */
contract EmberLendPool {
    // 150% collateralization => you can borrow up to 66.6% of collateral value.
    uint256 public constant COLLATERAL_RATIO_BPS = 15000; // 150.00%
    uint256 public constant BPS = 10000;

    // Flat annual interest rate for the demo (5.00%).
    uint256 public constant ANNUAL_RATE_BPS = 500;
    uint256 public constant YEAR = 365 days;

    struct Loan {
        uint256 collateral; // HBAR (tinybar) locked
        uint256 principal; // HBAR (tinybar) borrowed
        uint256 startedAt; // timestamp of borrow
        bool active;
    }

    mapping(address => Loan) public loans;
    uint256 public totalSupplied; // liquidity from lenders
    uint256 public totalBorrowed;

    address public owner;
    bool public paused;

    event Supplied(address indexed lender, uint256 amount);
    event Withdrawn(address indexed lender, uint256 amount);
    event Borrowed(
        address indexed borrower,
        uint256 collateral,
        uint256 principal
    );
    event Repaid(
        address indexed borrower,
        uint256 principal,
        uint256 interest,
        uint256 collateralReturned
    );
    event Paused(bool state);

    error NotOwner();
    error IsPaused();
    error Reentrant();
    error ActiveLoanExists();
    error NoActiveLoan();
    error ExceedsMaxBorrow();
    error InsufficientLiquidity();
    error IncorrectRepayment();

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

    constructor() {
        owner = msg.sender;
    }

    // --- Lender side ---------------------------------------------------------

    function supply() external payable notPaused {
        require(msg.value > 0, "zero");
        totalSupplied += msg.value;
        emit Supplied(msg.sender, msg.value);
    }

    /// @dev Simplified: owner-managed treasury withdrawal for the demo.
    function withdraw(uint256 amount) external onlyOwner nonReentrant {
        require(amount <= address(this).balance, "exceeds balance");
        totalSupplied = amount > totalSupplied ? 0 : totalSupplied - amount;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");
        emit Withdrawn(msg.sender, amount);
    }

    // --- Borrower side -------------------------------------------------------

    /// @notice Lock `msg.value` as collateral and borrow `principal` HBAR.
    function borrow(uint256 principal) external payable notPaused nonReentrant {
        if (loans[msg.sender].active) revert ActiveLoanExists();

        uint256 maxBorrow = (msg.value * BPS) / COLLATERAL_RATIO_BPS;
        if (principal > maxBorrow) revert ExceedsMaxBorrow();
        if (principal > availableLiquidity()) revert InsufficientLiquidity();

        loans[msg.sender] = Loan({
            collateral: msg.value,
            principal: principal,
            startedAt: block.timestamp,
            active: true
        });
        totalBorrowed += principal;

        (bool ok, ) = msg.sender.call{value: principal}("");
        require(ok, "borrow transfer failed");

        emit Borrowed(msg.sender, msg.value, principal);
    }

    /// @notice Repay principal + accrued interest to reclaim collateral.
    function repay() external payable notPaused nonReentrant {
        Loan memory loan = loans[msg.sender];
        if (!loan.active) revert NoActiveLoan();

        uint256 interest = accruedInterest(msg.sender);
        uint256 due = loan.principal + interest;
        if (msg.value < due) revert IncorrectRepayment();

        delete loans[msg.sender];
        totalBorrowed -= loan.principal;

        uint256 refund = msg.value - due; // overpayment
        uint256 payout = loan.collateral + refund;

        (bool ok, ) = msg.sender.call{value: payout}("");
        require(ok, "collateral return failed");

        emit Repaid(msg.sender, loan.principal, interest, loan.collateral);
    }

    // --- Views ---------------------------------------------------------------

    function accruedInterest(address borrower) public view returns (uint256) {
        Loan memory loan = loans[borrower];
        if (!loan.active) return 0;
        uint256 elapsed = block.timestamp - loan.startedAt;
        return (loan.principal * ANNUAL_RATE_BPS * elapsed) / (BPS * YEAR);
    }

    function amountDue(address borrower) external view returns (uint256) {
        return loans[borrower].principal + accruedInterest(borrower);
    }

    function availableLiquidity() public view returns (uint256) {
        return address(this).balance;
    }

    // --- Admin ---------------------------------------------------------------

    function setPaused(bool state) external onlyOwner {
        paused = state;
        emit Paused(state);
    }
}
