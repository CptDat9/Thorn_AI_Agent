import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";
import hre, { ethers } from "hardhat";
import { Comet, Comet__factory, EVMTreasury__factory } from "../../typechain-types";
import { ERC20Mintable__factory } from "../../typechain-types";
import { CompoundV3StakingUSDCModule__factory } from "../../typechain-types";
import { ERC20Mintable, EVMTreasury, CompoundV3StakingUSDCModule } from "../../typechain-types";
import { expect, use } from "chai";

describe("Compound V3 Staking tests", () => {
    const { deployments } = hre;
    const { get } = deployments;
    let deployer: HardhatEthersSigner;
    let agent: HardhatEthersSigner;
    let beneficiary: HardhatEthersSigner;
    let government: HardhatEthersSigner;
    let user: HardhatEthersSigner;
    let snapshot: any;

    let usdc: ERC20Mintable;
    let comet: Comet;
    let evmTreasury: EVMTreasury;
    let compoundV3Module: CompoundV3StakingUSDCModule;
    let provider = hre.ethers.provider;

    before(async () => {
        await deployments.fixture();

        usdc = ERC20Mintable__factory.connect((await get("USDC")).address, provider);
        comet = Comet__factory.connect((await get("Comet")).address, provider);
        evmTreasury = EVMTreasury__factory.connect((await get("EVMTreasury")).address, provider);
        compoundV3Module = CompoundV3StakingUSDCModule__factory.connect((await get("CompoundV3StakingUSDCModule")).address, provider);

        [deployer, agent, government, beneficiary, user] = await ethers.getSigners();

        // Mint USDC to user
        await usdc.connect(user).mint(await user.getAddress(), ethers.parseUnits("1000", 6));
        await usdc.connect(user).approve(await evmTreasury.getAddress(), ethers.MaxUint256);
        snapshot = await takeSnapshot();
    });

    afterEach(async () => {
        await snapshot.restore();
    });

    describe("Initialization", () => {
        it("Should initialize with correct values", async () => {
            expect(await compoundV3Module.treasury()).to.equal(await evmTreasury.getAddress());
            expect(await compoundV3Module.government()).to.equal(await government.getAddress());
            expect(await compoundV3Module.usdc()).to.equal(await usdc.getAddress());
            expect(await compoundV3Module.comet()).to.equal(await comet.getAddress());
        });
    });

    describe("Government functions", () => {
        it("Should change government", async () => {
            const newGovernment = beneficiary;

            await compoundV3Module.connect(government).changeGovernment(await newGovernment.getAddress());

            expect(await compoundV3Module.government()).to.equal(await newGovernment.getAddress());
        });

        it("Should fail to change government if not called by government", async () => {
            const newGovernment = beneficiary;

            await expect(compoundV3Module.connect(user).changeGovernment(await newGovernment.getAddress())).to.be.revertedWith("Only governance");
        });

        it("Should change Comet", async () => {
            // Deploy a new Comet contract
            const newComet = await (await ethers.getContractFactory("Comet")).deploy(await usdc.getAddress());

            await compoundV3Module.connect(government).changeComet(await newComet.getAddress());

            expect(await compoundV3Module.comet()).to.equal(await newComet.getAddress());
        });

        it("Should fail to change Comet if not called by government", async () => {
            // Deploy a new Comet contract
            const newComet = await (await ethers.getContractFactory("Comet")).deploy(await usdc.getAddress());

            await expect(compoundV3Module.connect(user).changeComet(await newComet.getAddress())).to.be.revertedWith("Only governance");
        });
    });

    describe("Integration with EVMTreasury", () => {
        it("Should deposit through EVMTreasury", async () => {
            await usdc.connect(user).transfer(await evmTreasury.getAddress(), ethers.parseUnits("100", 6));

            const depositAmount = ethers.parseUnits("100", 6);

            // Approve and call module through treasury
            const depositData = compoundV3Module.interface.encodeFunctionData("deposit", ["0x"]);
            await evmTreasury.connect(agent).approveAndCallModule(await compoundV3Module.getAddress(), depositAmount, 0, depositData);

            // Check balances
            expect(await usdc.balanceOf(await compoundV3Module.getAddress())).to.equal(0);
            expect(await comet.balanceOf(await compoundV3Module.getAddress())).to.equal(depositAmount);
            expect(await compoundV3Module.getTotalValue()).to.equal(depositAmount);
        });

        it("Should withdraw through EVMTreasury", async () => {
            const depositAmount = ethers.parseUnits("100", 6);
            await usdc.connect(user).transfer(await evmTreasury.getAddress(), ethers.parseUnits("100", 6));
            // First deposit
            const depositData = compoundV3Module.interface.encodeFunctionData("deposit", ["0x"]);
            await evmTreasury.connect(agent).approveAndCallModule(await compoundV3Module.getAddress(), depositAmount, 0, depositData);

            // Then withdraw
            const withdrawData = compoundV3Module.interface.encodeFunctionData("withdraw", ["0x"]);
            await evmTreasury.connect(agent).callModule(await compoundV3Module.getAddress(), 0, withdrawData);

            // Check balances
            expect(await usdc.balanceOf(await compoundV3Module.getAddress())).to.equal(0);
            expect(await comet.balanceOf(await compoundV3Module.getAddress())).to.equal(0);
            expect(await usdc.balanceOf(await evmTreasury.getAddress())).to.equal(depositAmount);
            expect(await compoundV3Module.getTotalValue()).to.equal(0);
        });
    });
});
