import { EVMTreasury } from "../../typechain-types/contracts/EVMTreasury";
import { AssetForwarder } from "../../typechain-types/contracts/mock/route-protocol-fork/AssetForwarder";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "hardhat";
import { ADDRESSES } from "../../utils/constants";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, getChainId } = hre;
    const { deploy, get, execute } = deployments;
    const { deployer, agent, government, beneficiary } = await getNamedAccounts();

    console.log("deployer: ", deployer);
    console.log("agent: ", agent);
    console.log("government: ", government);
    console.log("beneficiary: ", beneficiary);
};
deploy.tags = ["before"];
export default deploy;
