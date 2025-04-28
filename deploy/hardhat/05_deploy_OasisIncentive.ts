import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "hardhat";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, getChainId } = hre;
    const { deploy, get, execute } = deployments;
    const { deployer, government, user } = await getNamedAccounts();

    let treasury = (await get("OasisTreasury")).address;
    let thorn = (await get("THORN")).address;
    let usdc = (await get("USDC")).address;
    const REWARD_PER_SECOND = ethers.parseUnits("0.00001", 18); // 0.00001 THORN per second
    const LOCK_PERIOD = 3600; // 1 hour
    console.log("treasury:", treasury);
    console.log("thorn:", thorn);
    console.log("governance:", government);

    await deploy("OasisIncentive", {
        contract: "OasisIncentive",
        from: deployer,
        args: [],
        log: true,
        autoMine: true,
        proxy: {
            execute: {
                init: {
                    methodName: "init",
                    args: [treasury, usdc, thorn, government, REWARD_PER_SECOND, LOCK_PERIOD],
                },
            },
        },
    });
};

deploy.tags = ["OasisIncentive"];
export default deploy;
