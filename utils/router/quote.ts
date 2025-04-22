import axios from "axios";
// const PATH_FINDER_API_URL = "https://api-beta.pathfinder.routerprotocol.com/api"; //mainnet
const PATH_FINDER_API_URL = "https://k8-testnet-pf.routerchain.dev/api/v2/quote"; //testnet
const getQuote = async (params: any) => {
    const endpoint = "v2/quote";
    const quoteUrl = `${PATH_FINDER_API_URL}/${endpoint}`;
    try {
        const res = await axios.get(quoteUrl, { params });
        return res.data;
    } catch (e) {
        console.error(`Fetching quote data from pathfinder: ${e}`);
    }
};
export const getQuoteRoute = async (params: any) => {
    const paramsQuote = {
        fromTokenAddress: params.fromTokenAddress,
        toTokenAddress: params.toTokenAddress,
        amount: params.amount,
        fromTokenChainId: params.fromTokenChainId.toString(),
        toTokenChainId: params.toTokenChainId.toString(),
        partnerId: 0,
    };
    return getQuote(paramsQuote);
};
