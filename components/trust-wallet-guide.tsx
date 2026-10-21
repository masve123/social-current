"use client";

import Link from "next/link";
import type { PaymentCurrency } from "@/lib/payment-methods";

type Props = {
  currency?: PaymentCurrency;
  onChooseLitecoin?: () => void;
  disabled?: boolean;
  ready?: boolean;
  amountUsd?: number;
};

export function TrustWalletGuide({currency,onChooseLitecoin,disabled=false,ready=true,amountUsd}:Props) {
  const inCheckout=currency!==undefined;
  const litecoinSelected=!inCheckout || currency==="ltc";
  const canShowSteps=litecoinSelected && ready;
  return <details className="trust-wallet-guide" id="trust-wallet-guide" open={!inCheckout}>
    <summary>First time? Follow the Trust Wallet + Litecoin guide</summary>
    <p>One mobile wallet, one coin: buy Litecoin (LTC), then send it to pay for your order. The sending fee is also paid in LTC, so you don’t need a second coin.</p>
    {!litecoinSelected && <div className="trust-wallet-guide__selection">
      <p>This walkthrough uses <strong>Litecoin</strong>. Select it here before buying anything.</p>
      {onChooseLitecoin && <button className="button button--cream" type="button" disabled={disabled} onClick={onChooseLitecoin}>Use Litecoin for this order</button>}
    </div>}
    {litecoinSelected && !ready && <p role="status">First, check the payment availability message and choose a package that meets the current minimum. Don’t buy crypto for this order until its payment option is available.</p>}
    {canShowSteps && <>
      {inCheckout && <p className="trust-wallet-guide__selected" role="status"><strong>Litecoin selected.</strong>{typeof amountUsd==="number" && Number.isFinite(amountUsd) && amountUsd>0 ? ` Your order is $${amountUsd.toFixed(2)} USD. Wallet purchase and sending fees are extra.` : " Review your order total before buying."}</p>}
      <ol className="trust-wallet-guide__steps">
        <li><strong>Install the mobile app.</strong> Open <a href="https://trustwallet.com/download" target="_blank" rel="noopener noreferrer">Trust Wallet’s official download page ↗</a> on your phone and use its App Store or Google Play link.</li>
        <li><strong>Create your wallet.</strong> Open Trust Wallet → <strong>Create a new wallet</strong>. Follow the passcode and backup prompts. Keep your recovery phrase private; never enter it on Social Current.</li>
        <li><strong>Buy Litecoin.</strong> In Trust Wallet, tap <strong>Buy</strong> → search <strong>Litecoin (LTC)</strong> → choose the asset on the <strong>Litecoin</strong> network. Enter your purchase amount, then choose an available provider and payment method, such as a card or Apple Pay if offered. Complete the provider’s verification and purchase prompts.</li>
        <li><strong>Wait until your LTC is ready to send.</strong> Check that it has arrived in Trust Wallet and is spendable. Its value must cover your order plus the sending fee. Only then return to this checkout, select <strong>Litecoin</strong> and press <strong>Continue to payment</strong>.</li>
        <li><strong>Copy the payment details.</strong> On NOWPayments, use <strong>Litecoin (LTC)</strong>. Copy the current payment address and the exact <strong>LTC amount</strong>. Keep that page open and check its timer.</li>
        <li><strong>Send from Trust Wallet.</strong> Open <strong>Litecoin (LTC)</strong> → <strong>Send</strong>. Paste the copied address and enter the exact amount in <strong>LTC, not USD</strong>. Don’t use Max. Review the recipient amount and network fee, then confirm only while the payment timer is active. Leave enough LTC for the fee.</li>
        <li><strong>Check your order.</strong> Return to Social Current and open <Link href="/track">order tracking</Link> with your order number. Wait for payment confirmation before delivery. If you already sent the payment, don’t send it again.</li>
      </ol>
      <p className="trust-wallet-guide__costs">Before buying, review the provider’s total fees, minimum and delivery time. Its minimum may exceed your order total; unused LTC stays in your wallet. If no provider is available or your funds are on hold, don’t open the timed payment yet. Button labels can vary by app version and country.</p>
    </>}
    {!canShowSteps && <Link href="/how-to-pay#trust-wallet-guide" target="_blank" rel="noopener noreferrer">Read the full wallet walkthrough first ↗</Link>}
    <p className="trust-wallet-guide__sources">Independent instructions, based on <a href="https://trustwallet.com/buy-crypto/litecoin" target="_blank" rel="noopener noreferrer">Trust Wallet’s Litecoin guide ↗</a>. No wallet connection or recovery phrase is needed on this site.</p>
  </details>;
}
