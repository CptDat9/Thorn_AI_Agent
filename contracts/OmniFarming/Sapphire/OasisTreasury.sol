// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

import "@openzeppelin/contracts/utils/Context.sol";

contract OasisTreasury is Initializable, Context {
    using SafeERC20 for IERC20;
    // Events
    event Deposited(
        address indexed user,
        uint256 tokenAmount,
        uint256 lpAmount
    );

    event RequestedWithdraw(address indexed user, uint256 amount);
    event Withdrawn(
        address indexed user,
        uint256 lpAmount,
        uint256 tokenAmount,
        uint256 feeAmount
    );

    event RateUpdated(uint256 oldRate, uint256 newRate);
    event TreasuryTransferred();
    event TreasurySet(
        uint256 indexed chainId,
        bytes treasury,
        bytes tokenAddress
    );
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event GovernmentChanged(address indexed newGovernment);
    event AgentChanged(address indexed newAgent);

    address public governance;
    address public agent;

    address public usdc;

    // rate calculated = fomula totalSupplyLP / totalAssetValue * 1e18 ;
    uint256 public rate;
    uint256 public lastTimeUpdated;
    uint256 public totalSupply;
    uint256 public totalSupplyLocked;

    mapping(address => uint256) public deposited;
    mapping(address => uint256) public balance;
    mapping(address => uint256) public balanceLocked;

    // fees
    address public beneficiary;
    uint256 public fee;
    uint256 public constant FEE_BASE = 10000;

    // logs
    uint256 public feeUsedForBridge;

    //incentive
    address public incentiveToken;
    uint256 public rewardPerSeconds;
    uint256 public rewardIndex;

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
        governance = _governance;
        agent = _agent;
        usdc = _usdc;
        beneficiary = _governance;
        fee = 50;
        rate = 1e18;
    }

    // USER FUNCTIONS
    function deposit(uint256 amount) public {
        require(amount > 0, "Amount must be positive");
        IERC20(usdc).safeTransferFrom(_msgSender(), address(this), amount);

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

        //Calculate amount of usdc to return
        uint256 amountUSDCReturn = Math.mulDiv(amountLP, 1e18, rate);
        balance[_msgSender()] -= amountLP;
        totalSupply -= amountLP;
        uint256 amountFee = Math.mulDiv(amountUSDCReturn, fee, FEE_BASE);
        IERC20(usdc).safeTransfer(_msgSender(), amountUSDCReturn - amountFee);
        IERC20(usdc).safeTransfer(beneficiary, amountFee);

        emit Withdrawn(
            _msgSender(),
            amountLP,
            amountUSDCReturn - amountFee,
            amountFee
        );
    }

    function requestWithdraw(uint256 amount) public {
        require(amount > 0, "Amount must be positive");
        require(balance[_msgSender()] >= amount, "Insufficient LP balance");
        balance[_msgSender()] -= amount;
        balanceLocked[_msgSender()] += amount;
        totalSupplyLocked += amount;
        emit RequestedWithdraw(_msgSender(), amount);
    }

    function withdrawForRequested(address user) public {
        require(balanceLocked[user] > 0, "No requested withdraw");

        uint256 amountLP = balanceLocked[user];
        balanceLocked[user] -= amountLP;
        totalSupplyLocked -= amountLP;
        balance[user] += amountLP;
        //Calculate amount of usdc to return
        uint256 amountUSDCReturn = Math.mulDiv(amountLP, 1e18, rate);
        balance[user] -= amountLP;
        totalSupply -= amountLP;
        uint256 amountFee = Math.mulDiv(amountUSDCReturn, fee, FEE_BASE);
        IERC20(usdc).safeTransfer(user, amountUSDCReturn - amountFee);
        IERC20(usdc).safeTransfer(beneficiary, amountFee);
        emit Withdrawn(user, amountLP, amountUSDCReturn - amountFee, amountFee);
    }

    // AGENT FUNCTIONS
    function transferToTreasury(
        uint256 amount,
        address allowanceTo,
        uint256 feeBridge,
        address txnTo,
        bytes calldata txnData
    ) public onlyAgent {
        feeUsedForBridge += feeBridge;
        IERC20(usdc).approve(allowanceTo, amount);
        _call(txnTo, 0, txnData);
        emit TreasuryTransferred();
    }

    // UPDATER FUNCTIONS
    function updateRate(uint256 newRate) public onlyAgent {
        require(
            block.timestamp - lastTimeUpdated > 15 * 60,
            "Can only update once 15 minutes"
        );
        require(
            newRate <= rate,
            "New rate must be less than or equal to the old rate"
        );
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

    function changeGovernment(address newGovernment) public onlyGovernance {
        require(
            newGovernment != address(0),
            "New government cannot be zero address"
        );
        governance = newGovernment;
        emit GovernmentChanged(newGovernment);
    }

    function changeAgent(address newAgent) public onlyGovernance {
        require(newAgent != address(0), "New agent cannot be zero address");
        agent = newAgent;
        emit AgentChanged(newAgent);
    }

    function setFee(uint256 newFee) public onlyGovernance {
        require(newFee <= 1000, "Fee must be less than 10%");
        uint256 oldFee = fee;
        fee = newFee;
        emit FeeUpdated(oldFee, newFee);
    }

    // Internal functions

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