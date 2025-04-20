// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;
import "../../../interfaces/IModule.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

interface IComet {
    function supply(address asset, uint256 amount) external;

    function withdraw(address asset, uint256 amount) external;

    function balanceOf(address account) external view returns (uint256);

    function baseToken() external view returns (address);
}

contract CompoundV3StakingUSDCModule is IModule, Initializable {
    using SafeERC20 for IERC20;

    address public treasury;
    address public government;
    address public usdc;
    address public comet;

    // Add events
    event Deposited(uint256 amount);
    event Withdrawn(uint256 amount);
    event GovernmentChanged(address oldGovernment, address newGovernment);
    event CometChanged(address oldComet, address newComet);

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
        address _comet
    ) public initializer {
        treasury = _treasury;
        government = _government;
        usdc = _usdc;
        comet = _comet;
    }

    // treasury functions

    function deposit(bytes memory /*data*/) public override onlyTreasury {
        uint256 usdcBalance = IERC20(usdc).balanceOf(address(this));
        require(usdcBalance > 0, "No USDC to deposit");
        IERC20(usdc).approve(comet, usdcBalance);
        IComet(comet).supply(usdc, usdcBalance);
        emit Deposited(usdcBalance);
    }

    function withdraw(bytes memory /*data*/) public override onlyTreasury {
        uint256 compoundBalance = IComet(comet).balanceOf(address(this));
        require(compoundBalance > 0, "No balance to withdraw");
        IComet(comet).withdraw(usdc, compoundBalance);
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

    function gorvermentExec(
        address[] calldata target,
        uint256[] calldata value,
        bytes[] calldata data
    ) public onlyGovernment {
        for (uint256 i = 0; i < target.length; i++)
            _call(target[i], value[i], data[i]);
    }

    // view functions

    function getTotalValue() public view override returns (uint256) {
        uint256 usdcInContract = IERC20(usdc).balanceOf(address(this));
        uint256 usdcInCompound = IComet(comet).balanceOf(address(this));
        return usdcInContract + usdcInCompound;
    }

    // internal functions

    function _call(address target, uint256 value, bytes memory data) internal {
        assembly {
            let success := call(
                gas(),
                target,
                value,
                add(data, 0x20),
                mload(data),
                0,
                0
            )
            let ptr := mload(0x40)
            returndatacopy(ptr, 0, returndatasize())
            if iszero(success) {
                revert(ptr, returndatasize())
            }
        }
    }

    function changeComet(address _comet) public onlyGovernment {
        address oldComet = comet;
        comet = _comet;
        emit CometChanged(oldComet, _comet);
    }
}
