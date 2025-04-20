import hre, { ethers } from "hardhat";
import { ERC20Mintable__factory, EVMTreasury__factory, Tulip__factory } from "../../../typechain-types";
import { ADDRESSES, CHAINID } from "../../../utils/constants";
import { use } from "chai";
import { getQuoteRoute } from "../../../utils/router/quote";
import { viewBalanceNative } from "../../../utils/helper";

async function deposit() {
    const { deployments, getChainId, getNamedAccounts } = hre;
    const { get, execute } = deployments;
    const { deployer, agent, government } = await getNamedAccounts();

    if ((await getChainId()) != CHAINID.arbitrum.toString()) {
        throw Error("Wrong network");
    }

    let balanceAgent = await viewBalanceNative(agent);
    if (balanceAgent == 0n) {
        throw Error("Agent has no balance");
    }

    const arbitrumTreasury = EVMTreasury__factory.connect((await get("ArbitrumTreasury")).address, hre.ethers.provider);

    const usdc = ERC20Mintable__factory.connect(ADDRESSES.sapphire_mainnet.USDC, hre.ethers.provider);

    const destChain = CHAINID.sapphire_mainnet;

    let [usdcOnSapphire, tulip, assetForwarder] = await Promise.all([
        arbitrumTreasury.tokenAddress(destChain),
        arbitrumTreasury.tulipAddress(),
        arbitrumTreasury.assetForwarder(),
    ]);

    if (usdcOnSapphire != ADDRESSES.sapphire_mainnet.USDC) {
        throw Error(`USDC on Arbitrum is not correct ${usdcOnSapphire} expected ${ADDRESSES.sapphire_mainnet.USDC}`);
    }

    if (tulip.toLocaleLowerCase() != ADDRESSES.sapphire_mainnet.tulip.toLowerCase()) {
        throw Error(`Arbitrum Treasury is not correct ${arbitrumTreasury} expected ${ADDRESSES.arbitrum.treasury}`);
    }

    if (assetForwarder.toLowerCase() != ADDRESSES.arbitrum.assetForwarder.toLocaleLowerCase()) {
        throw Error(`Asset Forwarder is not correct ${assetForwarder} expected ${ADDRESSES.arbitrum.assetForwarder}`);
    }

    let amount = ethers.parseUnits("0.5", 6);
    let quote = await getQuoteRoute({
        tokenSrcChain: ADDRESSES.arbitrum.USDC,
        tokenDestChain: ADDRESSES.sapphire_mainnet.USDC,
        amount: amount,
        srcChainId: CHAINID.arbitrum,
        desChainId: CHAINID.sapphire_mainnet,
    });

    console.log("Quote: ", quote);
    let destAmount = quote.destination.tokenAmount;

    console.log("Amount: ", amount.toString());
    console.log("Dest Amount: ", destAmount.toString());
    console.log("estimate time to complete: ", quote.estimatedTime);

    await execute("ArbitrumTreasury", { from: agent, log: true }, "transferToTulip", amount, destAmount);
}

deposit();
