import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, getChainId } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    await deploy("AAVEPool", {
        contract: "AAVEPool",
        from: deployer,
        args: [],
        log: true,
    });
};
deploy.tags = ["MOCK"];
export default deploy;
