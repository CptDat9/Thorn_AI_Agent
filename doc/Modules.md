# Modules Technical Documentation

## Tổng quan

Modules là các contract được thiết kế để tương tác với các protocol khác nhau (như Compound V3) thông qua EVMTreasury. Mỗi module đều implement interface IModule và có thể được enable/disable bởi EVMTreasury.

## Interface IModule

```solidity
interface IModule {
    function deposit(bytes memory data) external;
    function withdraw(bytes memory data) external;
    function getTotalValue() external view returns (uint256);
}
```

### Ý nghĩa của các hàm trong interface

#### 1. deposit(bytes memory data)

-   **Mục đích**: Nạp toàn bộ tàisản vào protocol
-   **Tham số**:
    -   `data`: Bytes chứa các thông tin cần thiết cho việc deposit
-   **Quyền gọi**: Chỉ có thể được gọi bởi EVMTreasury

#### 2. withdraw(bytes memory data)

-   **Mục đích**: Rút tài sản từ protocol và chuyển về Treasury
-   **Tham số**:
    -   `data`: Bytes chứa các thông tin cần thiết cho việc withdraw
-   **Quyền gọi**: Chỉ có thể được gọi bởi EVMTreasury
-

#### 3. getTotalValue()

-   **Mục đích**: Tính toán tổng giá trị tài sản trong module
-   **Giá trị trả về**:
    -   Tổng giá trị tài sản dưới dạng uint256
    -   Bao gồm cả tài sản trong contract và trong protocol
-   **Yêu cầu**:
    -   Phải tính toán chính xác tổng giá trị
    -   Phải cập nhật giá trị theo thời gian thực
