# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.ts
```
---
## Console.log
```shell

  Oasis Incentive tests
treasury: 0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e
thorn: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
governance: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
treasury: 0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e
thorn: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
governance: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
    Initialization
      ✔ Should initialize with correct values (45ms)
    Enable Incentive
      ✔ Should enable incentive successfully
      ✔ Should fail if already enabled
      ✔ Should fail if not called by governance
      ✔ Should fail if thorn address is zero
      ✔ Should fail if rewardPerSecond is zero
    Disable Incentive
      ✔ Should disable incentive successfully
      ✔ Should fail if not enabled
      ✔ Should fail if not called by governance
    Create Stake
      ✔ Should create stake successfully
      ✔ Should fail if amount is zero
      ✔ Should fail if incentive is disabled
      ✔ Should fail if deposit fails due to insufficient allowance
    Upgrade Stake
      ✔ Should upgrade stake successfully
      ✔ Should fail if amount is zero
      ✔ Should fail if stake ID is invalid
      ✔ Should fail if incentive is disabled
    Unstake
Treasury Before: 100000000
User Before: 900000000
Fee: 500000
Amount after Fee: 99500000
Treasury After: 0
User After: 900000000
Governance After: 500000
Total LP After: 0
      ✔ Should unstake successfully
      ✔ Should fail if stake ID is invalid
      ✔ Should fail if no LP to unstake
      ✔ Should fail if incentive is disabled
    Rewards
Locked Reward: 0
Unlock Reward: 36010000000000000
Reward Index: 0
Last Time Update: 1745921081
Total LP: 100000000
Block Timestamp: 1745924682
      ✔ Should accumulate locked rewards correctly
Locked Reward: 0
Unlock Reward: 36010000000000000
Last Time Update (Stake): 1745921082
Lock Period: 3600
Block Timestamp: 1745924682
      ✔ Should unlock rewards after lock period
No events found in the transaction
Total Reward Claimed: 0
User Balance Before: 0
User Balance After: 36020000000000000
Last Time Update (Stake): 1745924683
Block Timestamp: 1745924683
      ✔ Should claim rewards correctly
No events found in the transaction
Reward Unstaked: 0
User Balance Before: 0
User Balance After: 36020000000000000
Last Time Update (Stake): 1745924683
Block Timestamp: 1745924683
      ✔ Should unstake rewards correctly
      ✔ Should fail to claim if no rewards
      ✔ Should fail to unstake reward if no rewards
      ✔ Should fail to unstake reward if stake ID is invalid
Stake 0 - Locked Reward: 0
Stake 0 - Unlock Reward: 18020000000000000
Stake 1 - Locked Reward: 0
Stake 1 - Unlock Reward: 18000000000000000
User Balance Before: 0
User Balance After: 36030000000000000
Total LP: 200000000
Block Timestamp: 1745924684
      ✔ Should handle multiple stakes correctly
    Update Reward Per Second
Locked Reward: 0
Unlock Reward: 72020000000000000
Reward Per Second: 20000000000000
Reward Index: 200000000000000000000000
Last Time Update: 1745921083
Block Timestamp: 1745924683
      ✔ Should update reward per second successfully
      ✔ Should fail if not called by governance
    Integration with OasisTreasury
Total LP After First Stake: 100000000
LP Before Second Stake: 100000000
LP After Second Stake: 199000000
Received LP (Second Stake): 99000000
Total LP After Second Stake: 199000000
Rate: 990000000000000000
      ✔ Should handle rate changes in OasisTreasury
      ✔ Should fail if deposit fails due to insufficient allowance


  33 passing (3s)
```