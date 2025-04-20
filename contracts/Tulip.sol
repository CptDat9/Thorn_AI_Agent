// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract Tulip is AccessControlUpgradeable {
    using SafeERC20 for IERC20;

    // Events
    event Deposited(
        address indexed user,
        uint256 tokenAmount,
        uint256 lpAmount
    );
    event Withdrawn(
        address indexed user,
        uint256 lpAmount,
        uint256 tokenAmount,
        uint256 feeAmount
    );
    event RateUpdated(uint256 oldRate, uint256 newRate);
    event TreasuryTransferred(
        uint256 indexed chainId,
        uint256 amount,
        uint256 destAmount
    );
    event TreasurySet(
        uint256 indexed chainId,
        bytes treasury,
        bytes tokenAddress
    );
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event GovernmentChanged(
        address indexed oldGovernment,
        address indexed newGovernment
    );
    event TransferRequested(
        address indexed token,
        uint256 amount,
        uint256 destAmount,
        uint256 destChainId,
        bytes destTokenAddress,
        bytes destRecipient
    );
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER_ROLE");
    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");
    bytes32 public constant GOVERNMENT_ROLE = keccak256("GOVERNMENT_ROLE");

    address public token;
    uint256 public nonce;
    // rate calculated = fomula totalSupplyLP / totalAssetValue * 1e18 ; 
    uint256 public rate;
    uint256 public lastTimeUpdated;
    uint256 public totalSupply;
    uint256 public totalSupplyLockedDeprecated; // Deprecated

    mapping(address => uint256) public deposited;
    mapping(address => uint256) public balance;
    mapping(address => uint256) public balanceLocked;

    // EVM Treasury
    mapping(uint256 => bytes) public treasury;
    mapping(uint256 => bytes) public tokenAddress;

    // fees
    address public beneficiary;
    uint256 public fee;
    uint256 public constant FEE_BASE = 10000;

    function init(
        address _token,
        address _agent,
        address _government
    ) public initializer {
        __AccessControl_init();
        token = _token;
        _grantRole(AGENT_ROLE, _agent);
        _grantRole(GOVERNMENT_ROLE, _government);
        _setRoleAdmin(AGENT_ROLE, GOVERNMENT_ROLE);
        _setRoleAdmin(UPDATER_ROLE, GOVERNMENT_ROLE);
        beneficiary = _government;
        fee = 50;
        rate = 1e18;
    }

    // USER FUNCTIONS
    function deposit(uint256 amount) public {
        require(amount > 0, "Amount must be positive");
        IERC20(token).safeTransferFrom(_msgSender(), address(this), amount);

        // Tính số LP dựa trên rate
        uint256 amountLP = Math.mulDiv(amount, rate, 1e18);

        deposited[_msgSender()] += amount;
        balance[_msgSender()] += amountLP;
        totalSupply += amountLP;

        emit Deposited(_msgSender(), amount, amountLP);
    }

    function withdraw(uint256 amountLP) public {
        require(amountLP > 0, "Amount must be positive");
        require(balance[_msgSender()] >= amountLP, "Insufficient LP balance");
        require(totalSupply >= amountLP, "Insufficient total supply");

        // Tính số token gốc trả lại
        uint256 amountToken = Math.mulDiv(amountLP, 1e18, rate);
        balance[_msgSender()] -= amountLP;
        totalSupply -= amountLP;
        uint256 amountFee = Math.mulDiv(amountToken, fee, FEE_BASE);
        IERC20(token).safeTransfer(_msgSender(), amountToken - amountFee);
        IERC20(token).safeTransfer(beneficiary, amountFee);

        emit Withdrawn(
            _msgSender(),
            amountLP,
            amountToken - amountFee,
            amountFee
        );
    }

    // AGENT FUNCTIONS
    function transferToTreasury(
        uint256 amount,
        uint256 destAmount,
        uint256 chainId
    ) public onlyRole(AGENT_ROLE) {
        require(treasury[chainId].length > 0, "Chain not supported");
        require(tokenAddress[chainId].length > 0, "Chain not supported");
        _checkFeeBridge(amount, destAmount);
        // Event for API transfer
        emit TransferRequested(
            token,
            amount,
            destAmount,
            chainId,
            tokenAddress[chainId],
            treasury[chainId]
        );
        emit TreasuryTransferred(chainId, amount, destAmount);
    }

    // UPDATER FUNCTIONS

    function updateRate(uint256 newRate) public onlyRole(UPDATER_ROLE) {
        require(
            block.timestamp - lastTimeUpdated > 15 * 60,
            "Can only update once 15 minutes"
        );
        require(newRate <= rate, "New rate must be less than or equal to the old rate");
        require(newRate > 0, "Rate must be positive");
        require(
            newRate <= rate + (rate / 100) && newRate >= rate - (rate / 100),
            "New rate must be within 1% of the old rate"
        );
        uint256 oldRate = rate;
        rate = newRate;
        lastTimeUpdated = block.timestamp;
        emit RateUpdated(oldRate, newRate);
    }

    // GORVERNMENT FUNCTIONS

    function changeGovernment(
        address newGovernment
    ) public onlyRole(GOVERNMENT_ROLE) {
        require(
            newGovernment != address(0),
            "New government cannot be zero address"
        );
        address oldGovernment = _msgSender();
        _grantRole(GOVERNMENT_ROLE, newGovernment);
        _revokeRole(GOVERNMENT_ROLE, oldGovernment);
        emit GovernmentChanged(oldGovernment, newGovernment);
    }

    function setTreasury(
        uint256 chainId,
        bytes memory _treasury,
        bytes memory _tokenAddress
    ) public onlyRole(GOVERNMENT_ROLE) {
        treasury[chainId] = _treasury;
        tokenAddress[chainId] = _tokenAddress;

        emit TreasurySet(chainId, _treasury, _tokenAddress);
    }

    function setFee(uint256 newFee) public onlyRole(GOVERNMENT_ROLE) {
        require(newFee <= 1000, "Fee must be less than 10%");
        uint256 oldFee = fee;
        fee = newFee;

        emit FeeUpdated(oldFee, newFee);
    }

    // Internal functions
    function _checkFeeBridge(uint256 amount, uint256 destAmount) internal pure {
        uint256 feeBridge = amount - destAmount;
        require(feeBridge <= amount / 100, "Bridge fee too high");
    }
}
