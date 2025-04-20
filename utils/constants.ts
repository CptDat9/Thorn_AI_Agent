import { arbitrum } from "../typechain-types/contracts/modules";

export const CHAINID = {
    arbitrum: 42161,
    sepolia: 11155111,
    sapphire_testnet: 23295,
    sapphire_mainnet: 23294,
};

export const ADDRESSES = {
    arbitrum: {
        //https://arbiscan.io/address/0x9c4ec768c28520b50860ea7a15bd7213a9ff58bf
        compoundcUSDCv3Token: "0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf",

        compoundV3Module: "0x711b7b5111bcb133EA262f4a952295eD412BbF6f",
        // https://arbiscan.io/address/0xcFAb3dBE538d557cf6827B7914e10a103D7BB8f9
        treasury: "0xcFAb3dBE538d557cf6827B7914e10a103D7BB8f9",
        //https://arbiscan.io/token/0xaf88d065e77c8cc2239327c5edb3a432268e5831
        USDC: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
        //https://docs.routerprotocol.com/develop/asset-transfer-via-nitro/supported-chains-tokens/
        assetForwarder: "0xef300fb4243a0ff3b90c8ccfa1264d78182adaa4",
    },
    sepolia: {
        USDC: "0x17EdBE85fed8c381a7cACf37c4FE623825C98E73",
        assetForwarder: "0xF92eCbC5B3C2E4F5C5462aeba2165E81073FAfAE",
    },
    sapphire_testnet: {
        USDC: "0x01D969e5de0534624C11D0452eB07a20596A54E2",
        assetForwarder: "0xC948a7EDA6657D355b6c3212BdB0d33901fBDc28",
    },
    sapphire_mainnet: {
        tulip: "0xcFAb3dBE538d557cf6827B7914e10a103D7BB8f9",
        //https://explorer.oasis.io/mainnet/sapphire/address/0x97eec1c29f745dC7c267F90292AA663d997a601D
        USDC: "0x97eec1c29f745dc7c267f90292aa663d997a601d",
        //https://docs.routerprotocol.com/develop/asset-transfer-via-nitro/supported-chains-tokens/
        assetForwarder: "0x21c1e74caadf990e237920d5515955a024031109",
    },
};
