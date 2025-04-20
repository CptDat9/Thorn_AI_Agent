## Compound V3 USDC Module

### Tổng quan

Module này cho phép tương tác với Compound V3 để stake USDC và nhận lợi nhuận.

### Các biến quan trọng

-   `treasury`: Địa chỉ EVMTreasury
-   `government`: Địa chỉ government
-   `usdc`: Địa chỉ token USDC
-   `comet`: Địa chỉ contract Compound V3

### Các chức năng chính

#### 1. Khởi tạo

```solidity
function init(
    address _treasury,
    address _government,
    address _usdc,
    address _comet
) public initializer
```

-   Set các địa chỉ cần thiết
-   **Quyền gọi**: Chỉ có thể gọi một lần khi deploy

#### 2. Treasury Functions

1. `deposit(bytes memory data)`

    - **Quyền gọi**: Chỉ có treasury
    - Chức năng:
        - Kiểm tra số dư USDC
        - Approve USDC cho Compound
        - Supply vào Compound
    - Emit event `Deposited`

2. `withdraw(bytes memory data)`
    - **Quyền gọi**: Chỉ có treasury
    - Chức năng:
        - Kiểm tra số dư trong Compound
        - Withdraw từ Compound
        - Transfer USDC về treasury
    - Emit event `Withdrawn`

#### 3. Government Functions

1. `changeGovernment(address _government)`

    - **Quyền gọi**: Chỉ có government
    - Thay đổi địa chỉ government
    - Emit event `GovernmentChanged`

2. `changeComet(address _comet)`

    - **Quyền gọi**: Chỉ có government
    - Thay đổi địa chỉ Compound contract
    - Emit event `CometChanged`

3. `gorvermentExec(address[] target, uint256[] value, bytes[] data)`
    - **Quyền gọi**: Chỉ có government
    - Thực thi các lệnh từ government
    - Gọi các hàm ở các địa chỉ target

#### 4. View Functions

1. `getTotalValue()`
    - Tính tổng giá trị trong module
    - Bao gồm USDC trong contract và trong Compound

### Events

```solidity
event Deposited(uint256 amount);
event Withdrawn(uint256 amount);
event GovernmentChanged(address oldGovernment, address newGovernment);
event CometChanged(address oldComet, address newComet);
```

### Tương tác với Compound V3

Module tương tác với Compound V3 thông qua interface IComet:

```solidity
interface IComet {
    function supply(address asset, uint256 amount) external;
    function withdraw(address asset, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
    function baseToken() external view returns (address);
}
```

### Luồng hoạt động

1. **Deposit Flow**:

    - EVMTreasury chuyển USDC vào module
    - Module approve USDC cho Compound
    - Module supply USDC vào Compound
    - Emit event Deposited

2. **Withdraw Flow**:

    - EVMTreasury yêu cầu rút USDC
    - Module withdraw USDC từ Compound
    - Module transfer USDC về EVMTreasury
    - Emit event Withdrawn

3. **Quản trị Flow**:
    - Government có thể thay đổi địa chỉ government
    - Government có thể thay đổi địa chỉ Compound
    - Government có thể thực thi các lệnh khác

### Bảo mật

1. **Access Control**:

    - Sử dụng modifier `onlyTreasury` và `onlyGovernment`
    - Chỉ treasury có thể deposit/withdraw
    - Chỉ government có thể thay đổi các thông số quan trọng

2. **Kiểm tra điều kiện**:
    - Kiểm tra số dư trước khi thực hiện các giao dịch
    - Kiểm tra địa chỉ zero khi thay đổi các địa chỉ
    - Kiểm tra quyền hạn trước khi thực hiện các hàm

### Tương tác với EVMTreasury

1. Module được enable trong EVMTreasury
2. EVMTreasury có thể:
    - Chuyển USDC vào module
    - Gọi các hàm deposit/withdraw
    - Quản lý module thông qua government
