import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import dotenv from "dotenv";

dotenv.config();

const TEST_HDWALLET = {
  mnemonic: "test test test test test test test test test test test junk",
  path: "m/44'/60'/0'/0",
  initialIndex: 0,
  count: 20,
  passphrase: "",
};

const loadPrivateKeys = (): string[] => {
  const keys = [];
  if (process.env.PRIVATE_KEY) keys.push(process.env.PRIVATE_KEY);
  let index = 1;
  while (process.env[`PRIVATE_KEY_${index}`]) {
      keys.push(process.env[`PRIVATE_KEY_${index}`]);
      index++;
  }
  return keys.filter((key): key is string => key !== undefined);
};

const accounts = loadPrivateKeys().length > 0 ? loadPrivateKeys() : TEST_HDWALLET;

const { INFURA_KEY } = process.env;

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
      hardhat: {
          chainId: 31337,
          gasPrice: 100e9,
          live: false,
          deploy: ["deploy/hardhat"],
      },
      arbitrum: {
          url: `https://arb1.arbitrum.io/rpc`,
          deploy: ["deploy/arbitrum"],
          live: true,
          accounts,
      },
      arbitrum_folk: {
          url: `http://0.0.0.0:9000/`,
          deploy: ["deploy/arbitrum_folk"],
          live: true,
      },
      sapphire_testnet: {
          url: "https://testnet.sapphire.oasis.dev",
          live: true,
          accounts,
          deploy: ["deploy/sapphire_testnet"],
      },
      sapphire_mainnet: {
          url: "https://sapphire.oasis.dev",
          live: true,
          accounts,
          deploy: ["deploy/sapphire_mainnet"],
      },
      eth_sepolia: {
          url: `https://sepolia.infura.io/v3/${INFURA_KEY}`,
          live: true,
          deploy: ["deploy/eth_sepolia"],
          accounts,
      },
  },
  solidity: {
      compilers: [
          {
              version: "0.8.24",
              settings: {
                  optimizer: {
                      enabled: true,
                      runs: 200,
                  },
                  viaIR: true,
              },
          },
      ],
  },
  gasReporter: {
      currency: "USD",
      gasPrice: 21,
      enabled: false,
  },
  mocha: {
      timeout: 200000,
      require: ["dd-trace/ci/init"],
  },
  namedAccounts: {
      deployer: {
          default: 0,
          eth_sepolia: 5,
          sapphire_testnet: 5,
      },
      agent: {
          default: 1,
          eth_sepolia: 5,
          sapphire_testnet: 5,
      },
      government: {
          default: 2,
          eth_sepolia: 5,
          sapphire_testnet: 5,
      },
      beneficiary: {
          default: 3,
          eth_sepolia: 5,
          sapphire_testnet: 5,
      },
      updater: {
          default: 4,
          eth_sepolia: 5,
          sapphire_testnet: 5,
      },
      user: {
          default: 5,
          eth_sepolia: 4,
          sapphire_testnet: 4,
      },
  },
};
export default config;
