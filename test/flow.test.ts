import { EVMTreasury } from "./../typechain-types/contracts/EVMTreasury";
import { Tulip } from "./../typechain-types/contracts/Tulip";
import { takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";
import hre, { ethers, getNamedAccounts } from "hardhat";
import {
    ERC20Mintable,
    ERC20Mintable__factory,
    EVMTreasury__factory,
    Tulip__factory,
} from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { updateRate } from "./case/updateTotalVault";

describe("Tulip and EVMTreasury tests", () => {
    const { deployments } = hre;
    const { get } = deployments;
    const normalized = (addr: string) => ethers.getAddress(addr);
    let deployer: HardhatEthersSigner;
    let agent: HardhatEthersSigner;
    let beneficiary: HardhatEthersSigner;
    let government: HardhatEthersSigner;
    let user: HardhatEthersSigner;
    let snapshot: any;
    let tulip: Tulip;
    let usdc: ERC20Mintable;
    let evmTreasury: EVMTreasury;
    let provider = hre.ethers.provider;
    let usdcAddr: string;
    let tulipAddr: string;
    let treasuryAddr: string;
    before(async () => {
        await deployments.fixture();
        snapshot = await takeSnapshot();
        tulip = Tulip__factory.connect((await get("Tulip")).address, provider);
        usdc = ERC20Mintable__factory.connect((await get("USDC")).address, provider);
        evmTreasury = EVMTreasury__factory.connect((await get("EVMTreasury")).address, provider);
        [deployer, agent, government, beneficiary, user] = await ethers.getSigners();
        //mint  
        await usdc.connect(user).mint(await user.getAddress(), ethers.parseUnits("1000", 6));
        await usdc.connect(user).approve(await tulip.getAddress(), ethers.MaxUint256);
        await tulip.connect(user).deposit(ethers.parseUnits("100", 6));
        // normalize addr
        usdcAddr = await usdc.getAddress();
        tulipAddr = await tulip.getAddress();
        treasuryAddr = await evmTreasury.getAddress();
        // Update rate (updates Tulip's rate)
        await updateRate();
    });

    beforeEach(async () => {
        await snapshot.restore();
    });

    describe("Tulip Flow tests", () => {
        it("fails when treasury not set", async () => {
            const amount = ethers.parseUnits("10", 6);
            const destAmount = ethers.parseUnits("10", 6);
            await expect(
                tulip.connect(agent).transferToTreasury(amount, destAmount, 11155111)
            ).to.be.revertedWith("Chain not supported");
        });

        it("fails when bridge fee too high", async () => {
            const amount = ethers.parseUnits("10", 6);
            const destAmount = ethers.parseUnits("8", 6); // Fee > 1%
            await tulip
                .connect(government)
                .setTreasury(11155111, await evmTreasury.getAddress(), await usdc.getAddress());
            await expect(
                tulip.connect(agent).transferToTreasury(amount, destAmount, 11155111)
            ).to.be.revertedWith("Bridge fee too high");
        });

        it("succeeds when treasury set", async () => {
            const amount = ethers.parseUnits("10", 6);
            const destAmount = ethers.parseUnits("9.95", 6); // Fee <= 1%
            await tulip
                .connect(government)
                .setTreasury(11155111, await evmTreasury.getAddress(), await usdc.getAddress());

            const tx = await tulip.connect(agent).transferToTreasury(amount, destAmount, 11155111);

            // await expect(tx)
            //     .to.emit(tulip, "TransferRequested")
            //     .withArgs(
            //         ethers.getAddress(usdcAddr),
            //         amount,
            //         destAmount,
            //         11155111,
            //         ethers.getAddress(usdcAddr),
            //         ethers.getAddress(treasuryAddr)
            //     );
            const receipt = await tx.wait();

            const event = receipt.logs
                .map((log) => {
                    try {
                        return tulip.interface.parseLog(log);
                    } catch (e) {
                        return null;
                    }
                })
                .find((parsed) => parsed && parsed.name === "TransferRequested");

            expect(event).to.not.be.undefined;

            const { args } = event!;
            expect(args[0]).to.equal(usdcAddr);
            expect(args[1]).to.equal(amount);
            expect(args[2]).to.equal(destAmount);
            expect(args[3]).to.equal(11155111);
            expect(ethers.getAddress(args[4])).to.equal(ethers.getAddress(usdcAddr));
            expect(ethers.getAddress(args[5])).to.equal(ethers.getAddress(treasuryAddr));
            await expect(tx)
                .to.emit(tulip, "TreasuryTransferred")
                .withArgs(11155111, amount, destAmount);
        });
    });

    describe("EVMTreasury Flow tests", () => {
        it("fails when tulipAddress not set", async () => {
            const amount = ethers.parseUnits("10", 6);
            const destAmount = ethers.parseUnits("10", 6);
            // Deploy EVMTreasury w empty tulipAddress
            const newTreasury = await new EVMTreasury__factory(deployer).deploy();
            await newTreasury.init(
                await usdc.getAddress(),
                await agent.getAddress(),
                await government.getAddress(),
                "0x"
            );
            await expect(
                newTreasury.connect(agent).transferToTulip(amount, destAmount, 11155111)
            ).to.be.revertedWith("Tulip address is not setting");
        });

        it("fails when tokenAddress not set", async () => {
            const amount = ethers.parseUnits("10", 6);
            const destAmount = ethers.parseUnits("10", 6);
            await expect(
                evmTreasury.connect(agent).transferToTulip(amount, destAmount, 11155111)
            ).to.be.revertedWith("Token is not supported");
        });

        it("fails when treasury not set", async () => {
            const amount = ethers.parseUnits("10", 6);
            const destAmount = ethers.parseUnits("10", 6);
            await expect(
                evmTreasury.connect(agent).transferToTreasury(amount, destAmount, 11155111)
            ).to.be.revertedWith("Chain not supported");
        });

        it("succeeds transfer when tulipAddress and tokenAddress are set", async () => {
            const amount = ethers.parseUnits("10", 6);
            const destAmount = ethers.parseUnits("10", 6);
            await evmTreasury
                .connect(government)
                .setTreasury(11155111, await evmTreasury.getAddress(), await usdc.getAddress());

            const tx = await evmTreasury.connect(agent).transferToTulip(amount, destAmount, 11155111);
            const receipt = await tx.wait();

            const event = receipt.logs
                .map((log) => {
                    try {
                        return tulip.interface.parseLog(log);
                    } catch (e) {
                        return null;
                    }
                })
                .find((parsed) => parsed && parsed.name === "TransferRequested");
            expect(event).to.not.be.undefined;
            const { args } = event!;
            expect(args[0]).to.equal(usdcAddr);
            expect(args[1]).to.equal(amount);
            expect(args[2]).to.equal(destAmount);
            expect(args[3]).to.equal(11155111);
            expect(ethers.getAddress(args[4])).to.equal(ethers.getAddress(usdcAddr));
            expect(ethers.getAddress(args[5])).to.equal(ethers.getAddress(tulipAddr));
        });

        it("succeeds transfer when treasury set", async () => {
            const amount = ethers.parseUnits("10", 6);
            const destAmount = ethers.parseUnits("10", 6);
            await evmTreasury
                .connect(government)
                .setTreasury(11155111, await evmTreasury.getAddress(), await usdc.getAddress());

            const tx = await evmTreasury.connect(agent).transferToTreasury(amount, destAmount, 11155111);
            const receipt = await tx.wait();

            const event = receipt.logs
                .map((log) => {
                    try {
                        return tulip.interface.parseLog(log);
                    } catch (e) {
                        return null;
                    }
                })
                .find((parsed) => parsed && parsed.name === "TransferRequested");

            expect(event).to.not.be.undefined;

            const { args } = event!;
            expect(args[0]).to.equal(usdcAddr);
            expect(args[1]).to.equal(amount);
            expect(args[2]).to.equal(destAmount);
            expect(args[3]).to.equal(11155111);
            expect(ethers.getAddress(args[4])).to.equal(ethers.getAddress(usdcAddr));
            expect(ethers.getAddress(args[5])).to.equal(ethers.getAddress(treasuryAddr));
        });
    });
});