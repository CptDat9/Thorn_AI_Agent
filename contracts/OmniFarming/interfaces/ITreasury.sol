// SPDX-License-Identifier: MIT
 pragma solidity ^0.8.24;
 interface ITreasury {
        function deposit(uint256 amount) external;
        function withdraw(uint256 amountLP) external;
        function balance(address user) external view returns (uint256);
        function rate() external view returns (uint256);
        function usdc() external view returns (address);
    }