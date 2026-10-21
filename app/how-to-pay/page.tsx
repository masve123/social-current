import type { Metadata } from "next";
import Link from "next/link";
import { cryptoPaymentGuides } from "@/lib/crypto-payment-guide";
import { paymentMethods } from "@/lib/payment-methods";

export const metadata:Metadata={
  title:"How to Pay with Crypto",description:"A simple guide to paying for your Social Current order with USDT or Litecoin, including networks, fees, timers and order tracking.",alternates:{canonical:"/how-to-pay"},
};
export default function HowToPayPage() {
  return <>
    <section className="page-hero page-hero--compact"><div className="shell narrow">
      <span className="eyebrow">Payment help</span><h1>Crypto payment, <em>step by step.</em></h1>
      <p>You send the payment from your wallet or exchange. Continuing from Social Current does not charge you automatically. Card payments are not available yet.</p>
      <p className="payment-guide__keep-open">Keep your checkout tab open while you read this guide. Your entered details stay there.</p>
    </div></section>
    <div className="shell narrow payment-guide">
      <section aria-labelledby="ready-heading"><h2 id="ready-heading">Already have crypto? Four steps.</h2>
        <ol className="payment-guide__steps">
          <li><h3>Choose the coin and network you can send</h3><p>Match the payment option to your wallet or exchange. USDT has several networks: the name must match exactly. Social Current shows the current minimum order before you continue.</p></li>
          <li><h3>Open payment when your funds are ready</h3><p>Review your package, delivery target and email, then choose Continue to payment. On NOWPayments, follow the instructions to view the payment address, exact crypto amount and timer. Your order total is in USD; send the crypto amount shown on that payment page.</p></li>
          <li><h3>Copy, check and send</h3><p>In your wallet or exchange, choose Send or Withdraw. Copy the payment address, choose the matching network and enter the exact amount. Check the recipient address and the amount the recipient will receive after any withdrawal fee. Include a memo or tag only if the payment page explicitly requires one.</p><p>Send while the payment timer is active. Use the address and amount from this payment attempt, not an older order or saved recipient.</p></li>
          <li><h3>Return to check confirmation</h3><p>A wallet saying “sent” does not mean the payment is confirmed yet. Return to Social Current and check the order number shown after checkout. Network confirmation comes first; delivery starts afterwards. You can follow both in <Link href="/track">order tracking</Link>.</p></li>
        </ol>
      </section>
      <details className="payment-guide__new"><summary>I don’t have crypto yet. What do I do?</summary>
        <ol>
          <li>Choose a reputable exchange or wallet service available in your country. Before buying, check that it lets you withdraw one of the exact coin/network combinations below.</li>
          <li>Create your account and complete any required identity checks. Buy the supported coin using a payment method available to you.</li>
          <li>Check the withdrawal minimum, fee and any hold on newly purchased funds. Have enough available to send the full checkout amount after fees. A card purchase can be instant while withdrawals remain on hold.</li>
          <li>Wait until the funds can actually be sent, then return to your Social Current checkout tab. Open the timed payment page only when you are ready to send.</li>
        </ol>
        <p>Buying crypto can add fees and verification steps. Availability and requirements vary by country and provider. You don’t need a separate self-custody wallet if your exchange can withdraw directly on the supported network.</p>
      </details>
      <section aria-labelledby="network-heading"><h2 id="network-heading">Match your selected payment option</h2>
        <nav className="payment-guide__networks" aria-label="Payment network guides">{paymentMethods.map(method=><a key={method.id} href={`#${method.id}`}>{method.label}</a>)}</nav>
        {paymentMethods.map(method=>{const guide=cryptoPaymentGuides[method.id];return <section className="payment-guide__network" id={method.id} key={method.id}>
          <h3>{method.label}</h3><p><strong>Coin:</strong> {guide.coin} · <strong>Network:</strong> {guide.network}</p><p>{guide.preparation}</p><p>{guide.walletFee}</p>
        </section>;})}
        <p>A USDT balance on one network cannot be used for another network just by changing its label. If you’re unsure which network you have, check with your wallet or exchange before sending.</p>
      </section>
      <section aria-labelledby="stuck-heading"><h2 id="stuck-heading">If something interrupts payment</h2>
        <details><summary>The timer expired and I haven’t sent anything</summary><p>Don’t send to an expired payment. Open your order in <Link href="/track">tracking</Link> and choose “Review details and try again” if offered. Check your saved details and current total before starting the replacement payment.</p></details>
        <details><summary>I already sent funds, but the order is still waiting</summary><p>Don’t pay again. Check whether the transfer is still pending in your wallet or exchange, then check order tracking. If the order expired, shows an incomplete payment, or doesn’t update after your transfer is confirmed, <Link href="/contact">contact support</Link> with the order number and transaction reference.</p></details>
        <details><summary>I sent the wrong amount or used a different network</summary><p>Stop before sending more. Contact support with your order number and transaction reference so the payment can be checked. A transfer on the wrong network may be unrecoverable; never assume another transfer will fix it.</p></details>
        <details><summary>I can’t use any of these payment methods</summary><p>Choose only a coin and network your wallet or exchange supports. If none works for you, <Link href="/contact">contact us</Link>. Card payment is not available while our fiat payment setup is pending.</p></details>
      </section>
      <p className="payment-guide__security">We never need your wallet recovery phrase, private key, social account password or login code. Support will not ask you for them.</p>
      <div className="hero__actions"><Link className="button button--coral" href="/order">Open checkout</Link><Link className="button button--cream" href="/track">Track an existing order</Link></div>
    </div>
  </>;
}
