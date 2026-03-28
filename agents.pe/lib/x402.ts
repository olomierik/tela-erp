export const USDC_SOLANA = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const FACILITATOR_URL = "https://x402.org/facilitator";

export function getPaymentConfig() {
  return {
    network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    asset: USDC_SOLANA,
    facilitator: FACILITATOR_URL,
    platformWallet: process.env.PLATFORM_WALLET_ADDRESS || "",
  };
}
