import Link from "next/link";
import { cryptoPaymentGuides } from "@/lib/crypto-payment-guide";
import type { PaymentCurrency } from "@/lib/payment-methods";

export function CryptoPaymentHelp({currency}:{currency:PaymentCurrency}) {
  const guide=cryptoPaymentGuides[currency];
  return <details className="crypto-help">
    <summary>How do I pay with {guide.coin}?</summary>
    <ol>
      <li>Have {guide.coin} ready to send on <strong>{guide.network}</strong>.</li>
      <li>Continue to payment. NOWPayments will show the exact crypto amount, address and timer.</li>
      <li>In your wallet or exchange, choose Send or Withdraw. Copy the address and amount, and select <strong>{guide.shortNetwork}</strong>.</li>
      <li>Check the amount the recipient receives after fees, then send before the timer ends. Return here to track confirmation.</li>
    </ol>
    <p>Not ready to send yet? Get your funds ready first; the payment timer starts when checkout is prepared.</p>
    <Link href={`/how-to-pay#${currency}`} target="_blank" rel="noopener noreferrer">New to crypto? Open the step-by-step guide ↗</Link>
  </details>;
}
