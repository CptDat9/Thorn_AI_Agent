import { AssetForwarder } from "../../typechain-types/contracts/mock/route-protocol-fork/AssetForwarder";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ADDRESSES } from "../../utils/constants";
import { extendEnvironment } from "hardhat/config";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy, get, execute } = deployments;
    const { deployer, agent, government } = await getNamedAccounts();

    let usdc = ADDRESSES.sapphire_testnet.USDC;

    let treasury = (await get("EthTreasury")).address;

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
