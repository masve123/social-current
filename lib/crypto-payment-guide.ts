import type { PaymentCurrency } from "@/lib/payment-methods";

export const cryptoPaymentGuides: Record<PaymentCurrency, {
  coin: string; network: string; shortNetwork: string; preparation: string; walletFee: string;
}> = {
  usdtbsc: {
    coin: "USDT", network: "BNB Smart Chain (BSC / BEP20)", shortNetwork: "BSC / BEP20",
    preparation: "Your wallet or exchange must support sending USDT on BNB Smart Chain. USDT on Ethereum or Tron uses a different network.",
    walletFee: "If you send from a self-custody wallet, you normally also need a small amount of BNB on BNB Smart Chain for the network fee. An exchange shows its own withdrawal fee.",
  },
  usdttrc20: {
    coin: "USDT", network: "Tron (TRC20)", shortNetwork: "Tron / TRC20",
    preparation: "Your wallet or exchange must support sending USDT on Tron. USDT on Ethereum or BNB Smart Chain uses a different network.",
    walletFee: "If you send from a self-custody wallet, you normally also need TRX or available Tron network resources for the network fee. An exchange shows its own withdrawal fee.",
  },
  ltc: {
    coin: "LTC", network: "Litecoin", shortNetwork: "Litecoin",
    preparation: "Your wallet or exchange must support sending native LTC on the Litecoin network. Do not select a wrapped version on Ethereum or BNB Smart Chain.",
    walletFee: "Your wallet or exchange shows the Litecoin sending fee. Check that the amount the recipient receives still matches the payment page.",
  },
};
