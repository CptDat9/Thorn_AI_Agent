import { EVMTreasury } from "./../../typechain-types/contracts/EVMTreasury";
import { AssetForwarder } from "../../typechain-types/contracts/mock/route-protocol-fork/AssetForwarder";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "hardhat";
import { ADDRESSES } from "../../utils/constants";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    console.log("==== Deploying Tulip ====");
    const { deployments, getNamedAccounts, getChainId } = hre;
    const { deploy, get, execute } = deployments;
    const { deployer, agent, government } = await getNamedAccounts();

    let usdc = ADDRESSES.sapphire_testnet.USDC;

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

    const usdcSepolia = ADDRESSES.sepolia.USDC;
    const sepoliaTreasury = "0x237A14782b12c52ac89d7158f3cDf99b1ECE5095";
    const chainId = 11155111;

    await execute("Tulip", { from: government, log: true }, "setEVMTreasury", chainId, sepoliaTreasury, usdcSepolia);
};
deploy.tags = ["Tulip"];
export default deploy;
