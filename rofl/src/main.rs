use std::sync::Arc;

use oasis_runtime_sdk::{
    crypto::signature::secp256k1,
    modules::rofl::app::prelude::*,
    types::transaction::Transaction,
    types::address::SignatureAddressSpec,
    Version,
};
use module_evm::types::{Call as EvmCall, SimulateCallQuery};
use rofl_utils::https::agent;
use oasis_runtime_sdk::modules::rofl::app::Environment;
use ethabi::{encode, short_signature, Token, ParamType};
use serde_json::json;
use anyhow::Result;
use dotenvy::dotenv;
use std::env;
const TULIP_CONTRACT_ADDRESS: &str = "0xb4DA4170076Aaf3f8517ce31789d0F55b152be24";
const USDC_ADDRESS: &str = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // Cập nhật USDC thực
const ROFL_APP_ID: &str = "rofl1qqn9xndja7e2pnxhttktmecvwzz0yqwxsquqyxdf"; // Cập nhật sau khi create

struct ThornAgent;

#[async_trait]
impl App for ThornAgent {
    const VERSION: Version = sdk::version_from_cargo!();

    fn id() -> AppId {
        ROFL_APP_ID.into()
    }

    fn consensus_trust_root() -> Option<TrustRoot> {
        None
    }

    async fn run(self: Arc<Self>, env: Environment<Self>) {
        println!("Thorn Agent Started!");
        loop {
            if let Err(e) = self.analyze_and_invest(&env).await {
                println!("Error processing analyze_and_invest: {}", e);
            }
            tokio::time::sleep(std::time::Duration::from_secs(10)).await;
        }
    }
}

impl ThornAgent {
    fn u256_to_bytes(value: ethabi::ethereum_types::U256) -> Vec<u8> {
        let mut buf = [0u8; 32];
        value.to_big_endian(&mut buf);
        buf.to_vec()
    }

    async fn check_usdc_balance(
        &self,
        env: &Environment<Self>,
        caller: ethabi::Address,
    ) -> Result<ethabi::ethereum_types::U256> {
        let balance_of_data = format!(
            "0x70a08231000000000000000000000000{}",
            hex::encode(caller)
        );

        let sdk_pub_key = secp256k1::PublicKey::from_bytes(env.signer().public_key().as_bytes())?;
        let caller_address = module_evm::derive_caller::from_sigspec(
            &SignatureAddressSpec::Secp256k1Eth(sdk_pub_key),
        )?;

        let res: Vec<u8> = env
            .client()
            .query(
                env.client().latest_round().await?.into(),
                "evm.SimulateCall",
                SimulateCallQuery {
                    gas_price: 10_000.into(),
                    gas_limit: 100_000,
                    caller: caller_address,
                    address: Some(USDC_ADDRESS.parse()?),
                    value: 0.into(),
                    data: hex::decode(balance_of_data)?,
                },
            )
            .await?;

        let decoded = ethabi::decode(&[ParamType::Uint(256)], &res)
            .map_err(|e| anyhow::anyhow!("Failed to decode balance: {}", e))?;
        let balance = decoded[0]
            .clone()
            .into_uint()
            .ok_or_else(|| anyhow::anyhow!("Invalid balance"))?;

        Ok(balance)
    }

    async fn analyze_and_invest(&self, env: &Environment<Self>) -> Result<()> {
        let payload = json!({
            "method": "GET",
            "url": "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT",
            "headers": {
                "Content-Type": "application/json"
            }
        })
        .to_string();

        let response: serde_json::Value = agent()
            .post("https://api.binance.com")
            .header("Content-Type", "application/json")
            .header("Host", "api.binance.com")
            .send(&payload)?
            .body_mut()
            .read_json()?;

        let price: f64 = response["price"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("Failed to parse price"))?
            .parse()
            .map_err(|_| anyhow::anyhow!("Failed to parse price"))?;

        let amount = ethabi::ethereum_types::U256::from_dec_str("10000000")?;
        let dest_amount = ethabi::ethereum_types::U256::from_dec_str("9950000")?;
        let dest_chain_id = 11155111;

        if price < 3000.0 {
            let private_key = std::env::var("AGENT_PRIVATE_KEY")?;
            let private_key_bytes = hex::decode(&private_key)?;
            let sdk_pub_key = secp256k1::PublicKey::from_bytes(&private_key_bytes)?;
            let caller = module_evm::derive_caller::from_sigspec(
                &SignatureAddressSpec::Secp256k1Eth(sdk_pub_key),
            )?;
            let ethabi_caller: ethabi::Address = caller.into();

            let balance = self.check_usdc_balance(env, ethabi_caller).await?;
            if balance < amount {
                return Err(anyhow::anyhow!(
                    "Insufficient USDC balance: {} < {}",
                    balance,
                    amount
                ));
            }

            let data = [
                short_signature(
                    "transferToTreasury",
                    &[
                        ParamType::Uint(256),
                        ParamType::Uint(256),
                        ParamType::Uint(256),
                    ],
                )
                .to_vec(),
                encode(&[
                    Token::Uint(amount),
                    Token::Uint(dest_amount),
                    Token::Uint(dest_chain_id.into()),
                ]),
            ]
            .concat();

            let mut tx: Transaction = self.new_transaction(
                "evm.Call",
                EvmCall {
                    address: TULIP_CONTRACT_ADDRESS.parse()?,
                    value: 0.into(),
                    data,
                },
            );
            tx.set_fee_gas(200_000);

            let call_result = env.client().sign_and_submit_tx(env.signer(), tx).await?;
            let tx_hash = match call_result {
                oasis_runtime_sdk::types::transaction::CallResult::Ok(value) => {
                    let bytes = oasis_cbor::to_vec(value);
                    if bytes.len() >= 32 {
                        hex::encode(&bytes[..32])
                    } else {
                        return Err(anyhow::anyhow!("Invalid transaction hash length"));
                    }
                }
                oasis_runtime_sdk::types::transaction::CallResult::Failed { module, code, message } => {
                    return Err(anyhow::anyhow!(
                        "Transaction failed: module={}, code={}, message={}",
                        module,
                        code,
                        message
                    ))
                }
                oasis_runtime_sdk::types::transaction::CallResult::Unknown(data) => {
                    return Err(anyhow::anyhow!("Unknown transaction result: {:?}", data))
                }
            };
            println!(
                "InvestmentDecision: amount={:?}, dest_amount={:?}, dest_chain_id={}, tx_hash=0x{}",
                Self::u256_to_bytes(amount),
                Self::u256_to_bytes(dest_amount),
                dest_chain_id,
                tx_hash
            );
        }

        Ok(())
    }
}

#[derive(Debug, serde::Serialize, serde::Deserialize, oasis_cbor::Encode, oasis_cbor::Decode)]
pub enum Event {
    InvestmentDecision {
        amount: Vec<u8>,
        dest_amount: Vec<u8>,
        dest_chain_id: u64,
        tx_hash: String,
    },
}

impl oasis_runtime_sdk::event::Event for Event {
    fn module_name() -> &'static str {
        "thorn-agent"
    }

    fn code(&self) -> u32 {
        match self {
            Event::InvestmentDecision { .. } => 1,
        }
    }
}

fn main() {
    ThornAgent.start();
}
#[cfg(test)]
mod tests {
    use super::*;
    use mockito::{Server, Matcher};
    use std::env;
    use serde_json::json;

    #[tokio::test]
    async fn test_analyze_and_invest_logic() {
        dotenv().ok();
        env::set_var("FORCE_HTTPS", "false");
        let private_key = env::var("PRIVATE_KEY").expect("PRIVATE_KEY must be set in .env");
        env::set_var("AGENT_PRIVATE_KEY", private_key);

        let mut server = Server::new_async().await;

        let mock = server
            .mock("POST", "/")
            .match_header("Host", "api.binance.com")
            .match_body(Matcher::Json(json!({
                "method": "GET",
                "url": "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT",
                "headers": {
                    "Content-Type": "application/json"
                }
            })))
            .with_status(200)
            .with_body(r#"{"symbol":"ETHUSDT","price":"2500.00"}"#)
            .create_async()
            .await;

        let payload = json!({
            "method": "GET",
            "url": "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT",
            "headers": {
                "Content-Type": "application/json"
            }
        })
        .to_string();

        let response: serde_json::Value = agent()
            .post(&server.url())  // HTTP URL, nhưng sẽ không báo lỗi nếu FORCE_HTTPS = false
            .header("Content-Type", "application/json")
            .header("Host", "api.binance.com")
            .send(&payload)
            .unwrap()
            .body_mut()
            .read_json()
            .unwrap();

        let price: f64 = response["price"].as_str().unwrap().parse().unwrap();
        assert_eq!(price, 2500.0);

        let amount = ethabi::ethereum_types::U256::from_dec_str("10000000").unwrap();
        let dest_amount = ethabi::ethereum_types::U256::from_dec_str("9950000").unwrap();
        let dest_chain_id = 11155111;

        if price < 3000.0 {
            println!(
                "InvestmentDecision: amount={:?}, dest_amount={:?}, dest_chain_id={}, tx_hash=0x0000",
                ThornAgent::u256_to_bytes(amount),
                ThornAgent::u256_to_bytes(dest_amount),
                dest_chain_id
            );
        }

        mock.assert_async().await;
    }
}
