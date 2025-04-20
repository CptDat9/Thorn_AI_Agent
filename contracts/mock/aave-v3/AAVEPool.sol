// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
import "./interfaces/IPoolAAVEV3.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AAVEPool is IPoolAAVEV3 {
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external override {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        require(referralCode == 0, "Invalid referral code");
        require(onBehalfOf == msg.sender, "Invalid onBehalfOf");
    }

    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external override returns (uint256) {
        IERC20(asset).transfer(to, amount);
        return amount;
    }
}
