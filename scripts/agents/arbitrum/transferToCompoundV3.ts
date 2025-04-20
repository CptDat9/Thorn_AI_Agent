import hre, { ethers } from "hardhat";
import { viewBalanceNative } from "../../../utils/helper";
import { ADDRESSES, CHAINID } from "../../../utils/constants";
import { CompoundV3StakingUSDCModule__factory, ERC20__factory, EVMTreasury__factory } from "../../../typechain-types";

async function transferToCompoundV3() {
    const { deployments, getChainId, getNamedAccounts } = hre;
    const { get, execute } = deployments;
    const { deployer, agent, government } = await getNamedAccounts();

    if ((await getChainId()) != CHAINID.arbitrum.toString()) {
        throw Error("Wrong network");
    }

    let balanceAgent = await viewBalanceNative(agent);
    if (balanceAgent == 0n) {
        throw Error("Agent has no balance");
    }

    let usdc = ERC20__factory.connect(ADDRESSES.arbitrum.USDC, hre.ethers.provider);

    let balanceUSDCInTreasury = await usdc.balanceOf(ADDRESSES.arbitrum.treasury);

    console.log("Balance USDC in Treasury: ", ethers.formatUnits(balanceUSDCInTreasury, 6));

    let amount = ethers.parseUnits("0.1", 6);

    const module = CompoundV3StakingUSDCModule__factory.connect(
        ADDRESSES.arbitrum.compoundV3Module,
        hre.ethers.provider
    );

    let treasuryInModule = await module.treasury();
    let comet = await module.comet();
    let usdcOnContract = await module.usdc();
    console.log("USDC on Contract: ", usdcOnContract, " x ", ADDRESSES.arbitrum.USDC);
    console.log("Comet: ", comet);

    console.log("Treasury in Module: ", treasuryInModule);
    const tx = await module.deposit.populateTransaction("0x00");
    console.log(tx);
    const treasury = EVMTreasury__factory.connect(ADDRESSES.arbitrum.treasury, ethers.provider);
    const agentWallet = await hre.ethers.getSigner(agent);
    console.log("Agent Wallet: ", agentWallet.address);
    const txPopulate = await treasury
        .connect(agentWallet)
        .approveAndCallModule.populateTransaction(ADDRESSES.arbitrum.compoundV3Module, amount, 0, tx.data);

    console.log(txPopulate);

    console.log(tx);
    await execute(
        "ArbitrumTreasury",
        { from: agent, log: true },
        "approveAndCallModule",
        ADDRESSES.arbitrum.compoundV3Module,
        amount,
        0,
        tx.data
    );
}

transferToCompoundV3();
