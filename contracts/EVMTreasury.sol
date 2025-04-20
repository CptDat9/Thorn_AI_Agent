// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract EVMTreasury is AccessControlUpgradeable {
    using SafeERC20 for IERC20;

    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");
    bytes32 public constant GOVERNMENT_ROLE = keccak256("GOVERNMENT_ROLE");

    address public token;
    mapping(address => bool) public _modules;

    // EVM Treasury
    bytes public tulipAddress;
    mapping(uint256 => bytes) public treasury;
    mapping(uint256 => bytes) public tokenAddress;
    
    // Event for API transfer.
    event TransferRequested(
        address indexed token,
        uint256 amount,
        uint256 destAmount,
        uint256 destChainId,
        bytes destTokenAddress,
        bytes destRecipient
    );
    function init(
        address _token,
        address _agent,
        address _government,
        bytes memory _tulipAddress
    ) public initializer {
        __AccessControl_init();
        token = _token;
        tulipAddress = _tulipAddress;
        _grantRole(AGENT_ROLE, _agent);
        _grantRole(GOVERNMENT_ROLE, _government);
        _setRoleAdmin(AGENT_ROLE, GOVERNMENT_ROLE);
    }

    // AGENT FUNCTIONS

    function approveAndCallModule(
        address module,
        uint256 amount,
        uint256 value,
        bytes memory data
    ) public onlyRole(AGENT_ROLE) {
        IERC20(token).safeTransfer(module, amount);
        require(_modules[module], "Module not registered");
        _call(module, value, data);
    }

    function callModule(
        address module,
        uint256 value,
        bytes memory data
    ) public onlyRole(AGENT_ROLE) {
        require(_modules[module], "Module not registered");
        _call(module, value, data);
    }

    function transferToTulip(
        uint256 amount,
        uint256 destAmount,
        uint256 destChainId
    ) public onlyRole(AGENT_ROLE) {
        require(tulipAddress.length > 0, "Tulip address is not setting");
        require(tokenAddress[destChainId].length > 0, "Token is not supported");
        emit TransferRequested(
            token,
            amount,
            destAmount,
            destChainId,
            tokenAddress[destChainId],
            tulipAddress
        );
    }

    function transferToTreasury(
        uint256 amount,
        uint256 destAmount,
        uint256 chainId
    ) public onlyRole(AGENT_ROLE) {
        require(treasury[chainId].length > 0, "Chain not supported");
        require(tokenAddress[chainId].length > 0, "Chain not supported");
        emit TransferRequested(
            token,
            amount,
            destAmount,
            chainId,
            tokenAddress[chainId],
            treasury[chainId]
        );
    }

    // GORVERNMENT FUNCTIONS

    function enableModule(address module) public onlyRole(GOVERNMENT_ROLE) {
        _modules[module] = true;
    }

    function disableModule(address module) public onlyRole(GOVERNMENT_ROLE) {
        _modules[module] = false;
    }

    function setTreasury(
        uint256 chainId,
        bytes memory _treasury,
        bytes memory _tokenAddress
    ) public onlyRole(GOVERNMENT_ROLE) {
        treasury[chainId] = _treasury;
        tokenAddress[chainId] = _tokenAddress;
    }

    function gorvermentExec(
        address[] calldata target,
        uint256[] calldata value,
        bytes[] calldata data
    ) public onlyRole(GOVERNMENT_ROLE) {
        for (uint256 i = 0; i < target.length; i++)
            _call(target[i], value[i], data[i]);
    }

    function changeGovernment(
        address newGovernment
    ) public onlyRole(GOVERNMENT_ROLE) {
        _revokeRole(GOVERNMENT_ROLE, _msgSender());
        _grantRole(GOVERNMENT_ROLE, newGovernment);
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
}
