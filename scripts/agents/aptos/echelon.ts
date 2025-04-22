import {
    createSurfClient,
    createViewPayload,
    DefaultABITable,
} from "@thalalabs/surf";
import { fp64ToFloat } from "./utils/fp64ToFloat";
// import { hexToBytes } from "./utils/hexToBytes";
import { LENDING_ASSETS_ABI } from "./abi/lending_assets";
// import { FARMING_LENDING_ABI } from "./abi/farming_lending";
// import { LENDING_SCRIPTS_ABI } from "./abi/lending_scripts";
import { Aptos } from "@aptos-labs/ts-sdk";
import { RESTClient } from "@initia/initia.js";
import { Client } from "@thalalabs/surf/build/types/core/Client";
import { aw } from "@aptos-labs/ts-sdk/dist/common/accountAddress-5ltp27oM";
export class EchelonClient {
    aptos: Aptos | RESTClient;
    address: `0x${string}`;
    surfClient: Client<DefaultABITable>;
    constructor(aptos: Aptos | RESTClient, contractAddress: `0x${string}`) {
        this.aptos = aptos;
        this.surfClient = createSurfClient(this.aptos);
        this.address = contractAddress;
    }
    // Returns the borrow anual percentage rate (APR) of specific market
    async getBorrowApr(market: string): Promise<number> {
        const result = await this.surfClient.view({
            payload: createViewPayload(LENDING_ASSETS_ABI, {
                function: "borrow_interest_rate",
                functionArguments: [market as `0x${string}`],
                typeArguments: [],
                address: this.address,
            }),
        });
        return fp64ToFloat(BigInt((result[0] as { v: string }).v));
    }
    // Returns the supply anual percentage rate (APR) of specific market
    async getSupplyApr(market: string): Promise<number> {
        const result = await this.surfClient.view({
            payload: createViewPayload(LENDING_ASSETS_ABI, {
                function: "supply_interest_rate",
                functionArguments: [market as `0x${string}`],
                typeArguments: [],
                address: this.address,
            })
        })
        return fp64ToFloat(BigInt((result[0] as { v: string }).v));
    }
    // Returns all markets
    async getAllMarkets(): Promise<string[]> {
        const result = await this.surfClient.view({
            payload: createViewPayload(LENDING_ASSETS_ABI, {
                function: "market_objects",
                functionArguments: [],
                typeArguments: [],
                address: this.address,
            }),
        });
        const markets = result[0].map((item: { inner: string }) => item.inner);
        // console.log("Danh sách markets:", markets);
        return markets;
    }
    // Returns coin lists that market supported.
    async getMarketCoin(market: string): Promise<string> {
        try {
            const result = await this.surfClient
                .useABI(LENDING_ASSETS_ABI, this.address)
                .resource.CoinInfo({
                    account: market as `0x${string}`,
                    typeArguments: [],
                });
            return result.type_name;
        } catch (e) {
            const result = await this.surfClient
                .useABI(LENDING_ASSETS_ABI, this.address)
                .resource.FungibleAssetInfo({
                    account: market as `0x${string}`,
                    typeArguments: [],
                });
            return (result.metadata as { inner: string }).inner;
        }
    }
}
const main = async () => {
    const aptos = new Aptos({ fullnode: "https://fullnode.mainnet.aptoslabs.com/v1" });
    const contractAddress = "0xc6bc659f1649553c1a3fa05d9727433dc03843baac29473c817d06d39e7621ba";
    const echelon = new EchelonClient(aptos, contractAddress);
    const usdcMarkets: { market: string; supplyApr: number; borrowApr: number }[] = [];
    try {
        const markets = await echelon.getAllMarkets();
        console.log("Danh sách markets:", markets);
        for (const market of markets) {
            console.log("Danh sách market:", market);
            const coin = await echelon.getMarketCoin(market);
            console.log("Danh sách coins ma market do ho tro:", coin);
            const borrowApr = await echelon.getBorrowApr(market);
            const supplyApr = await echelon.getSupplyApr(market);
            console.log("Borrow APR:", (borrowApr*100), "%");
            console.log("Supply APR:", (supplyApr*100), "%");
        }
    } catch (err) {
        console.error("Lỗi:", err);
    }

};

main().catch((err) => console.error("Lỗi all:", err));