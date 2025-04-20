import { AssetForwarder } from "../../typechain-types/contracts/mock/route-protocol-fork/AssetForwarder";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ADDRESSES } from "../../utils/constants";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, getChainId } = hre;
    const { deploy, get } = deployments;
    const { deployer, agent, government } = await getNamedAccounts();

    let usdc = ADDRESSES.sepolia.USDC;

    await deploy("SepoliaTreasury", {
        contract: "EVMTreasury",
        from: deployer,
        args: [],
        log: true,
        autoMine: true,
        proxy: {
            execute: {
                init: {
                    methodName: "init",
                    args: [usdc, agent, government],
                },
            },
        },
    });
};
deploy.tags = ["MOCK"];
export default deploy;
