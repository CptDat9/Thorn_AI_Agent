// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "../interfaces/ITreasury.sol";

contract OasisIncentive is Initializable, Context {
    using SafeERC20 for IERC20;
    uint256 public constant SCALE = 1e18;
    /* VARIABLES */
    address public governance;
    address public thorn; 
    address public treasury;
    address public usdc; 
    uint256 public rewardPerSecond;
    uint256 public lockPeriod;
    uint256 public numberOfUser;
    uint256 public totalLP;
    uint256 public rewardIndex;
    uint256 public lastTimeUpdate;
    bool public isIncentiveEnable;

    /* MAPPING */
    mapping(address => uint256) public numberOfStake;
    mapping(address => mapping(uint256 => StakeData)) public stakeInfo;
    mapping(address => bool) public isUser;

    /* STRUCT */
    struct StakeData {
        uint256 lp;
        uint256 lastRewardIndex;
        uint256 lastTimeUpdate;
        uint256 lockedReward;
        uint256 unlockReward;
    }

    // Modifiers
    modifier onlyGovernance() {
        require(_msgSender() == governance, "Only governance can call this function");
        _;
    }

    modifier isIncentiveEnabled() {
        require(isIncentiveEnable, "Staking is disabled");
        _;
    }

    // Events
    event RewardPerSecondUpdated(uint256 oldRewardPerSecond, uint256 newRewardPerSecond);
    event Staked(address indexed user, uint256 id, uint256 amount, uint256 lpAmount);
    event UpgradedStake(address indexed user, uint256 id, uint256 amount, uint256 lpAmount);
    event Unstaked(address indexed user, uint256 id, uint256 lpAmount);
    event RewardClaimed(address indexed user, uint256 amount);
    event RewardUnstaked(address indexed user, uint256 id, uint256 amount);
    event IncentiveEnabled(address indexed token, uint256 rewardPerSecond);
    event IncentiveDisabled();

    // Constructor
    function init(
        address _treasury,
        address _usdc,
        address _thorn,
        address _governance,
        uint256 _rewardPerSecond,
        uint256 _lockPeriod
    ) public initializer {
        treasury = _treasury;
        usdc = _usdc;
        thorn = _thorn;
        governance = _governance;
        rewardPerSecond = _rewardPerSecond;
        lockPeriod = _lockPeriod;
    }

    /* USER FUNCTIONS */

    function createStake(uint256 amount) external isIncentiveEnabled {
        require(amount > 0, "So luong phai lon hon 0");
        address user = _msgSender();
        _updateReward(user);
        IERC20(usdc).safeTransferFrom(user, address(this), amount);
        IERC20(usdc).safeIncreaseAllowance(treasury, amount);
        uint256 lpBefore = ITreasury(treasury).balance(address(this));
        ITreasury(treasury).deposit(amount);
        uint256 lpAfter = ITreasury(treasury).balance(address(this));
        uint256 receivedLP = lpAfter - lpBefore;
        require(receivedLP > 0, "Khong nhan duoc LP");
        if (!isUser[user]) {
            isUser[user] = true;
            numberOfUser++;
        }
        uint256 stakeId = numberOfStake[user];
        StakeData storage data = stakeInfo[user][stakeId];
        data.lp = receivedLP;
        data.lastRewardIndex = rewardIndex;
        data.lastTimeUpdate = block.timestamp;
        numberOfStake[user]++;
        totalLP += receivedLP;

        emit Staked(user, stakeId, amount, receivedLP);
    }
    function upgradeStake(uint256 id, uint256 amount) external isIncentiveEnabled {
        require(amount > 0, "So luong phai lon hon 0");
        require(id < numberOfStake[_msgSender()], "ID stake khong hop le");
        address user = _msgSender();
        _updateReward(user);
        IERC20(usdc).safeTransferFrom(user, address(this), amount);
        IERC20(usdc).safeIncreaseAllowance(treasury, amount);
        uint256 lpBefore = ITreasury(treasury).balance(address(this));
        ITreasury(treasury).deposit(amount);
        uint256 lpAfter = ITreasury(treasury).balance(address(this));
        uint256 receivedLP = lpAfter - lpBefore;
        require(receivedLP > 0, "Khong nhan duoc LP");
        StakeData storage data = stakeInfo[user][id];
        data.lp += receivedLP;
        data.lastRewardIndex = rewardIndex;
        data.lastTimeUpdate = block.timestamp;
        totalLP += receivedLP;
        emit UpgradedStake(user, id, amount, receivedLP);
    }

    function unstake(uint256 id) external isIncentiveEnabled {
        require(id < numberOfStake[_msgSender()], "ID stake khong hop le");
        address user = _msgSender();
        StakeData storage data = stakeInfo[user][id];
        require(data.lp > 0, "Khong co LP de rut");
        _updateReward(user);
        uint256 lpAmount = data.lp;
        totalLP -= lpAmount;
        ITreasury(treasury).withdraw(lpAmount);
        data.lp = 0;
        data.lastRewardIndex = rewardIndex;
        data.lastTimeUpdate = block.timestamp;
        emit Unstaked(user, id, lpAmount);
    }

    function unstakeReward(uint256 id) external isIncentiveEnabled {
        require(id < numberOfStake[_msgSender()], "ID stake not found");
        address user = _msgSender();
        _updateReward(user);
        StakeData storage data = stakeInfo[user][id];
        uint256 reward = data.unlockReward;
        require(reward > 0, "Khong co thuong de rut");
        data.unlockReward = 0;
        IERC20(thorn).safeTransfer(user, reward);
        emit RewardUnstaked(user, id, reward);
    }

    function claim() external isIncentiveEnabled {
        address user = _msgSender();
        _updateReward(user);

        uint256 totalReward = 0;
        for (uint256 i = 0; i < numberOfStake[user]; i++) {
            StakeData storage data = stakeInfo[user][i];
            totalReward += data.unlockReward;
            data.unlockReward = 0;
        }

        require(totalReward > 0, "Khong co thuong de rut");
        IERC20(thorn).safeTransfer(user, totalReward);

        emit RewardClaimed(user, totalReward);
    }

    /*ADMIN FUNCTIONS*/
    function updateRewardPerSecond(uint256 newRewardPerSecond) external onlyGovernance {
        _updateRewardForAll();
        uint256 oldRate = rewardPerSecond;
        rewardPerSecond = newRewardPerSecond;
        emit RewardPerSecondUpdated(oldRate, newRewardPerSecond);
    }
    function enableIncentive(address _thorn, uint256 _rewardPerSecond) external onlyGovernance {
        require(!isIncentiveEnable, "Chuong trinh thuong da bat");
        require(_thorn != address(0), "Token thuong khong hop le");
        require(_rewardPerSecond > 0, "RPS phai lon hon 0");
        thorn = _thorn;
        rewardPerSecond = _rewardPerSecond;
        isIncentiveEnable = true;
        lastTimeUpdate = block.timestamp;
        emit IncentiveEnabled(_thorn, _rewardPerSecond);
    }
    function disableIncentive() external onlyGovernance {
        require(isIncentiveEnable, "Chuong trinh thuong chua bat");
        _updateRewardForAll();
        isIncentiveEnable = false;
        rewardPerSecond = 0;
        emit IncentiveDisabled();
    }

    /*VIEW FUNCTIONS*/
    function getPendingReward(address user, uint256 id) external view returns (uint256 locked, uint256 unlock) {
        if (!isIncentiveEnable || totalLP == 0) {
            StakeData memory data = stakeInfo[user][id];
            return (data.lockedReward, data.unlockReward);
        }
        uint256 newRewardIndex = rewardIndex;
        if (totalLP > 0) {
            uint256 timeDelta = block.timestamp - lastTimeUpdate;
            uint256 accumulatedReward = rewardPerSecond * timeDelta;
            newRewardIndex += (accumulatedReward * SCALE) / totalLP;
        }
        StakeData memory data = stakeInfo[user][id];
        uint256 rewardDelta = (data.lp * (newRewardIndex - data.lastRewardIndex)) / SCALE;
        uint256 lockedReward = data.lockedReward;
        uint256 unlockReward = data.unlockReward;
        if (block.timestamp >= data.lastTimeUpdate + lockPeriod) {
            unlockReward += lockedReward + rewardDelta;
            lockedReward = 0;
        } else {
            lockedReward += rewardDelta;
        }

        return (lockedReward, unlockReward);
    }

    function getRewardPerSecond() external view returns (uint256) {
        return rewardPerSecond;
    }

    /* INTERNAL FUNCTIONS */
    function _updateReward(address user) internal {
        if (!isIncentiveEnable || totalLP == 0) return;
        uint256 timeDelta = block.timestamp - lastTimeUpdate;
        uint256 accumulatedReward = rewardPerSecond * timeDelta;
        rewardIndex += (accumulatedReward * SCALE) / totalLP;
        lastTimeUpdate = block.timestamp;
        for (uint256 i = 0; i < numberOfStake[user]; i++) {
            StakeData storage data = stakeInfo[user][i];
            if (data.lp == 0) continue;
            uint256 rewardDelta = (data.lp * (rewardIndex - data.lastRewardIndex)) / SCALE;
            if (block.timestamp >= data.lastTimeUpdate + lockPeriod) {
                data.unlockReward += data.lockedReward + rewardDelta;
                data.lockedReward = 0;
            } else {
                data.lockedReward += rewardDelta;
            }
            data.lastRewardIndex = rewardIndex;
            data.lastTimeUpdate = block.timestamp;
        }
    }
    function _updateRewardForAll() internal {
        if (!isIncentiveEnable || totalLP == 0) return;
        uint256 timeDelta = block.timestamp - lastTimeUpdate;
        uint256 accumulatedReward = rewardPerSecond * timeDelta;
        rewardIndex += (accumulatedReward * SCALE) / totalLP;
        lastTimeUpdate = block.timestamp;
    }
}