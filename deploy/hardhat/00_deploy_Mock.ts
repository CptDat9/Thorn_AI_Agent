import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, getChainId } = hre;
    const { deploy, get } = deployments;
    const { deployer } = await getNamedAccounts();

    await deploy("USDC", {
        contract: "ERC20Mintable",
        from: deployer,
        args: ["USDC", "USDC", 6],
        log: true,
        autoMine: true,
    });
    await deploy("THORN", {
        contract: "ERC20Mintable",
        from: deployer,
        args: ["THORN", "THORN", 18],
        log: true,
        autoMine: true,
    });

    await deploy("AssetForwarder", {
        contract: "AssetForwarder",
        from: deployer,
        log: true,
        proxy: {
            owner: deployer,
            execute: {
                init: {
                    methodName: "initialize",
                    args: [],
                },
            },
        },
    });

    await deploy("AAVEPool", {
        contract: "AAVEPool",
        from: deployer,
        args: [],
        log: true,
    });

    const usdc = await get("USDC");
    await deploy("Comet", {
        contract: "Comet",
        from: deployer,
        args: [usdc.address],
        log: true,
    });
    const thorn = await deploy("THORN", {
        contract: "ERC20Mintable",
        from: deployer,
        args: ["THORN", "THORN", 18],
        log: true,
        autoMine: true,
    });
};
deploy.tags = ["MOCK"];
export default deploy;
