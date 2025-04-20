import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, getChainId } = hre;
    const { deploy, get, execute } = deployments;
    const { deployer, agent, government } = await getNamedAccounts();

    let usdc = (await get("USDC")).address;
    let treasury = (await get("EVMTreasury")).address;
    let comet = (await get("Comet")).address;

    await deploy("CompoundV3StakingUSDCModule", {
        contract: "CompoundV3StakingUSDCModule",
        from: deployer,
        args: [],
        log: true,
        autoMine: true,
        proxy: {
            execute: {
                init: {
                    methodName: "init",
                    args: [treasury, government, usdc, comet],
                },
            },
        },
    });

    await execute("EVMTreasury", { from: government, log: true }, "enableModule", (await get("CompoundV3StakingUSDCModule")).address);
};
deploy.tags = ["compound-v3"];
export default deploy;
