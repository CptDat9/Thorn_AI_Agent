import { AssetForwarder } from "../../typechain-types/contracts/mock/route-protocol-fork/AssetForwarder";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ADDRESSES } from "../../utils/constants";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, getChainId } = hre;
    const { deploy, get, execute } = deployments;
    const { deployer, agent, government } = await getNamedAccounts();

    let usdc = ADDRESSES.arbitrum.USDC;
    // https://docs.routerprotocol.com/develop/asset-transfer-via-nitro/supported-chains-tokens/
    let assetForwarder = "0xef300fb4243a0ff3b90c8ccfa1264d78182adaa4";
    // tulip address on Sapphire
    let tulipAddress = "0xcFAb3dBE538d557cf6827B7914e10a103D7BB8f9";
    await deploy("ArbitrumTreasury", {
        contract: "EVMTreasury",
        from: deployer,
        args: [],
        log: true,
        autoMine: true,
        proxy: {
            execute: {
                init: {
                    methodName: "init",
                    args: [usdc, agent, government, assetForwarder, tulipAddress],
                },
            },
        },
    });
};
deploy.tags = ["MOCK"];
export default deploy;
