// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IAssetForwarder.sol";
import "./interfaces/IMessageHandler.sol";

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

// https://github.com/router-protocol/router-contracts/blob/main/asset-forwarder/evm/contracts/AssetForwarder.sol
contract AssetForwarder is AccessControlUpgradeable, IAssetForwarder {
    using SafeERC20 for IERC20;
    bytes32 public routerMiddlewareBase;
    address public gatewayContract;
    uint256 public depositNonce;
    uint256 public constant MAX_TRANSFER_SIZE = 1e36;
    bytes32 public constant RESOURCE_SETTER = keccak256("RESOURCE_SETTER");
    bytes32 public constant PAUSER = keccak256("PAUSER");
    mapping(bytes32 => bool) public executeRecord;
    uint256 public MIN_GAS_THRESHHOLD;
    uint256 public pauseStakeAmountMin;
    uint256 public pauseStakeAmountMax;
    uint256 public totalStakedAmount;
    bool public isCommunityPauseEnabled = true;
    bool public depositPause = false;
    bool public relayPause = false;

    address private constant NATIVE_ADDRESS =
        0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    event CommunityPaused(address indexed pauser, uint256 stakedAmount);
    event Paused(address account, uint256 pauseType);
    event Unpaused(address account, uint256 pauseType);
    error MessageAlreadyExecuted();
    error InvalidGateway();
    error InvalidRequestSender();
    error InvalidRefundData();
    error InvalidAmount();
    error AmountTooLarge();
    error MessageExcecutionFailedWithLowGas();
    error InvalidFee();

    function initialize() public initializer {
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function isNative(address token) internal pure returns (bool) {
        return token == NATIVE_ADDRESS;
    }

    function iDeposit(
        DepositData memory depositData,
        bytes memory destToken,
        bytes memory recipient
    ) external payable {
        if (depositData.amount > MAX_TRANSFER_SIZE) revert AmountTooLarge();

        if (isNative(depositData.srcToken)) {
            if (depositData.amount != msg.value) revert InvalidAmount();
        } else {
            IERC20(depositData.srcToken).safeTransferFrom(
                msg.sender,
                address(this),
                depositData.amount
            );
        }

        emit FundsDeposited(
            depositData.partnerId,
            depositData.amount,
            depositData.destChainIdBytes,
            depositData.destAmount,
            ++depositNonce,
            depositData.srcToken,
            depositData.refundRecipient,
            recipient,
            destToken
        );
    }

    function iDepositMessage(
        DepositData memory depositData,
        bytes memory destToken,
        bytes memory recipient,
        bytes memory message
    ) external payable {
        if (depositData.amount > MAX_TRANSFER_SIZE) revert AmountTooLarge();

        if (isNative(depositData.srcToken)) {
            if (depositData.amount != msg.value) revert InvalidAmount();
        } else {
            IERC20(depositData.srcToken).safeTransferFrom(
                msg.sender,
                address(this),
                depositData.amount
            );
        }

        emit FundsDepositedWithMessage(
            depositData.partnerId,
            depositData.amount,
            depositData.destChainIdBytes,
            depositData.destAmount,
            ++depositNonce,
            depositData.srcToken,
            recipient,
            depositData.refundRecipient,
            destToken,
            message
        );
    }

    function iRelayMessage(RelayDataMessage memory relayData) external payable {
        if (relayData.amount > MAX_TRANSFER_SIZE) revert AmountTooLarge();
        // Check is message is already executed
        bytes32 messageHash = keccak256(
            abi.encode(
                relayData.amount,
                relayData.srcChainId,
                relayData.depositId,
                relayData.destToken,
                relayData.recipient,
                address(this),
                relayData.message
            )
        );
        if (executeRecord[messageHash]) revert MessageAlreadyExecuted();
        executeRecord[messageHash] = true;
        if (isNative(relayData.destToken)) {
            if (relayData.amount != msg.value) revert InvalidAmount();
            (bool success, ) = payable(relayData.recipient).call{
                value: relayData.amount
            }("");
            require(success == true);
        } else {
            IERC20(relayData.destToken).safeTransferFrom(
                msg.sender,
                relayData.recipient,
                relayData.amount
            );
        }

        bytes memory execData;
        bool execFlag;
        if (isContract(relayData.recipient) && relayData.message.length > 0) {
            (execFlag, execData) = relayData.recipient.call{gas: gasleft()}(
                abi.encodeWithSelector(
                    IMessageHandler.handleMessage.selector,
                    relayData.destToken,
                    relayData.amount,
                    relayData.message
                )
            );
            if (!execFlag && gasleft() < MIN_GAS_THRESHHOLD)
                revert MessageExcecutionFailedWithLowGas();
        }

        emit FundsPaidWithMessage(
            messageHash,
            msg.sender,
            ++depositNonce,
            execFlag,
            execData
        );
    }

    function isContract(address addr) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(addr)
        }
        return size > 0;
    }

    function withdrawStakeAmount() external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            address(this).balance >= totalStakedAmount,
            "Insufficient funds"
        );
        uint256 withdrawalAmount = totalStakedAmount;
        totalStakedAmount = 0;
        (bool success, ) = payable(msg.sender).call{value: withdrawalAmount}(
            ""
        );
        require(success == true);
    }

    function iDepositInfoUpdate(
        address srcToken,
        uint256 feeAmount,
        uint256 depositId,
        bool initiatewithdrawal
    ) external payable {
        if (initiatewithdrawal) {
            require(msg.value == 0);
            emit DepositInfoUpdate(
                srcToken,
                0,
                depositId,
                ++depositNonce,
                true,
                msg.sender
            );
            return;
        }
        if (feeAmount > MAX_TRANSFER_SIZE) revert AmountTooLarge();
        if (isNative(srcToken)) {
            if (feeAmount != msg.value) revert InvalidAmount();
        } else {
            IERC20(srcToken).safeTransferFrom(
                msg.sender,
                address(this),
                feeAmount
            );
        }
        emit DepositInfoUpdate(
            srcToken,
            feeAmount,
            depositId,
            ++depositNonce,
            false,
            msg.sender
        );
    }
}
