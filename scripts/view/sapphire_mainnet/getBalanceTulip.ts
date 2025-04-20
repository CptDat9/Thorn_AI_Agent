import hre, { ethers } from "hardhat";
import {
    CompoundV3StakingUSDCModule__factory,
    ERC20Mintable__factory,
    EVMTreasury__factory,
    Tulip__factory,
} from "../../../typechain-types";
import { ADDRESSES, CHAINID } from "../../../utils/constants";
import { use } from "chai";
import { getQuoteRoute } from "../../../utils/router/quote";
import { viewBalanceNative } from "../../../utils/helper";

async function getBalance() {
    const { deployments, getChainId, getNamedAccounts } = hre;
    const { get, execute } = deployments;
    const { deployer, agent, government } = await getNamedAccounts();

    const tulip = Tulip__factory.connect(ADDRESSES.sapphire_mainnet.tulip, hre.ethers.provider);
    const usdc = ERC20Mintable__factory.connect(ADDRESSES.sapphire_mainnet.USDC, hre.ethers.provider);

    const balance = await usdc.balanceOf(await tulip.getAddress());

    console.log("Balance: ", balance.toString());

    const supply = await tulip.totalSupply();

    console.log("Supply: ", supply.toString());
}

getBalance();
