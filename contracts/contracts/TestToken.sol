// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TestToken
 * @notice Minimal ERC-20 with an open faucet, for Emberlend on Hedera testnet.
 *
 * Why ERC-20 rather than native HTS for the demo assets: an HTS token must be
 * associated with an account before it can be received, which means an extra
 * SDK call and a confirmation before a user can even hold a test balance. A
 * plain EVM token works the moment a wallet connects, so the market UI can be
 * exercised end to end. The HTS path stays where it belongs — the eUSD token
 * and the HCS credit log in ../../hedera.
 *
 * Not for mainnet: anyone can mint from the faucet.
 */
contract TestToken {
    string public name;
    string public symbol;
    uint8 public immutable decimals;
    uint256 public totalSupply;

    /// How much one faucet call hands out, in whole tokens.
    uint256 public immutable faucetAmount;
    /// Cooldown so a single account cannot drain the UI with repeat clicks.
    uint256 public constant FAUCET_COOLDOWN = 1 hours;
    mapping(address => uint256) public lastFaucet;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );

    error FaucetCooldown(uint256 retryAt);
    error InsufficientBalance();
    error InsufficientAllowance();

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _faucetWholeTokens
    ) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        faucetAmount = _faucetWholeTokens * (10 ** _decimals);
    }

    function faucet() external {
        uint256 next = lastFaucet[msg.sender] + FAUCET_COOLDOWN;
        if (lastFaucet[msg.sender] != 0 && block.timestamp < next) {
            revert FaucetCooldown(next);
        }
        lastFaucet[msg.sender] = block.timestamp;
        _mint(msg.sender, faucetAmount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount)
        external
        returns (bool)
    {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            if (allowed < amount) revert InsufficientAllowance();
            allowance[from][msg.sender] = allowed - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        if (balanceOf[from] < amount) revert InsufficientBalance();
        unchecked {
            balanceOf[from] -= amount;
            balanceOf[to] += amount;
        }
        emit Transfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal {
        totalSupply += amount;
        unchecked {
            balanceOf[to] += amount;
        }
        emit Transfer(address(0), to, amount);
    }
}
