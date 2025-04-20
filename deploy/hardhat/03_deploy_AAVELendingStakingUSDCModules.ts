import { AssetForwarder } from "../../typechain-types/contracts/mock/route-protocol-fork/AssetForwarder";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, getChainId } = hre;
    const { deploy, get } = deployments;
    const { deployer, agent, government } = await getNamedAccounts();

    let usdc = (await get("USDC")).address;

    let assetForwarder = (await get("AssetForwarder")).address;

    let treasury = (await get("EVMTreasury")).address;

    let aavePool = (await get("AAVEPool")).address;

    await deploy("AAVELendingStakingUSDCModule", {
        contract: "AAVELendingStakingUSDCModule",
        from: deployer,
        args: [],
        log: true,
        autoMine: true,
        proxy: {
            execute: {
                init: {
                    methodName: "init",
                    args: [treasury, government, usdc, aavePool],
                },
            },
        },
    });
};
deploy.tags = ["AAVELendingUSDC"];
export default deploy;
