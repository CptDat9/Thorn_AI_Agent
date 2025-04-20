import hre, { ethers } from "hardhat";

export async function viewBalanceNative(wallet: string) {
    const balance = await hre.ethers.provider.getBalance(wallet);
    console.log(wallet, "  Balance: ", Number(ethers.formatEther(balance)));
    return balance;
}
