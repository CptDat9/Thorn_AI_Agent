import hre from "hardhat";
import { viewBalanceNative } from "../../../utils/helper";
import { ADDRESSES, CHAINID } from "../../../utils/constants";

async function setArbitrumTreasury() {
    const { deployments, getNamedAccounts, getChainId } = hre;
    const { deploy, get, execute, read } = deployments;
    const { deployer, agent, government, beneficiary, updater } = await getNamedAccounts();
    if ((await getChainId()) != CHAINID.sapphire_mainnet.toString()) {
        throw Error("Wrong network");
    }
    let balanceGovernment = await viewBalanceNative(government);
    if (balanceGovernment > 0) {
        const usdcOnArbitrum = ADDRESSES.arbitrum.USDC;
        const arbitrumTreasury = ADDRESSES.arbitrum.treasury;
        // print address of updater
        console.log("updater: ", updater);

        // check role GOVERNMENT_ROLE
        const GOVERNMENT_ROLE = await read("Tulip", "GOVERNMENT_ROLE");
        let hasRole = await read("Tulip", "hasRole", GOVERNMENT_ROLE, government);
        console.log("hasRole: ", hasRole);
        if (!hasRole) {
            return;
        }
        const UPDATER_ROLE = await read("Tulip", "UPDATER_ROLE");
        hasRole = await read("Tulip", "hasRole", UPDATER_ROLE, updater);
        console.log("hasRole: ", hasRole);
        if (!hasRole) {
            await execute("Tulip", { from: government, log: true }, "grantRole", UPDATER_ROLE, updater);
        }
    }
}
setArbitrumTreasury();
