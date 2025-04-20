import hre, { ethers } from "hardhat";

import { use } from "chai";
import { ADDRESSES } from "../utils/constants";
import { ERC20Mintable__factory, Tulip__factory } from "../typechain-types";

async function deposit() {
    const { deployments } = hre;
    const { get } = deployments;
    const tulip = Tulip__factory.connect((await get("Tulip")).address, hre.ethers.provider);

    const rate = await tulip.rate();
    const totalSupply = await tulip.totalSupply();

    const tvl = (rate * totalSupply) / 10n ** 18n;

    console.log(" tvl ", ethers.formatUnits(tvl, 6));
}

deposit();
