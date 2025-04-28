// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "./interfaces/IModule.sol";
contract EVMTreasuryV2 is Initializable, PausableUpgradeable {
    using SafeERC20 for IERC20;

    event GovernmentChanged(address indexed newGovernment);
    event AgentChanged(address indexed newAgent);
    event TreasuryTransferred();

    address public agent;
    address public governance;

    address public usdc;
    mapping(address => bool) public _modules;

    //logs
    uint256 public feeUsedForBridge;

    modifier onlyGovernance() {
        require(
            _msgSender() == governance,
            "Only governance can call this function"
        );
        _;
    }

    modifier onlyAgent() {
        require(_msgSender() == agent, "Only agent can call this function");
        _;
    }

    function init(
        address _usdc,
        address _agent,
        address _governance
    ) public initializer {
        __Pausable_init();
        usdc = _usdc;
        agent = _agent;
        governance = _governance;
    }

    // AGENT FUNCTIONS

    function changeModule(
        address moduleOut,
        bytes memory dataOut,
        address moduleIn,
        bytes memory dataIn,
        uint256 amount
    ) public onlyAgent whenNotPaused {
        require(_modules[moduleOut], "Module not registered");
        require(_modules[moduleIn], "Module not registered");
        IModule(moduleOut).withdraw(dataOut);
        IERC20(usdc).safeTransfer(moduleIn, amount);
        IModule(moduleIn).deposit(dataIn);
    }

    // GORVERNMENT FUNCTIONS

    function enableModule(address module) public onlyGovernance {
        _modules[module] = true;
    }

    function disableModule(address module) public onlyGovernance {
        _modules[module] = false;
    }

    function gorvermentExec(
        address[] calldata target,
        uint256[] calldata value,
        bytes[] calldata data
    ) public onlyGovernance {
        for (uint256 i = 0; i < target.length; i++)
            _call(target[i], value[i], data[i]);
    }

    function changeGovernment(address newGovernment) public onlyGovernance {
        require(
            newGovernment != address(0),
            "New government cannot be zero address"
        );
        governance = newGovernment;
        emit GovernmentChanged(newGovernment);
    }

    // INTERNAL FUNCTIONS

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

    function pause() public onlyGovernance {
        _pause();
    }

    function unpause() public onlyGovernance {
        _unpause();
    }
}