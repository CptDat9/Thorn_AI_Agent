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

    const compoundV3Module = CompoundV3StakingUSDCModule__factory.connect(
        ADDRESSES.arbitrum.compoundV3Module,
        hre.ethers.provider
    );

    const balance = await compoundV3Module.getTotalValue();

    console.log("Balance: ", balance.toString());
}

getBalance();
