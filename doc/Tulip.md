# Tulip Contract Technical Documentation

## Roles và Quyền hạn

### 1. GOVERNMENT_ROLE

-   Role quản trị cao nhất trong hệ thống
-   Có quyền quản lý các role khác
-   Có thể thực hiện các chức năng:
    -   Thay đổi địa chỉ government
    -   Set địa chỉ treasury và token cho các chain
    -   Set phí rút token
    -   Quản lý AGENT_ROLE và UPDATER_ROLE
-   Được cấp phát trong hàm init
-   Có thể được thay đổi thông qua hàm changeGovernment

### 2. AGENT_ROLE

-   Role thực hiện các giao dịch chuyển tài sản qua lại giữa các treasury cross-chain
-   Có quyền:
    -   Chuyển token sang treasury ở chain khác
    -   Tương tác với AssetForwarder
-   Được quản lý bởi GOVERNMENT_ROLE
-   Được cấp phát trong hàm init

### 3. UPDATER_ROLE

-   Role cập nhật rate
-   Có quyền:
    -   Cập nhật rate (giới hạn 1% mỗi 15 phút) để đảm bảo an toàn
-   Được quản lý bởi GOVERNMENT_ROLE
-   Được cấp phát trong hàm init

### 4. Role Hierarchy

```
GOVERNMENT_ROLE
    ├── AGENT_ROLE
    └── UPDATER_ROLE
```

### 5. Role Management

-   GOVERNMENT_ROLE có thể:
    -   Grant/revoke AGENT_ROLE
    -   Grant/revoke UPDATER_ROLE
    -   Thay đổi chính mình
-   Các role khác không thể tự grant/revoke quyền của mình
-   Role hierarchy được set trong hàm init:
    ```solidity
    _setRoleAdmin(AGENT_ROLE, GOVERNMENT_ROLE);
    _setRoleAdmin(UPDATER_ROLE, GOVERNMENT_ROLE);
    ```

## Ý nghĩa các biến

### State Variables

-   `token`: Địa chỉ token USDC
-   `rate`: Tỷ lệ chuyển đổi giữa USDC và LP token, sử dụng để tính toán lượng LP mint/burn cho người dùng khi user muốn rút tiền. tính toán trên công thức totalSupply / totalValue \* 1e18
-   `lastTimeUpdated`: Thời điểm cập nhật rate cuối cùng
-   `totalSupply`: Tổng số LP token đã phát hành
-   `totalSupplyLocked`: Tổng số LP token bị lock, hiện tại không sử udnjg nữa (Deprecated)
-   `assetForwarder`: Địa chỉ contract AssetForwarder
-   `beneficiary`: Địa chỉ nhận phí
-   `fee`: Phí rút token (base 10000)
-   `FEE_BASE`: Hằng số 10000 để tính phí

### Mappings

-   `deposited[address]`: Số USDC đã deposit của mỗi user
-   `balance[address]`: Số LP token của mỗi user
-   `balanceLocked[address]`: Số LP token bị lock của mỗi user (Deprecated)
-   `treasury[uint256]`: Mapping chainId -> địa chỉ treasury, sử dụng thông tin để bridge qua Nitro
-   `tokenAddress[uint256]`: Mapping chainId -> địa chỉ token, sử dụng thông tin để bridge qua Nitro

## Luồng thực thi

### 1. Khởi tạo

-   Contract được khởi tạo thông qua hàm `init` với các tham số:
    -   `_token`: Địa chỉ token USDC
    -   `_agent`: Địa chỉ agent
    -   `_government`: Địa chỉ government
    -   `_assetForwarder`: Địa chỉ contract AssetForwarder
-   Các role được cấp phát:
    -   AGENT_ROLE cho \_agent
    -   GOVERNMENT_ROLE cho \_government
-   Set các thông số ban đầu:
    -   `rate = 1e18`
    -   `fee = 50` (0.5%)
    -   `beneficiary = government`
-   **Quyền gọi**: Chỉ có thể gọi một lần duy nhất khi deploy contract (initializer)

### 2. Luồng Deposit

Người dùng staking USDC vào vault

1. User gọi hàm `deposit(amount)`
    - **Quyền gọi**: Bất kỳ user nào
2. Contract kiểm tra amount > 0
3. Transfer USDC từ user vào contract
4. Tính số LP token dựa trên rate: `amountLP = amount * rate / 1e18`
5. Cập nhật:
    - `deposited[user] += amount`
    - `balance[user] += amountLP`
    - `totalSupply += amountLP`
6. Emit event `Deposited`

### 3. Luồng Withdraw

Người dùng rút tiền khỏi vault bằng cách đốt LP

1. User gọi hàm `withdraw(amountLP)`
    - **Quyền gọi**: Bất kỳ user nào có LP token
2. Contract kiểm tra:
    - amountLP > 0
    - balance[user] >= amountLP
    - totalSupply >= amountLP
3. Tính số token gốc: `amountToken = amountLP * 1e18 / rate`
4. Tính phí: `amountFee = amountToken * fee / FEE_BASE`
5. Cập nhật:
    - `balance[user] -= amountLP`
    - `totalSupply -= amountLP`
6. Transfer:
    - `amountToken - amountFee` cho user
    - `amountFee` cho beneficiary
7. Emit event `Withdrawn`

### 4. Luồng Cross-chain Transfer

1. Agent gọi hàm `transferToTreasury(amount, destAmount, chainId)`
    - **Quyền gọi**: Chỉ có AGENT_ROLE
2. Contract kiểm tra:
    - treasury[chainId] và tokenAddress[chainId] đã được set
    - Phí bridge (amount - destAmount) không vượt quá 1% của amount
3. Approve USDC cho AssetForwarder
4. Tạo DepositData và gọi AssetForwarder.iDeposit
5. Emit event `TreasuryTransferred`

### 5. Luồng Cập nhật Rate

1. Updater gọi hàm `updateRate(newRate)`
    - **Quyền gọi**: Chỉ có UPDATER_ROLE
2. Contract kiểm tra:
    - Thời gian từ lần update cuối > 15 phút
    - newRate > 0
    - newRate <= rate (rate mới phải nhỏ hơn hoặc bằng rate cũ)
    - newRate trong khoảng ±1% của rate hiện tại
3. Cập nhật:
    - `rate = newRate`
    - `lastTimeUpdated = block.timestamp`
4. Emit event `RateUpdated`

### 6. Luồng Quản trị

1. Government gọi các hàm quản trị:
    - `changeGovernment(newGovernment)`
        - **Quyền gọi**: Chỉ có GOVERNMENT_ROLE
    - `setTreasury(chainId, _treasury, _tokenAddress)`
        - **Quyền gọi**: Chỉ có GOVERNMENT_ROLE
    - `setFee(newFee)`
        - **Quyền gọi**: Chỉ có GOVERNMENT_ROLE
        - Giới hạn: newFee <= 1000 (10%)

## Các hàm và công dụng

### User Functions

1. `deposit(uint256 amount)`

    - Deposit USDC và nhận LP token
    - Tính số LP token dựa trên rate hiện tại
    - Cập nhật các biến tracking

2. `withdraw(uint256 amountLP)`
    - Rút USDC bằng LP token
    - Tính phí và chuyển token
    - Cập nhật các biến tracking

### Agent Functions

1. `transferToTreasury(uint256 amount, uint256 destAmount, uint256 chainId)`
    - Chuyển USDC sang treasury ở chain khác
    - Sử dụng AssetForwarder để bridge

### Updater Functions

1. `updateRate(uint256 newRate)`
    - Cập nhật rate (giới hạn 1% mỗi 15 phút)
    - Chỉ có thể gọi bởi UPDATER_ROLE
    - Các điều kiện:
        - Thời gian từ lần update cuối > 15 phút
        - newRate > 0
        - newRate <= rate (rate mới phải nhỏ hơn hoặc bằng rate cũ)
        - newRate trong khoảng ±1% của rate hiện tại

### Government Functions

1. `changeGovernment(address newGovernment)`

    - Thay đổi địa chỉ government
    - Chỉ có thể gọi bởi GOVERNMENT_ROLE

2. `setTreasury(uint256 chainId, bytes _treasury, bytes _tokenAddress)`

    - Set địa chỉ treasury và token cho các chain
    - Chỉ có thể gọi bởi GOVERNMENT_ROLE

3. `setFee(uint256 newFee)`
    - Set phí rút token (max 10%)
    - Chỉ có thể gọi bởi GOVERNMENT_ROLE

### Internal Functions

1. `_checkFeeBridge(uint256 amount, uint256 destAmount)`
    - Kiểm tra phí bridge có hợp lệ không
    - Tính toán: feeBridge = amount - destAmount
    - Yêu cầu: feeBridge <= amount / 100 (không vượt quá 1%)
    - Revert với message "Bridge fee too high" nếu phí quá cao
    - Được gọi trong hàm transferToTreasury
