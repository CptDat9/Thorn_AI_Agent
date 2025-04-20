import hre, { ethers } from "hardhat";
import { ERC20Mintable__factory, Tulip__factory } from "../../typechain-types";
import { ADDRESSES } from "../../utils/constants";
import { use } from "chai";

async function deposit() {
    const { deployments } = hre;
    const { get } = deployments;
    const tulip = Tulip__factory.connect((await get("Tulip")).address, hre.ethers.provider);

    const user = (await hre.ethers.getSigners())[4];
    console.log("User address: ", await user.getAddress());

    const usdc = ERC20Mintable__factory.connect(ADDRESSES.sapphire_mainnet.USDC, hre.ethers.provider);
    let balance = await usdc.balanceOf(await user.getAddress());
    let lpBefore = await tulip.balance(user.address);
    console.log("USDC balance: ", ethers.formatUnits(balance, 6));
    console.log("Tulip balance: ", ethers.formatUnits(lpBefore, 6));

    let amount = ethers.parseUnits("5", 6);
    let txRseponse;
    console.log("Approving USDC to Tulip");
    txRseponse = await usdc.connect(user).approve(await tulip.getAddress(), amount);
    await txRseponse.wait();
    console.log("Depositing USDC to Tulip");
    txRseponse = await tulip.connect(user).deposit(amount);
    await txRseponse.wait();
    let lpAfter = await tulip.balance(user.address);
    console.log("Tulip balance: ", ethers.formatUnits(lpAfter, 6));
}

deposit();
