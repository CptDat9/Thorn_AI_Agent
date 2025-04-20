import hre, { ethers } from "hardhat";
import { ERC20Mintable__factory, Tulip__factory } from "../../../typechain-types";
import { ADDRESSES, CHAINID } from "../../../utils/constants";
import { use } from "chai";
import { getQuoteRoute } from "../../../utils/router/quote";
import { viewBalanceNative } from "../../../utils/helper";

async function deposit() {
    const { deployments, getChainId, getNamedAccounts } = hre;
    const { get, execute } = deployments;
    const { deployer, agent, government } = await getNamedAccounts();

    if ((await getChainId()) != CHAINID.sapphire_mainnet.toString()) {
        throw Error("Wrong network");
    }

    let balanceAgent = await viewBalanceNative(agent);
    if (balanceAgent == 0n) {
        throw Error("Agent has no balance");
    }
    return;
    const tulip = Tulip__factory.connect((await get("Tulip")).address, hre.ethers.provider);

    const usdc = ERC20Mintable__factory.connect(ADDRESSES.sapphire_mainnet.USDC, hre.ethers.provider);

    const destChain = CHAINID.arbitrum;

    let [usdcOnArbitrum, arbitrumTreasury, assetForwarder] = await Promise.all([
        tulip.tokenAddress(destChain),
        tulip.treasury(destChain),
        tulip.assetForwarder(),
    ]);

    if (usdcOnArbitrum != ADDRESSES.arbitrum.USDC) {
        throw Error(`USDC on Arbitrum is not correct ${usdcOnArbitrum} expected ${ADDRESSES.arbitrum.USDC}`);
    }

    if (arbitrumTreasury != ADDRESSES.arbitrum.treasury.toLowerCase()) {
        throw Error(`Arbitrum Treasury is not correct ${arbitrumTreasury} expected ${ADDRESSES.arbitrum.treasury}`);
    }

    if (assetForwarder.toLowerCase() != ADDRESSES.sapphire_mainnet.assetForwarder.toLocaleLowerCase()) {
        throw Error(
            `Asset Forwarder is not correct ${assetForwarder} expected ${ADDRESSES.sapphire_mainnet.assetForwarder}`
        );
    }

    let amount = ethers.parseUnits("1", 6);
    let quote = await getQuoteRoute({
        tokenSrcChain: ADDRESSES.sapphire_mainnet.USDC,
        tokenDestChain: ADDRESSES.arbitrum.USDC,
        amount: amount,
        srcChainId: CHAINID.sapphire_mainnet,
        desChainId: CHAINID.arbitrum,
    });

    console.log("Quote: ", quote);
    let destAmount = quote.destination.tokenAmount;

    console.log("Amount: ", amount.toString());
    console.log("Dest Amount: ", destAmount.toString());
    console.log("estimate time to complete: ", quote.estimatedTime);

    await execute("Tulip", { from: agent, log: true }, "transferToTreasury", amount, destAmount, CHAINID.arbitrum);
}

deposit();
