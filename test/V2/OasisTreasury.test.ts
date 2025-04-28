import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";
import hre, { ethers } from "hardhat";
import { ERC20Mintable__factory } from "../../typechain-types";
import { OasisTreasury__factory } from "../../typechain-types";
import { ERC20Mintable, OasisTreasury } from "../../typechain-types";
import { expect } from "chai";

describe("Oasis Treasury tests", () => {
    const { deployments } = hre;
    const { get } = deployments;
    let deployer: HardhatEthersSigner;
    let agent: HardhatEthersSigner;
    let beneficiary: HardhatEthersSigner;
    let government: HardhatEthersSigner;
    let user: HardhatEthersSigner;
    let snapshot: any;

    let usdc: ERC20Mintable;
    let oasisTreasury: OasisTreasury;
    let provider = hre.ethers.provider;

    before(async () => {
        await deployments.fixture();

        [deployer, agent, government, beneficiary, user] = await ethers.getSigners();

        // Deploy USDC

        usdc = ERC20Mintable__factory.connect((await get("USDC")).address, ethers.provider);
        oasisTreasury = OasisTreasury__factory.connect((await get("OasisTreasury")).address, ethers.provider);
        // Initialize OasisTreasury
        // Mint USDC to user
        await usdc.connect(deployer).mint(await user.getAddress(), ethers.parseUnits("100", 6));
        await usdc.connect(user).approve(await oasisTreasury.getAddress(), ethers.MaxUint256);
        snapshot = await takeSnapshot();
    });

    afterEach(async () => {
        await snapshot.restore();
    });

    describe("Initialization", () => {
        it("Should initialize with correct values", async () => {
            expect(await oasisTreasury.usdc()).to.equal(await usdc.getAddress());
            expect(await oasisTreasury.agent()).to.equal(await agent.getAddress());
            expect(await oasisTreasury.governance()).to.equal(await government.getAddress());
            expect(await oasisTreasury.beneficiary()).to.equal(await government.getAddress());
            expect(await oasisTreasury.fee()).to.equal(50);
            expect(await oasisTreasury.rate()).to.equal(ethers.parseUnits("1", 18));
        });
    });

    describe("Deposit", () => {
        it("Should deposit USDC successfully", async () => {
            const depositAmount = ethers.parseUnits("100", 6);

            // Deposit USDC
            await oasisTreasury.connect(user).deposit(depositAmount);

            // Check balances
            expect(await usdc.balanceOf(await oasisTreasury.getAddress())).to.equal(depositAmount);
            expect(await oasisTreasury.deposited(await user.getAddress())).to.equal(depositAmount);
            expect(await oasisTreasury.balance(await user.getAddress())).to.equal(depositAmount);
            expect(await oasisTreasury.totalSupply()).to.equal(depositAmount);
        });

        it("Should fail if amount is zero", async () => {
            await expect(oasisTreasury.connect(user).deposit(0)).to.be.revertedWith("Amount must be positive");
        });
    });

    describe("Withdraw", () => {
        it("Should withdraw USDC successfully", async () => {
            const depositAmount = ethers.parseUnits("100", 6);

            // First deposit
            await oasisTreasury.connect(user).deposit(depositAmount);

            // Then withdraw
            await oasisTreasury.connect(user).withdraw(depositAmount);

            // Check balances
            const fee = (depositAmount * 50n) / 10000n; // 0.5% fee
            const amountAfterFee = depositAmount - fee;

            expect(await usdc.balanceOf(await oasisTreasury.getAddress())).to.equal(0);
            expect(await usdc.balanceOf(await user.getAddress())).to.equal(amountAfterFee);
            expect(await usdc.balanceOf(await government.getAddress())).to.equal(fee);
            expect(await oasisTreasury.balance(await user.getAddress())).to.equal(0);
            expect(await oasisTreasury.totalSupply()).to.equal(0);
        });

        it("Should fail if amount is zero", async () => {
            await expect(oasisTreasury.connect(user).withdraw(0)).to.be.revertedWith("Amount must be positive");
        });

        it("Should fail if insufficient LP balance", async () => {
            const depositAmount = ethers.parseUnits("100", 6);
            await oasisTreasury.connect(user).deposit(depositAmount);

            await expect(oasisTreasury.connect(user).withdraw(depositAmount + 1n)).to.be.revertedWith("Insufficient LP balance");
        });
    });

    describe("Transfer to Treasury", () => {
        it("Should transfer USDC to another treasury", async () => {
            const amount = ethers.parseUnits("100", 6);

            // First deposit
            await oasisTreasury.connect(user).deposit(amount);

            // Create another treasury
            const anotherTreasuryFactory = await ethers.getContractFactory("OasisTreasury");
            const anotherTreasury = await anotherTreasuryFactory.deploy();
            await anotherTreasury.waitForDeployment();
            await anotherTreasury.init(await usdc.getAddress(), await agent.getAddress(), await government.getAddress());

            // Transfer to another treasury
            const transferData = usdc.interface.encodeFunctionData("transfer", [await anotherTreasury.getAddress(), amount]);

            await oasisTreasury.connect(agent).transferToTreasury(amount, await usdc.getAddress(), 0, await usdc.getAddress(), transferData);

            // Check balances
            expect(await usdc.balanceOf(await oasisTreasury.getAddress())).to.equal(0);
            expect(await usdc.balanceOf(await anotherTreasury.getAddress())).to.equal(amount);
        });

        it("Should fail if not called by agent", async () => {
            const amount = ethers.parseUnits("100", 6);
            await oasisTreasury.connect(user).deposit(amount);

            const transferData = usdc.interface.encodeFunctionData("transfer", [await user.getAddress(), amount]);

            await expect(oasisTreasury.connect(user).transferToTreasury(amount, await usdc.getAddress(), 0, await usdc.getAddress(), transferData)).to.be.revertedWith("Only agent can call this function");
        });
    });

    describe("Update Rate", () => {
        it("Should update rate successfully", async () => {
            const newRate = ethers.parseUnits("0.99", 18);

            await oasisTreasury.connect(agent).updateRate(newRate);

            expect(await oasisTreasury.rate()).to.equal(newRate);
            expect(await oasisTreasury.lastTimeUpdated()).to.be.gt(0);
        });

        it("Should fail if not called by agent", async () => {
            const newRate = ethers.parseUnits("0.99", 18);

            await expect(oasisTreasury.connect(user).updateRate(newRate)).to.be.revertedWith("Only agent can call this function");
        });

        it("Should fail if updated too soon", async () => {
            const newRate = ethers.parseUnits("0.99", 18);
            await oasisTreasury.connect(agent).updateRate(newRate);

            await expect(oasisTreasury.connect(agent).updateRate(newRate)).to.be.revertedWith("Can only update once 15 minutes");
        });

        it("Should fail if new rate is higher than old rate", async () => {
            const newRate = ethers.parseUnits("1.1", 18);

            await expect(oasisTreasury.connect(agent).updateRate(newRate)).to.be.revertedWith("New rate must be less than or equal to the old rate");
        });

        it("Should fail if new rate is zero", async () => {
            await expect(oasisTreasury.connect(agent).updateRate(0)).to.be.revertedWith("Rate must be positive");
        });

        it("Should fail if new rate is outside 1% range", async () => {
            const newRate = ethers.parseUnits("0.98", 18);

            await expect(oasisTreasury.connect(agent).updateRate(newRate)).to.be.revertedWith("New rate must be within 1% of the old rate");
        });
    });

    describe("Government functions", () => {
        it("Should change government", async () => {
            const newGovernment = beneficiary;

            await oasisTreasury.connect(government).changeGovernment(await newGovernment.getAddress());

            expect(await oasisTreasury.governance()).to.equal(await newGovernment.getAddress());
        });

        it("Should fail to change government if not called by government", async () => {
            const newGovernment = beneficiary;

            await expect(oasisTreasury.connect(user).changeGovernment(await newGovernment.getAddress())).to.be.revertedWith("Only governance can call this function");
        });

        it("Should change agent", async () => {
            const newAgent = beneficiary;

            await oasisTreasury.connect(government).changeAgent(await newAgent.getAddress());

            expect(await oasisTreasury.agent()).to.equal(await newAgent.getAddress());
        });

        it("Should fail to change agent if not called by government", async () => {
            const newAgent = beneficiary;

            await expect(oasisTreasury.connect(user).changeAgent(await newAgent.getAddress())).to.be.revertedWith("Only governance can call this function");
        });

        it("Should set fee", async () => {
            const newFee = 100;

            await oasisTreasury.connect(government).setFee(newFee);

            expect(await oasisTreasury.fee()).to.equal(newFee);
        });

        it("Should fail to set fee if not called by government", async () => {
            const newFee = 100;

            await expect(oasisTreasury.connect(user).setFee(newFee)).to.be.revertedWith("Only governance can call this function");
        });

        it("Should fail to set fee if fee is too high", async () => {
            const newFee = 1001;

            await expect(oasisTreasury.connect(government).setFee(newFee)).to.be.revertedWith("Fee must be less than 10%");
        });
    });

    describe("Request Withdraw", () => {
        it("Should request withdraw successfully", async () => {
            const depositAmount = ethers.parseUnits("100", 6);

            // First deposit
            await oasisTreasury.connect(user).deposit(depositAmount);

            // Then request withdraw
            await oasisTreasury.connect(user).requestWithdraw(depositAmount);

            // Check balances
            expect(await oasisTreasury.balance(await user.getAddress())).to.equal(0);
            expect(await oasisTreasury.balanceLocked(await user.getAddress())).to.equal(depositAmount);
            expect(await oasisTreasury.totalSupplyLocked()).to.equal(depositAmount);
        });

        it("Should fail if amount is zero", async () => {
            await expect(oasisTreasury.connect(user).requestWithdraw(0)).to.be.revertedWith("Amount must be positive");
        });

        it("Should fail if insufficient LP balance", async () => {
            const depositAmount = ethers.parseUnits("100", 6);
            await oasisTreasury.connect(user).deposit(depositAmount);

            await expect(oasisTreasury.connect(user).requestWithdraw(depositAmount + 1n)).to.be.revertedWith("Insufficient LP balance");
        });
    });

    describe("Withdraw For Requested", () => {
        it("Should withdraw for requested user successfully", async () => {
            const depositAmount = ethers.parseUnits("100", 6);

            // First deposit
            await oasisTreasury.connect(user).deposit(depositAmount);

            // Then request withdraw
            await oasisTreasury.connect(user).requestWithdraw(depositAmount);

            // Then withdraw for requested user (anyone can call)
            await oasisTreasury.connect(user).withdrawForRequested(await user.getAddress());

            // Check balances
            const fee = (depositAmount * 50n) / 10000n; // 0.5% fee
            const amountAfterFee = depositAmount - fee;

            expect(await usdc.balanceOf(await oasisTreasury.getAddress())).to.equal(0);
            expect(await usdc.balanceOf(await user.getAddress())).to.equal(amountAfterFee);
            expect(await usdc.balanceOf(await government.getAddress())).to.equal(fee);
            expect(await oasisTreasury.balance(await user.getAddress())).to.equal(0);
            expect(await oasisTreasury.balanceLocked(await user.getAddress())).to.equal(0);
            expect(await oasisTreasury.totalSupply()).to.equal(0);
            expect(await oasisTreasury.totalSupplyLocked()).to.equal(0);
        });

        it("Should fail if no requested withdraw", async () => {
            await expect(oasisTreasury.connect(user).withdrawForRequested(await user.getAddress())).to.be.revertedWith("No requested withdraw");
        });

        it("Should allow anyone to call withdrawForRequested", async () => {
            const depositAmount = ethers.parseUnits("100", 6);
            await oasisTreasury.connect(user).deposit(depositAmount);
            await oasisTreasury.connect(user).requestWithdraw(depositAmount);

            // Different user can call withdrawForRequested
            await oasisTreasury.connect(agent).withdrawForRequested(await user.getAddress());

            // Check balances
            const fee = (depositAmount * 50n) / 10000n; // 0.5% fee
            const amountAfterFee = depositAmount - fee;

            expect(await usdc.balanceOf(await oasisTreasury.getAddress())).to.equal(0);
            expect(await usdc.balanceOf(await user.getAddress())).to.equal(amountAfterFee);
            expect(await usdc.balanceOf(await government.getAddress())).to.equal(fee);
        });
    });
});