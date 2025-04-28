import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";
import hre, { ethers } from "hardhat";
import { ERC20Mintable__factory, OasisTreasury__factory, OasisIncentive__factory } from "../../typechain-types";
import { ERC20Mintable, OasisTreasury, OasisIncentive } from "../../typechain-types";
import { expect } from "chai";

describe("Oasis Incentive tests", () => {
    const { deployments } = hre;
    const { get } = deployments;
    let deployer: HardhatEthersSigner;
    let agent: HardhatEthersSigner;
    let governance: HardhatEthersSigner;
    let user: HardhatEthersSigner;
    let snapshot: any;

    let usdc: ERC20Mintable;
    let thorn: ERC20Mintable;
    let oasisTreasury: OasisTreasury;
    let oasisIncentive: OasisIncentive;

    const REWARD_PER_SECOND = ethers.parseUnits("0.00001", 18); // 0.00001 THORN per second (decimals = 18)
    const LOCK_PERIOD = 3600; // 1 hour lock period
    const DEPOSIT_AMOUNT = ethers.parseUnits("100", 6); // 100 USDC (decimals = 6)

    before(async () => {
        await deployments.fixture(["MOCK", "OasisTreasury", "OasisIncentive"]);

        [deployer, agent, governance, user] = await ethers.getSigners();

        // Get USDC, THORN, OasisTreasury, and OasisIncentive from deployments
        usdc = ERC20Mintable__factory.connect((await get("USDC")).address, ethers.provider);
        thorn = ERC20Mintable__factory.connect((await get("THORN")).address, ethers.provider);
        oasisTreasury = OasisTreasury__factory.connect((await get("OasisTreasury")).address, ethers.provider);
        oasisIncentive = OasisIncentive__factory.connect((await get("OasisIncentive")).address, ethers.provider);

        // Mint tokens
        await usdc.connect(deployer).mint(user.address, ethers.parseUnits("1000", 6)); // 1000 USDC for user
        await thorn.connect(deployer).mint(oasisIncentive.getAddress(), ethers.parseUnits("1000000", 18)); // 1M THORN for OasisIncentive

        // Approve USDC for OasisIncentive
        await usdc.connect(user).approve(oasisIncentive.getAddress(), ethers.MaxUint256);

        snapshot = await takeSnapshot();

        console.log("treasury:", await oasisTreasury.getAddress());
        console.log("thorn:", await thorn.getAddress());
        console.log("governance:", governance.address);
    });

    afterEach(async () => {
        await snapshot.restore();
    });

    describe("Initialization", () => {
        it("Should initialize with correct values", async () => {
            expect(await oasisIncentive.treasury()).to.equal(await oasisTreasury.getAddress());
            expect(await oasisIncentive.thorn()).to.equal(await thorn.getAddress());
            expect(await oasisIncentive.governance()).to.equal(governance.address);
            expect(await oasisIncentive.rewardPerSecond()).to.equal(REWARD_PER_SECOND);
            expect(await oasisIncentive.lockPeriod()).to.equal(LOCK_PERIOD);
            expect(await oasisIncentive.isIncentiveEnable()).to.equal(false);
            expect(await oasisIncentive.totalLP()).to.equal(0);
            expect(await oasisIncentive.numberOfUser()).to.equal(0);
            expect(await oasisIncentive.rewardIndex()).to.equal(0);
            expect(await oasisIncentive.lastTimeUpdate()).to.equal(0);
        });
    });

    describe("Enable Incentive", () => {
        it("Should enable incentive successfully", async () => {
            await expect(oasisIncentive.connect(governance).enableIncentive(thorn.getAddress(), REWARD_PER_SECOND))
                .to.emit(oasisIncentive, "IncentiveEnabled")
                .withArgs(await thorn.getAddress(), REWARD_PER_SECOND);

            expect(await oasisIncentive.isIncentiveEnable()).to.equal(true);
            expect(await oasisIncentive.thorn()).to.equal(await thorn.getAddress());
            expect(await oasisIncentive.rewardPerSecond()).to.equal(REWARD_PER_SECOND);
            expect(await oasisIncentive.lastTimeUpdate()).to.be.gt(0);
        });

        it("Should fail if already enabled", async () => {
            await oasisIncentive.connect(governance).enableIncentive(thorn.getAddress(), REWARD_PER_SECOND);
            await expect(oasisIncentive.connect(governance).enableIncentive(thorn.getAddress(), REWARD_PER_SECOND))
                .to.be.revertedWith("Chuong trinh thuong da bat");
        });

        it("Should fail if not called by governance", async () => {
            await expect(oasisIncentive.connect(user).enableIncentive(thorn.getAddress(), REWARD_PER_SECOND))
                .to.be.revertedWith("Only governance can call this function");
        });

        it("Should fail if thorn address is zero", async () => {
            await expect(oasisIncentive.connect(governance).enableIncentive(ethers.ZeroAddress, REWARD_PER_SECOND))
                .to.be.revertedWith("Token thuong khong hop le");
        });

        it("Should fail if rewardPerSecond is zero", async () => {
            await expect(oasisIncentive.connect(governance).enableIncentive(thorn.getAddress(), 0))
                .to.be.revertedWith("RPS phai lon hon 0");
        });
    });

    describe("Disable Incentive", () => {
        it("Should disable incentive successfully", async () => {
            await oasisIncentive.connect(governance).enableIncentive(thorn.getAddress(), REWARD_PER_SECOND);
            await expect(oasisIncentive.connect(governance).disableIncentive())
                .to.emit(oasisIncentive, "IncentiveDisabled");

            expect(await oasisIncentive.isIncentiveEnable()).to.equal(false);
            expect(await oasisIncentive.rewardPerSecond()).to.equal(0);
        });

        it("Should fail if not enabled", async () => {
            await expect(oasisIncentive.connect(governance).disableIncentive())
                .to.be.revertedWith("Chuong trinh thuong chua bat");
        });

        it("Should fail if not called by governance", async () => {
            await oasisIncentive.connect(governance).enableIncentive(thorn.getAddress(), REWARD_PER_SECOND);
            await expect(oasisIncentive.connect(user).disableIncentive())
                .to.be.revertedWith("Only governance can call this function");
        });
    });

    describe("Create Stake", () => {
        beforeEach(async () => {
            await oasisIncentive.connect(governance).enableIncentive(thorn.getAddress(), REWARD_PER_SECOND);
        });

        it("Should create stake successfully", async () => {
            const userBalanceBefore = await usdc.balanceOf(user.address);
            const treasuryBalanceBefore = await usdc.balanceOf(oasisTreasury.getAddress());

            await expect(oasisIncentive.connect(user).createStake(DEPOSIT_AMOUNT))
                .to.emit(oasisIncentive, "Staked")
                .withArgs(user.address, 0, DEPOSIT_AMOUNT, DEPOSIT_AMOUNT); // rate = 1e18, so LP = USDC

            // Check balances
            expect(await usdc.balanceOf(user.address)).to.equal(userBalanceBefore - DEPOSIT_AMOUNT);
            expect(await usdc.balanceOf(oasisTreasury.getAddress())).to.equal(treasuryBalanceBefore + DEPOSIT_AMOUNT);
            expect(await oasisIncentive.totalLP()).to.equal(DEPOSIT_AMOUNT);
            expect(await oasisIncentive.numberOfUser()).to.equal(1);
            expect(await oasisIncentive.isUser(user.address)).to.equal(true);
            expect(await oasisIncentive.numberOfStake(user.address)).to.equal(1);

            const stakeData = await oasisIncentive.stakeInfo(user.address, 0);
            expect(stakeData.lp).to.equal(DEPOSIT_AMOUNT);
            expect(stakeData.lastRewardIndex).to.equal(0);
            expect(stakeData.lastTimeUpdate).to.be.gt(0);
            expect(stakeData.lockedReward).to.equal(0);
            expect(stakeData.unlockReward).to.equal(0);
        });

        it("Should fail if amount is zero", async () => {
            await expect(oasisIncentive.connect(user).createStake(0))
                .to.be.revertedWith("So luong phai lon hon 0");
        });

        it("Should fail if incentive is disabled", async () => {
            await oasisIncentive.connect(governance).disableIncentive();
            await expect(oasisIncentive.connect(user).createStake(DEPOSIT_AMOUNT))
                .to.be.revertedWith("Staking is disabled");
        });

        it("Should fail if deposit fails due to insufficient allowance", async () => {
            // Revoke allowance
            await usdc.connect(user).approve(oasisIncentive.getAddress(), 0);
            await expect(oasisIncentive.connect(user).createStake(DEPOSIT_AMOUNT))
                .to.be.revertedWithCustomError(usdc, "ERC20InsufficientAllowance");
        });
    });

    describe("Upgrade Stake", () => {
        beforeEach(async () => {
            await oasisIncentive.connect(governance).enableIncentive(thorn.getAddress(), REWARD_PER_SECOND);
            await oasisIncentive.connect(user).createStake(DEPOSIT_AMOUNT);
        });

        it("Should upgrade stake successfully", async () => {
            const userBalanceBefore = await usdc.balanceOf(user.address);
            const treasuryBalanceBefore = await usdc.balanceOf(oasisTreasury.getAddress());
            const totalLPBefore = await oasisIncentive.totalLP();

            await expect(oasisIncentive.connect(user).upgradeStake(0, DEPOSIT_AMOUNT))
                .to.emit(oasisIncentive, "UpgradedStake")
                .withArgs(user.address, 0, DEPOSIT_AMOUNT, DEPOSIT_AMOUNT);

            // Check balances
            expect(await usdc.balanceOf(user.address)).to.equal(userBalanceBefore - DEPOSIT_AMOUNT);
            expect(await usdc.balanceOf(oasisTreasury.getAddress())).to.equal(treasuryBalanceBefore + DEPOSIT_AMOUNT);
            expect(await oasisIncentive.totalLP()).to.equal(totalLPBefore + DEPOSIT_AMOUNT);

            const stakeData = await oasisIncentive.stakeInfo(user.address, 0);
            expect(stakeData.lp).to.equal(DEPOSIT_AMOUNT * 2n);
            expect(stakeData.lastRewardIndex).to.be.gte(0);
            expect(stakeData.lastTimeUpdate).to.be.gt(0);
        });

        it("Should fail if amount is zero", async () => {
            await expect(oasisIncentive.connect(user).upgradeStake(0, 0))
                .to.be.revertedWith("So luong phai lon hon 0");
        });

        it("Should fail if stake ID is invalid", async () => {
            await expect(oasisIncentive.connect(user).upgradeStake(1, DEPOSIT_AMOUNT))
                .to.be.revertedWith("ID stake khong hop le");
        });

        it("Should fail if incentive is disabled", async () => {
            await oasisIncentive.connect(governance).disableIncentive();
            await expect(oasisIncentive.connect(user).upgradeStake(0, DEPOSIT_AMOUNT))
                .to.be.revertedWith("Staking is disabled");
        });
    });

    describe("Unstake", () => {
        beforeEach(async () => {
            await oasisIncentive.connect(governance).enableIncentive(thorn.getAddress(), REWARD_PER_SECOND);
            await oasisIncentive.connect(user).createStake(DEPOSIT_AMOUNT);
        });

        it("Should unstake successfully", async () => {
            const totalLPBefore = await oasisIncentive.totalLP();
            const userBalanceBefore = await usdc.balanceOf(user.address);
            const treasuryBalanceBefore = await usdc.balanceOf(oasisTreasury.getAddress());

            const fee = (DEPOSIT_AMOUNT * 50n) / 10000n; // 0.5% fee from OasisTreasury
            const amountAfterFee = DEPOSIT_AMOUNT - fee;

            console.log("Treasury Before:", treasuryBalanceBefore.toString());
            console.log("User Before:", userBalanceBefore.toString());
            console.log("Fee:", fee.toString());
            console.log("Amount after Fee:", amountAfterFee.toString());

            await oasisIncentive.connect(user).unstake(0);

            const treasuryBalanceAfter = await usdc.balanceOf(oasisTreasury.getAddress());
            const userBalanceAfter = await usdc.balanceOf(user.address);
            const governanceBalanceAfter = await usdc.balanceOf(governance.address);
            const totalLPAfter = await oasisIncentive.totalLP();

            console.log("Treasury After:", treasuryBalanceAfter.toString());
            console.log("User After:", userBalanceAfter.toString());
            console.log("Governance After:", governanceBalanceAfter.toString());
            console.log("Total LP After:", totalLPAfter.toString());
        });

        it("Should fail if stake ID is invalid", async () => {
            await expect(oasisIncentive.connect(user).unstake(1))
                .to.be.revertedWith("ID stake khong hop le");
        });

        it("Should fail if no LP to unstake", async () => {
            await oasisIncentive.connect(user).unstake(0);
            await expect(oasisIncentive.connect(user).unstake(0))
                .to.be.revertedWith("Khong co LP de rut");
        });

        it("Should fail if incentive is disabled", async () => {
            await oasisIncentive.connect(governance).disableIncentive();
            await expect(oasisIncentive.connect(user).unstake(0))
                .to.be.revertedWith("Staking is disabled");
        });
    });

    describe("Rewards", () => {
        beforeEach(async () => {
            await oasisIncentive.connect(governance).enableIncentive(thorn.getAddress(), REWARD_PER_SECOND);
            await oasisIncentive.connect(user).createStake(DEPOSIT_AMOUNT);
        });

        it("Should accumulate locked rewards correctly", async () => {
            const currentBlock = await ethers.provider.getBlock("latest");
            const newTimestamp = currentBlock.timestamp + 3600;
            await hre.ethers.provider.send("evm_setNextBlockTimestamp", [newTimestamp]);
            await hre.ethers.provider.send("evm_mine", []);

            const [locked, unlock] = await oasisIncentive.getPendingReward(user.address, 0);
            const rewardIndex = await oasisIncentive.rewardIndex();
            const lastTimeUpdate = await oasisIncentive.lastTimeUpdate();
            const totalLP = await oasisIncentive.totalLP();
            const blockTimestamp = (await ethers.provider.getBlock("latest")).timestamp;

            console.log("Locked Reward:", locked.toString());
            console.log("Unlock Reward:", unlock.toString());
            console.log("Reward Index:", rewardIndex.toString());
            console.log("Last Time Update:", lastTimeUpdate.toString());
            console.log("Total LP:", totalLP.toString());
            console.log("Block Timestamp:", blockTimestamp);
        });

        it("Should unlock rewards after lock period", async () => {
            const currentBlock = await ethers.provider.getBlock("latest");
            const newTimestamp = currentBlock.timestamp + LOCK_PERIOD;
            await hre.ethers.provider.send("evm_setNextBlockTimestamp", [newTimestamp]);
            await hre.ethers.provider.send("evm_mine", []);

            const [locked, unlock] = await oasisIncentive.getPendingReward(user.address, 0);
            const stakeData = await oasisIncentive.stakeInfo(user.address, 0);
            const blockTimestamp = (await ethers.provider.getBlock("latest")).timestamp;

            console.log("Locked Reward:", locked.toString());
            console.log("Unlock Reward:", unlock.toString());
            console.log("Last Time Update (Stake):", stakeData.lastTimeUpdate.toString());
            console.log("Lock Period:", LOCK_PERIOD);
            console.log("Block Timestamp:", blockTimestamp);
        });

        it("Should claim rewards correctly", async () => {
            const currentBlock = await ethers.provider.getBlock("latest");
            const newTimestamp = currentBlock.timestamp + LOCK_PERIOD;
            await hre.ethers.provider.send("evm_setNextBlockTimestamp", [newTimestamp]);
            await hre.ethers.provider.send("evm_mine", []);

            const userBalanceBefore = await thorn.balanceOf(user.address);
            let totalReward = 0n;
            await oasisIncentive.connect(user).claim().then((tx: any) => {
                if (tx.events && Array.isArray(tx.events)) {
                    tx.events.forEach((event: any) => {
                        if (event.event === "RewardClaimed") {
                            totalReward = event.args.amount;
                        }
                    });
                } else {
                    console.log("No events found in the transaction");
                }
            });
            

            const userBalanceAfter = await thorn.balanceOf(user.address);
            const stakeData = await oasisIncentive.stakeInfo(user.address, 0);
            const blockTimestamp = (await ethers.provider.getBlock("latest")).timestamp;

            console.log("Total Reward Claimed:", totalReward.toString());
            console.log("User Balance Before:", userBalanceBefore.toString());
            console.log("User Balance After:", userBalanceAfter.toString());
            console.log("Last Time Update (Stake):", stakeData.lastTimeUpdate.toString());
            console.log("Block Timestamp:", blockTimestamp);
        });

        it("Should unstake rewards correctly", async () => {
            const currentBlock = await ethers.provider.getBlock("latest");
            const newTimestamp = currentBlock.timestamp + LOCK_PERIOD;
            await hre.ethers.provider.send("evm_setNextBlockTimestamp", [newTimestamp]);
            await hre.ethers.provider.send("evm_mine", []);

            const userBalanceBefore = await thorn.balanceOf(user.address);
            let reward = 0n;
            await oasisIncentive.connect(user).unstakeReward(0).then((tx: any) => {
                if (tx.events && Array.isArray(tx.events)) {
                    tx.events.forEach((event: any) => {
                        if (event.event === "RewardUnstaked") {
                            reward = event.args.amount;
                        }
                    });
                } else {
                    console.log("No events found in the transaction");
                }
            });
            

            const userBalanceAfter = await thorn.balanceOf(user.address);
            const stakeData = await oasisIncentive.stakeInfo(user.address, 0);
            const blockTimestamp = (await ethers.provider.getBlock("latest")).timestamp;

            console.log("Reward Unstaked:", reward.toString());
            console.log("User Balance Before:", userBalanceBefore.toString());
            console.log("User Balance After:", userBalanceAfter.toString());
            console.log("Last Time Update (Stake):", stakeData.lastTimeUpdate.toString());
            console.log("Block Timestamp:", blockTimestamp);
        });

        it("Should fail to claim if no rewards", async () => {
            await expect(oasisIncentive.connect(user).claim())
                .to.be.revertedWith("Khong co thuong de rut");
        });

        it("Should fail to unstake reward if no rewards", async () => {
            await expect(oasisIncentive.connect(user).unstakeReward(0))
                .to.be.revertedWith("Khong co thuong de rut");
        });

        it("Should fail to unstake reward if stake ID is invalid", async () => {
            await expect(oasisIncentive.connect(user).unstakeReward(1))
                .to.be.revertedWith("ID stake not found");
        });

        it("Should handle multiple stakes correctly", async () => {
            await oasisIncentive.connect(user).createStake(DEPOSIT_AMOUNT); // Second stake
            const currentBlock = await ethers.provider.getBlock("latest");
            const newTimestamp = currentBlock.timestamp + LOCK_PERIOD;
            await hre.ethers.provider.send("evm_setNextBlockTimestamp", [newTimestamp]);
            await hre.ethers.provider.send("evm_mine", []);

            const [locked0, unlock0] = await oasisIncentive.getPendingReward(user.address, 0);
            const [locked1, unlock1] = await oasisIncentive.getPendingReward(user.address, 1);
            const userBalanceBefore = await thorn.balanceOf(user.address);
            await oasisIncentive.connect(user).claim();
            const userBalanceAfter = await thorn.balanceOf(user.address);
            const totalLP = await oasisIncentive.totalLP();
            const blockTimestamp = (await ethers.provider.getBlock("latest")).timestamp;

            console.log("Stake 0 - Locked Reward:", locked0.toString());
            console.log("Stake 0 - Unlock Reward:", unlock0.toString());
            console.log("Stake 1 - Locked Reward:", locked1.toString());
            console.log("Stake 1 - Unlock Reward:", unlock1.toString());
            console.log("User Balance Before:", userBalanceBefore.toString());
            console.log("User Balance After:", userBalanceAfter.toString());
            console.log("Total LP:", totalLP.toString());
            console.log("Block Timestamp:", blockTimestamp);
        });
    });

    describe("Update Reward Per Second", () => {
        beforeEach(async () => {
            await oasisIncentive.connect(governance).enableIncentive(thorn.getAddress(), REWARD_PER_SECOND);
            await oasisIncentive.connect(user).createStake(DEPOSIT_AMOUNT);
        });

        it("Should update reward per second successfully", async () => {
            const newRewardPerSecond = REWARD_PER_SECOND * 2n; // 0.00002 THORN/ second
            await oasisIncentive.connect(governance).updateRewardPerSecond(newRewardPerSecond);

            const currentBlock = await ethers.provider.getBlock("latest");
            const newTimestamp = currentBlock.timestamp + 3600;
            await hre.ethers.provider.send("evm_setNextBlockTimestamp", [newTimestamp]);
            await hre.ethers.provider.send("evm_mine", []);

            const [locked, unlock] = await oasisIncentive.getPendingReward(user.address, 0);
            const rewardPerSecond = await oasisIncentive.rewardPerSecond();
            const rewardIndex = await oasisIncentive.rewardIndex();
            const lastTimeUpdate = await oasisIncentive.lastTimeUpdate();
            const blockTimestamp = (await ethers.provider.getBlock("latest")).timestamp;

            console.log("Locked Reward:", locked.toString());
            console.log("Unlock Reward:", unlock.toString());
            console.log("Reward Per Second:", rewardPerSecond.toString());
            console.log("Reward Index:", rewardIndex.toString());
            console.log("Last Time Update:", lastTimeUpdate.toString());
            console.log("Block Timestamp:", blockTimestamp);
        });

        it("Should fail if not called by governance", async () => {
            await expect(oasisIncentive.connect(user).updateRewardPerSecond(REWARD_PER_SECOND * 2n))
                .to.be.revertedWith("Only governance can call this function");
        });
    });

    describe("Integration with OasisTreasury", () => {
        beforeEach(async () => {
            await oasisIncentive.connect(governance).enableIncentive(thorn.getAddress(), REWARD_PER_SECOND);
        });

        it("Should handle rate changes in OasisTreasury", async () => {
            await oasisIncentive.connect(user).createStake(DEPOSIT_AMOUNT);
            const totalLP1 = await oasisIncentive.totalLP();
            await oasisTreasury.connect(agent).updateRate(ethers.parseUnits("0.99", 18));
            const lpBefore = await oasisTreasury.balance(oasisIncentive.getAddress());
            await oasisIncentive.connect(user).createStake(DEPOSIT_AMOUNT);
            const lpAfter = await oasisTreasury.balance(oasisIncentive.getAddress());
            const totalLP2 = await oasisIncentive.totalLP();
            const rate = await oasisTreasury.rate();
            console.log("Total LP After First Stake:", totalLP1.toString());
            console.log("LP Before Second Stake:", lpBefore.toString());
            console.log("LP After Second Stake:", lpAfter.toString());
            console.log("Received LP (Second Stake):", (lpAfter - lpBefore).toString());
            console.log("Total LP After Second Stake:", totalLP2.toString());
            console.log("Rate:", rate.toString());
        });

        it("Should fail if deposit fails due to insufficient allowance", async () => {
            await usdc.connect(user).approve(oasisIncentive.getAddress(), 0);
            await expect(oasisIncentive.connect(user).createStake(DEPOSIT_AMOUNT))
                .to.be.revertedWithCustomError(usdc, "ERC20InsufficientAllowance");
        });
    });
});