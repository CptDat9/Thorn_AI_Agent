import hre from "hardhat";
import { viewBalanceNative } from "../../utils/helper";
import { CHAINID } from "../../utils/constants";

async function getBalanceUpdater() {
    const { deployments, getNamedAccounts, getChainId } = hre;
    const { deploy, get, execute, read } = deployments;
    const { deployer, agent, government, beneficiary, updater } = await getNamedAccounts();
    if ((await getChainId()) != CHAINID.sapphire_mainnet.toString()) {
        throw Error("Wrong network");
    }
    let balanceUpdater = await viewBalanceNative(updater);
    console.log("balanceUpdater: ", balanceUpdater);
}
getBalanceUpdater();
