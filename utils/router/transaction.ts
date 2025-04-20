import axios from "axios";
// import { ethers } from "ethers";
import * as dotenv from "dotenv";
const PATH_FINDER_API_URL = "https://k8-testnet-pf.routerchain.dev/api"; //testnet
// const PATH_FINDER_API_URL = "https://api-beta.pathfinder.routerprotocol.com/api/v2/transaction"; //mainnet
dotenv.config();
export const getTransaction = async (quoteData: any, senderAddress: string, receiverAddress: string, refundAddress: string) => {
    const endpoint = "v2/transaction";
    const txDataUrl = `${PATH_FINDER_API_URL}/${endpoint}`;
    
    try {
        const res = await axios.post(txDataUrl, {
            ...quoteData,
            senderAddress: senderAddress, 
            receiverAddress: receiverAddress,
            refundAddress: refundAddress, 
        });
        return res.data;
    } catch (e) {
        console.error(`Fetching tx data from pathfinder: ${e}`);
        return null;
    }
};
// const testTxN = async () => {
//     const provider = new ethers.JsonRpcProvider("https://rpc.ankr.com/polygon_mumbai", 80001);
//     const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  
//     const senderAddress = wallet.address;
//     const receiverAddress = "0x2B351b7bbC86ab5DF433539fE907f8EE4DE1B964";
//     const refundAddress = "0x2B351b7bbC86ab5DF433539fE907f8EE4DE1B964";
  
//     const quoteData = {
//         "flowType": "trustless",
//         "isTransfer": true,
//         "isWrappedToken": false,
//         "allowanceTo": "0x190fC3352b361852E6abFE48d34C79473fF131D3",
//         "bridgeFee": {},
//         "source": {
//           "chainId": "43113",
//           "asset": {
//             "decimals": 6,
//             "symbol": "USDT",
//             "name": "USDT",
//             "chainId": "43113",
//             "address": "0xb452b513552aa0B57c4b1C9372eFEa78024e5936",
//             "resourceID": "usdi",
//             "isMintable": false,
//             "isWrappedAsset": false
//           },
//           "stableReserveAsset": {
//             "decimals": 6,
//             "symbol": "USDT",
//             "name": "USDT",
//             "chainId": "43113",
//             "address": "0xb452b513552aa0B57c4b1C9372eFEa78024e5936",
//             "resourceID": "usdi",
//             "isMintable": false,
//             "isWrappedAsset": false
//           },
//           "tokenAmount": "19399929",
//           "stableReserveAmount": "19399929",
//           "path": [],
//           "flags": [],
//           "priceImpact": "0",
//           "bridgeFeeAmount": "600071",
//           "tokenPath": "",
//           "dataTx": []
//         },
//         "destination": {
//           "chainId": "43113",
//           "asset": {
//             "decimals": 18,
//             "symbol": "ETH",
//             "name": "ETH",
//             "chainId": "43113",
//             "address": "0xce811501ae59c3E3e539D5B4234dD606E71A312e",
//             "resourceID": "ethi",
//             "isMintable": false,
//             "isWrappedAsset": false
//           },
//           "stableReserveAsset": {
//             "decimals": 18,
//             "symbol": "ETH",
//             "name": "ETH",
//             "chainId": "43113",
//             "address": "0xce811501ae59c3E3e539D5B4234dD606E71A312e",
//             "resourceID": "ethi",
//             "isMintable": false,
//             "isWrappedAsset": false
//           },
//           "tokenAmount": "199999997999763",
//           "stableReserveAmount": "199999997999763",
//           "path": [],
//           "flags": [],
//           "priceImpact": "0",
//           "tokenPath": "",
//           "dataTx": []
//         },
//         "fromTokenAddress": "0xb452b513552aa0B57c4b1C9372eFEa78024e5936",
//         "toTokenAddress": "0xce811501ae59c3E3e539D5B4234dD606E71A312e",
//         "partnerId": "0",
//         "estimatedTime": 40,
//         "slippageTolerance": 1
//       };
  
//     const txResponse = await getTransaction(quoteData, senderAddress, receiverAddress, refundAddress);
  
//     if (!txResponse || !txResponse.txn) {
//       console.error("Transaction data not returned from tx.");
//       return;
//     }
  
//     console.log("Tx data :");
//     console.log("Sender:", senderAddress);
//     console.log("Receiver:", receiverAddress);
//     console.log("Refund:", refundAddress);
//     console.log("Txn Request:", txResponse.txn);
//   };
//   testTxN();
