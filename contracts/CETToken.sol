// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Chainfly Energy Token (CET)
/// @notice Payment + Cashback Token for Chainfly Ecosystem
/// @dev Deployed on Polygon Mumbai Testnet
contract CETToken is ERC20, ERC20Burnable, Ownable {
    uint256 public constant INITIAL_SUPPLY = 1_000_000 * 10 ** 18;

    event Minted(address indexed to, uint256 amount);
    event Burned(address indexed from, uint256 amount);
    event Cashback(address indexed user, uint256 amount);

    constructor(address owner_) ERC20("Chainfly Energy Token", "CET") Ownable(owner_) {
        _mint(owner_, INITIAL_SUPPLY);
    }

    /// @notice Mint new tokens (only owner)
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
        emit Minted(to, amount);
    }

    /// @notice Burn tokens (any user)
    function burn(uint256 amount) public override {
        super.burn(amount);
        emit Burned(msg.sender, amount);
    }

    /// @notice Burn tokens from an account (only owner)
    function burnFrom(address account, uint256 amount) public override onlyOwner {
        _burn(account, amount);
        emit Burned(account, amount);
    }

    /// @notice Give cashback to a user
    function giveCashback(address user, uint256 amount) external onlyOwner {
        _mint(user, amount);
        emit Cashback(user, amount);
    }
}
