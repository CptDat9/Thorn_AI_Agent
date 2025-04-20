import hre from "hardhat";
import { viewBalanceNative } from "../../../utils/helper";
import { ADDRESSES, CHAINID } from "../../../utils/constants";

async function setArbitrumTreasury() {
    const { deployments, getNamedAccounts, getChainId } = hre;
    const { deploy, get, execute } = deployments;
    const { deployer, agent, government } = await getNamedAccounts();
    if ((await getChainId()) != CHAINID.sapphire_mainnet.toString()) {
        throw Error("Wrong network");
    }
    let balanceGovernment = await viewBalanceNative(government);
    if (balanceGovernment > 0) {
        const usdcOnArbitrum = ADDRESSES.arbitrum.USDC;
        const arbitrumTreasury = ADDRESSES.arbitrum.treasury;

        await execute(
            "Tulip",
            { from: government, log: true },
            "setTreasury",
            CHAINID.arbitrum,
            arbitrumTreasury,
            usdcOnArbitrum
        );
    }
}
setArbitrumTreasury();
