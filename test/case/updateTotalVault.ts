import { EVMTreasury } from "./../../typechain-types/contracts/EVMTreasury";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ERC20__factory, EVMTreasury__factory, Tulip__factory } from "../../typechain-types";
import hre, { ethers } from "hardhat";
import { use } from "chai";
export async function updateRate() {
    const { deployments } = hre;
    const { get } = deployments;
    let deployer: HardhatEthersSigner;
    let agent: HardhatEthersSigner;
    let government: HardhatEthersSigner;
    let user: HardhatEthersSigner;
    [deployer, agent, government, user] = await ethers.getSigners();
    let usdc = ERC20__factory.connect((await get("USDC")).address, ethers.provider);
    let evmTreasury = EVMTreasury__factory.connect((await get("EVMTreasury")).address, ethers.provider);
    let tulip = Tulip__factory.connect((await get("Tulip")).address, ethers.provider);
    let totalUSDC = 0n;

    totalUSDC += await usdc.balanceOf(agent.address);
    totalUSDC += await usdc.balanceOf(await evmTreasury.getAddress());
    totalUSDC += await usdc.balanceOf(await tulip.getAddress());
    //console.log("Total USDC: ", totalUSDC);

    let totalLP = await tulip.totalSupply();
    //console.log("Total LP: ", totalLP);
}
