# Công thức Tính toán trong Contract OasisIncentive

##  OasisIncentive

1. **Tính LP nhận được từ Treasury**

   - Công thức: `receivedLP = lpAfter - lpBefore`
   - Chú thích:
     - `receivedLP`: Số token LP nhận được sau khi nạp (`createStake`, `upgradeStake`).
     - `lpAfter`: Số dư LP của contract trong treasury sau khi nạp (`ITreasury.balance(address(this))`).
     - `lpBefore`: Số dư LP của contract trong treasury trước khi nạp.

2. **Cập nhật Reward Index**

   - Công thức:
     - `accumulatedReward = rewardPerSecond * timeDelta`
     - `rewardIndex = rewardIndex + (accumulatedReward * SCALE / totalLP)`
   - Chú thích:
     - `accumulatedReward`: Tổng phần thưởng tích lũy trong khoảng thời gian `timeDelta`.
     - `rewardPerSecond`: Số token `thorn` phân phối mỗi giây.
     - `timeDelta`: Khoảng thời gian từ lần cập nhật cuối (`block.timestamp - lastTimeUpdate`).
     - `rewardIndex`: Giá trị tích lũy theo dõi phần thưởng trên mỗi LP.
     - `SCALE`: Hằng số `1000000000000000000` (1e18) để đảm bảo độ chính xác.
     - `totalLP`: Tổng số token LP được stake trong contract.

3. **Tính phần thưởng Delta mỗi Stake**

   - Công thức: `rewardDelta = data.lp * (rewardIndex - data.lastRewardIndex) / SCALE`
   - Chú thích:
     - `rewardDelta`: Phần thưởng mới tích lũy cho một stake.
     - `data.lp`: Số token LP của stake cụ thể.
     - `rewardIndex`: Giá trị `rewardIndex` hiện tại.
     - `data.lastRewardIndex`: Giá trị `rewardIndex` tại lần cập nhật cuối của stake.
     - `SCALE`: Hằng số `1000000000000000000`.

4. **Phân bổ phần thưởng (Locked/Unlocked)**

   - Công thức:
     - Nếu `block.timestamp >= data.lastTimeUpdate + lockPeriod`:
       - `data.unlockReward = data.unlockReward + data.lockedReward + rewardDelta`
       - `data.lockedReward = 0`
     - Ngược lại:
       - `data.lockedReward = data.lockedReward + rewardDelta`
   - Chú thích:
     - `data.unlockReward`: Phần thưởng có thể rút.
     - `data.lockedReward`: Phần thưởng bị khóa.
     - `rewardDelta`: Phần thưởng mới tích lũy.
     - `block.timestamp`: Thời gian hiện tại của block.
     - `data.lastTimeUpdate`: Thời gian cập nhật cuối của stake.
     - `lockPeriod`: Thời gian khóa phần thưởng (giây).

## Công thức sử dụng từ OasisTreasury (Hàm `deposit` và `withdraw`)

1. **Tính LP khi nạp (Deposit)**

   - Công thức: `amountLP = amount * rate / 1000000000000000000`
   - Chú thích:
     - `amountLP`: Số token LP nhận được sau khi nạp.
     - `amount`: Số token `usdc` người dùng nạp.
     - `rate`: Tỷ lệ chuyển đổi giữa `usdc` và LP (mặc định `1e18`, có thể thay đổi).

2. **Tính USDC trả lại khi rút (Withdraw)**

   - Công thức:
     - `amountUSDCReturn = amountLP * 1000000000000000000 / rate`
     - `amountFee = amountUSDCReturn * fee / 10000`
     - `amountReceived = amountUSDCReturn - amountFee`
   - Chú thích:
     - `amountUSDCReturn`: Số token `usdc` tương ứng với LP rút.
     - `amountLP`: Số token LP người dùng rút.
     - `rate`: Tỷ lệ chuyển đổi giữa `usdc` và LP.
     - `amountFee`: Phí rút (mặc định 0.5%).
     - `fee`: Tỷ lệ phí (mặc định `50`, tương ứng 0.5% với `FEE_BASE = 10000`).
     - `amountReceived`: Số `usdc` thực tế người dùng nhận sau phí.