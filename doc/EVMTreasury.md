# EVMTreasury Contract Technical Documentation

## Roles và Quyền hạn

### 1. GOVERNMENT_ROLE

-   Role quản trị cao nhất trong hệ thống
-   Có quyền quản lý các role khác
-   Có thể thực hiện các chức năng:
    -   Thay đổi địa chỉ government
    -   Set địa chỉ treasury và token cho các chain
    -   Quản lý AGENT_ROLE
    -   Enable/disable các module
    -   Thực thi các lệnh từ government
-   Được cấp phát trong hàm init
-   Có thể được thay đổi thông qua hàm changeGovernment

### 2. AGENT_ROLE

-   Role thực hiện các giao dịch chuyển tài sản qua lại giữa các treasury cross-chain
-   Có quyền:
    -   Chuyển token sang treasury ở chain khác
    -   Chuyển token sang Tulip contract
    -   Tương tác với các module đã được enable
    -   Tương tác với AssetForwarder
-   Được quản lý bởi GOVERNMENT_ROLE
-   Được cấp phát trong hàm init

### 3. Role Hierarchy

```
GOVERNMENT_ROLE
    └── AGENT_ROLE
```

### 4. Role Management

-   GOVERNMENT_ROLE có thể:
    -   Grant/revoke AGENT_ROLE
    -   Thay đổi chính mình
-   Các role khác không thể tự grant/revoke quyền của mình
-   Role hierarchy được set trong hàm init:
    ```solidity
    _setRoleAdmin(AGENT_ROLE, GOVERNMENT_ROLE);
    ```

## Ý nghĩa các biến

### State Variables

-   `token`: Địa chỉ token USDC
-   `assetForwarder`: Địa chỉ contract AssetForwarder
-   `tulipAddress`: Địa chỉ contract Tulip ở chain khác

### Mappings

-   `_modules[address]`: Mapping địa chỉ module -> trạng thái enable/disable
-   `treasury[uint256]`: Mapping chainId -> địa chỉ treasury, sử dụng thông tin để bridge qua Nitro
-   `tokenAddress[uint256]`: Mapping chainId -> địa chỉ token, sử dụng thông tin để bridge qua Nitro

## Luồng thực thi

### 1. Khởi tạo

-   Contract được khởi tạo thông qua hàm `init` với các tham số:
    -   `_token`: Địa chỉ token USDC
    -   `_agent`: Địa chỉ agent
    -   `_government`: Địa chỉ government
    -   `_assetForwarder`: Địa chỉ contract AssetForwarder
    -   `_tulipAddress`: Địa chỉ contract Tulip ở chain khác
-   Các role được cấp phát:
    -   AGENT_ROLE cho \_agent
    -   GOVERNMENT_ROLE cho \_government
-   **Quyền gọi**: Chỉ có thể gọi một lần duy nhất khi deploy contract (initializer)

### 2. Luồng Module Management

1. Government gọi các hàm quản lý module:
    - `enableModule(module)`
        - **Quyền gọi**: Chỉ có GOVERNMENT_ROLE
        - Kích hoạt module để có thể tương tác
    - `disableModule(module)`
        - **Quyền gọi**: Chỉ có GOVERNMENT_ROLE
        - Vô hiệu hóa module, không thể tương tác nữa

### 3. Luồng Module Interaction

1. Agent gọi các hàm tương tác với module:
    - `approveAndCallModule(module, amount, value, data)`
        - **Quyền gọi**: Chỉ có AGENT_ROLE
        - Chuyển token và gọi module
        - Kiểm tra module đã được enable
    - `callModule(module, value, data)`
        - **Quyền gọi**: Chỉ có AGENT_ROLE
        - Gọi module mà không chuyển token
        - Kiểm tra module đã được enable

### 4. Luồng Cross-chain Transfer

1. Agent gọi các hàm chuyển token:
    - `transferToTulip(amount, destAmount)`
        - **Quyền gọi**: Chỉ có AGENT_ROLE
        - Chuyển token sang Tulip contract ở chain khác
        - Sử dụng AssetForwarder để bridge
    - `transferToTreasury(amount, destAmount, chainId)`
        - **Quyền gọi**: Chỉ có AGENT_ROLE
        - Chuyển token sang treasury ở chain khác
        - Sử dụng AssetForwarder để bridge

### 5. Luồng Quản trị

1. Government gọi các hàm quản trị:
    - `changeGovernment(newGovernment)`
        - **Quyền gọi**: Chỉ có GOVERNMENT_ROLE
    - `setTreasury(chainId, _treasury, _tokenAddress)`
        - **Quyền gọi**: Chỉ có GOVERNMENT_ROLE
    - `gorvermentExec(target[], value[], data[])`
        - **Quyền gọi**: Chỉ có GOVERNMENT_ROLE
        - Thực thi các lệnh từ government
        - Gọi các hàm ở các địa chỉ target với value và data tương ứng

## Các hàm và công dụng

### Module Management Functions

1. `enableModule(address module)`

    - Kích hoạt module để có thể tương tác
    - Chỉ có thể gọi bởi GOVERNMENT_ROLE

2. `disableModule(address module)`
    - Vô hiệu hóa module
    - Chỉ có thể gọi bởi GOVERNMENT_ROLE

### Module Interaction Functions

1. `approveAndCallModule(address module, uint256 amount, uint256 value, bytes data)`

    - Chuyển token và gọi module
    - Chỉ có thể gọi bởi AGENT_ROLE

2. `callModule(address module, uint256 value, bytes data)`
    - Gọi module mà không chuyển token
    - Chỉ có thể gọi bởi AGENT_ROLE

### Cross-chain Transfer Functions

1. `transferToTulip(uint256 amount, uint256 destAmount)`

    - Chuyển token sang Tulip contract
    - Chỉ có thể gọi bởi AGENT_ROLE

2. `transferToTreasury(uint256 amount, uint256 destAmount, uint256 chainId)`
    - Chuyển token sang treasury ở chain khác
    - Chỉ có thể gọi bởi AGENT_ROLE

### Government Functions

1. `changeGovernment(address newGovernment)`

    - Thay đổi địa chỉ government
    - Chỉ có thể gọi bởi GOVERNMENT_ROLE

2. `setTreasury(uint256 chainId, bytes _treasury, bytes _tokenAddress)`

    - Set địa chỉ treasury và token cho các chain
    - Chỉ có thể gọi bởi GOVERNMENT_ROLE

3. `gorvermentExec(address[] target, uint256[] value, bytes[] data)`
    - Thực thi các lệnh từ government
    - Chỉ có thể gọi bởi GOVERNMENT_ROLE
