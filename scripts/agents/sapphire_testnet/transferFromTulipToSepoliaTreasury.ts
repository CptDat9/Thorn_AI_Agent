import hre, { ethers } from "hardhat";
import { ERC20Mintable__factory, Tulip__factory } from "../../../typechain-types";
import { ADDRESSES } from "../../../utils/constants";
import { use } from "chai";

async function deposit() {
    const { deployments } = hre;
    const { get } = deployments;
    const tulip = Tulip__factory.connect((await get("Tulip")).address, hre.ethers.provider);

    const agent = (await hre.ethers.getSigners())[3]; // dev key
    const usdc = ERC20Mintable__factory.connect(ADDRESSES.sapphire_mainnet.USDC, hre.ethers.provider);

    const usdcOnSepolia = await tulip.evmTokenAddress(11155111);
    const sepoliaTreasury = await tulip.evmTreasury(11155111);
    let assetForwarder = await tulip.assetForwarder();
    console.log("Asset Forwarder: ", assetForwarder);
    console.log("USDC on Sepolia: ", usdcOnSepolia);
    console.log("Sepolia Treasury: ", sepoliaTreasury);

    let balanceUSDCInTulip = await usdc.balanceOf(await tulip.getAddress());
    console.log("Balance USDC in Tulip: ", ethers.formatUnits(balanceUSDCInTulip, 6));
    let amount = ethers.parseUnits("1", 6);
    let destAmount = ethers.parseUnits("1", 6);
    let agent_role = await tulip.AGENT_ROLE();
    let hasRole = await tulip.hasRole(agent_role, await agent.getAddress());
    console.log("Has role: ", hasRole);
    let txResponse;
    try {
        //  await tulip.connect(agent).transferToEvmTreasury.staticCall(amount, destAmount, 11155111);
        txResponse = await tulip.connect(agent).transferToEvmTreasury(amount, destAmount, 11155111);
        await txResponse.wait();
    } catch (error) {
        console.log("Error: ", error);
    }
}

deposit();
