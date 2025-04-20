import { EVMTreasury } from "../../typechain-types/contracts/EVMTreasury";
import { AssetForwarder } from "../../typechain-types/contracts/mock/route-protocol-fork/AssetForwarder";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "hardhat";
import { ADDRESSES } from "../../utils/constants";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, getChainId } = hre;
    const { deploy, get, execute } = deployments;
    const { deployer, agent, government } = await getNamedAccounts();

    let usdc = ADDRESSES.sapphire_mainnet.USDC;
    await deploy("Tulip", {
        contract: "Tulip",
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
deploy.tags = ["Tulip"];
export default deploy;
