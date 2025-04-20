import { EVMTreasury } from "../typechain-types/contracts/EVMTreasury";
import { takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";
import hre, { ethers, getNamedAccounts } from "hardhat";
import {
    AssetForwarder,
    AssetForwarder__factory,
    ERC20Mintable,
    ERC20Mintable__factory,
    EVMTreasury__factory,
    Tulip,
    Tulip__factory,
} from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect, use } from "chai";
import { updateRate } from "./case/updateTotalVault";
describe("Tulip tests", () => {
    const { deployments } = hre;
    const { get } = deployments;
    let deployer: HardhatEthersSigner;
    let agent: HardhatEthersSigner;
    let beneficiary: HardhatEthersSigner;
    let government: HardhatEthersSigner;
    let updater: HardhatEthersSigner;
    let user: HardhatEthersSigner;
    let snapshot: any;
    let tulip: Tulip;
    let usdc: ERC20Mintable;
    let assetForwarder: AssetForwarder;
    let evmTreasury: EVMTreasury;
    let provider = hre.ethers.provider;

    before(async () => {
        await deployments.fixture();
        snapshot = await takeSnapshot();
    });

    beforeEach(async () => {
        await snapshot.restore(snapshot);
        tulip = Tulip__factory.connect((await get("Tulip")).address, provider);
        usdc = ERC20Mintable__factory.connect((await get("USDC")).address, provider);
        evmTreasury = EVMTreasury__factory.connect((await get("EVMTreasury")).address, provider);
        [deployer, agent, government, beneficiary, updater, user] = await ethers.getSigners();
        //mint
        await usdc.connect(user).mint(await user.getAddress(), ethers.parseUnits("1000", 6));
        await usdc.connect(user).approve(await tulip.getAddress(), ethers.MaxUint256);
        await tulip.connect(user).deposit(ethers.parseUnits("100", 6));

        await updateRate();
    });

    describe("Tulip tests", () => {
        describe("Init", () => {
            it("should init", async () => {
                // check role
                expect(await tulip.hasRole(await tulip.GOVERNMENT_ROLE(), await government.getAddress())).to.be.true;
                expect(await tulip.hasRole(await tulip.GOVERNMENT_ROLE(), await user.getAddress())).to.be.false;
            });
        });

        describe("User functions", () => {
            describe("Deposit", () => {
                it("should deposit", async () => {
                    await expect(tulip.connect(user).deposit(ethers.parseUnits("100", 6)))
                        .to.emit(tulip, "Deposited")
                        .withArgs(await user.getAddress(), ethers.parseUnits("100", 6), ethers.parseUnits("100", 6));
                });

                it("should fail if deposit more than balance", async () => {
                    await expect(tulip.connect(user).deposit(ethers.parseUnits("10000", 6))).to.be.reverted;
                });
            });

            describe("Withdraw", () => {
                it("should withdraw", async () => {
                    await tulip.connect(user).withdraw(ethers.parseUnits("100", 6));
                });

                it("should fail if withdraw more than balance", async () => {
                    await expect(tulip.connect(user).withdraw(ethers.parseUnits("10000", 6))).to.be.reverted;
                });
            });
        });

        describe("Government functions", () => {
            describe("Change government", () => {
                it("should change government", async () => {
                    const GOVERNMENT_ROLE = await tulip.GOVERNMENT_ROLE();

                    expect(await tulip.hasRole(GOVERNMENT_ROLE, await government.getAddress())).to.be.true;

                    await expect(tulip.connect(government).changeGovernment(user.address))
                        .to.emit(tulip, "GovernmentChanged")
                        .withArgs(await government.getAddress(), await user.getAddress());
                });

                it("should fail if not government", async () => {
                    await expect(tulip.connect(user).changeGovernment(await agent.getAddress())).to.be.reverted;
                });
            });

            describe("Set treasury", () => {
                it("should set treasury", async () => {
                    let treasury = await evmTreasury.getAddress();
                    let tokenAddress = await usdc.getAddress();
                    await tulip.connect(government).setTreasury(11155111, treasury, tokenAddress);
                });

                it("should fail if not government", async () => {
                    let treasury = await evmTreasury.getAddress();
                    let tokenAddress = await usdc.getAddress();

                    await expect(tulip.connect(user).setTreasury(11155111, treasury, tokenAddress)).to.be.reverted;
                });
            });

            describe("Set fee", () => {
                it("should set fee", async () => {
                    let oldFee = await tulip.fee();
                    await expect(tulip.connect(government).setFee(100))
                        .to.emit(tulip, "FeeUpdated")
                        .withArgs(oldFee, 100);
                    expect(await tulip.fee()).to.equal(100);
                });
                it("should fail if fee is more than 10%", async () => {
                    await expect(tulip.connect(government).setFee(1001)).to.be.reverted;
                });
                it("should fail if not government", async () => {
                    await expect(tulip.connect(user).setFee(100)).to.be.reverted;
                });
            });

            describe("Set updater", () => {
                it("should set updater", async () => {
                    let UPDATER_ROLE = await tulip.UPDATER_ROLE();

                    await expect(tulip.connect(government).grantRole(UPDATER_ROLE, updater.address))
                        .to.emit(tulip, "RoleGranted")
                        .withArgs(UPDATER_ROLE, updater.address, government.address);
                });
            });
        });
    });
});
