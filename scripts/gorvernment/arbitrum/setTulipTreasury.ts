import hre from "hardhat";
import { viewBalanceNative } from "../../../utils/helper";
import { ADDRESSES } from "../../../utils/constants";

async function setTulipTreasury() {
    const { deployments, getNamedAccounts, getChainId } = hre;
    const { deploy, get, execute } = deployments;
    const { deployer, agent, government } = await getNamedAccounts();
    if ((await getChainId()) != String(42161)) {
        console.log("Wrong network");
        return;
    }
    let balanceGovernment = await viewBalanceNative(government);
    if (balanceGovernment > 0) {
        let tulipAddress = "0xcFAb3dBE538d557cf6827B7914e10a103D7BB8f9";

        // await execute(
        //     "ArbitrumTreasury",
        //     { from: government, log: true },
        //     "setTreasury",
        //     23294,
        //     tulipAddress,
        //     ADDRESSES.sapphire_mainnet.USDC
        // );
    }
}
setTulipTreasury();
