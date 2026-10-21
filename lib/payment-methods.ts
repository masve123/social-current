export const paymentMethods = [
  { id: "usdtbsc", label: "USDT on BNB Smart Chain", network: "BSC network", note: "Send USDT on the BNB Smart Chain network only." },
  { id: "usdttrc20", label: "USDT on Tron", network: "TRC20 network", note: "Send USDT on the Tron (TRC20) network only." },
  { id: "ltc", label: "Litecoin", network: "Litecoin network", note: "Send LTC on the Litecoin network only." },
] as const;

export type PaymentCurrency = typeof paymentMethods[number]["id"];

export function isPaymentCurrency(value: unknown): value is PaymentCurrency {
  return paymentMethods.some((method) => method.id === value);
}
