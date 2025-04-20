// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;
import "../../../interfaces/IModule.sol";
import "./interfaces/IPoolAAVEV3.sol";

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract AAVELendingStakingUSDCModule is IModule, Initializable {
    using SafeERC20 for IERC20;

    address public treasury;
    address public government;
    address public usdc;
    address public pool;

    // Add events
    event Deposited(uint256 amount);
    event Withdrawn(uint256 amount);
    event GovernmentChanged(address oldGovernment, address newGovernment);
    event PoolChanged(address oldPool, address newPool);

    modifier onlyTreasury() {
        require(msg.sender == treasury, "Only agent");
        _;
    }

    modifier onlyGovernment() {
        require(msg.sender == government, "Only governance");
        _;
    }

    function init(
        address _treasury,
        address _government,
        address _usdc,
        address _pool
    ) public initializer {
        treasury = _treasury;
        government = _government;
        usdc = _usdc;
        pool = _pool;
    }

    // treasury functions

    function deposit(bytes memory /*data*/) public override onlyTreasury {
    uint256 usdcBalance = IERC20(usdc).balanceOf(address(this));
    require(usdcBalance > 0, "No USDC to deposit");
    IERC20(usdc).approve(pool, usdcBalance);
    _supply(usdcBalance);
    emit Deposited(usdcBalance);
}

    function withdraw(bytes memory /*data*/) public override onlyTreasury {
        (uint256 totalCollateralBase,,,,,) = IPoolAAVEV3(pool).getUserAccountData(address(this));
        uint256 amount = totalCollateralBase;
        require(amount > 0, "No balance to withdraw");
        _withdraw(amount);
        uint256 usdcInContract = IERC20(usdc).balanceOf(address(this));
        IERC20(usdc).safeTransfer(treasury, usdcInContract);
        emit Withdrawn(usdcInContract);
    }

    // governance functions

    function changeGovernment(address _government) public onlyGovernment {
        address oldGovernment = government;
        government = _government;
        emit GovernmentChanged(oldGovernment, _government);
    }

    function changePool(address _pool) public onlyGovernment {
        address oldPool = pool;
        pool = _pool;
        emit PoolChanged(oldPool, _pool);
    }

    function governmentExec(
        address[] calldata target,
        uint256[] calldata value,
        bytes[] calldata data
    ) public onlyGovernment {
        require(target.length == value.length && value.length == data.length, "Array lengths must match");
        for (uint256 i = 0; i < target.length; i++) {
            _call(target[i], value[i], data[i]);
        }
    }

    // view functions

    function getTotalValue() public view override returns (uint256) {
        uint256 usdcInContract = IERC20(usdc).balanceOf(address(this));
        (uint256 totalCollateralBase,,,,,) = IPoolAAVEV3(pool).getUserAccountData(address(this));
        return usdcInContract + totalCollateralBase;
    }

    // internal functions

    function _supply(uint256 amount) internal {
        IPoolAAVEV3(pool).supply(usdc, amount, address(this), 0);
    }

    function _withdraw(uint256 amount) internal {
        IPoolAAVEV3(pool).withdraw(usdc, amount, address(this));
    }

    function _call(address target, uint256 value, bytes memory data) internal {
        (bool success, bytes memory returndata) = target.call{value: value}(data);
        if (!success) {
            if (returndata.length > 0) {
                assembly {
                    let returndata_size := mload(returndata)
                    revert(add(32, returndata), returndata_size)
                }
            } else {
                revert("Call failed");
            }
        }
    }
}