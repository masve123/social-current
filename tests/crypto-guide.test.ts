import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { cryptoPaymentGuides } from "../lib/crypto-payment-guide";
import { paymentMethods } from "../lib/payment-methods";
import { CryptoPaymentHelp } from "../components/crypto-payment-help";
import HowToPayPage from "../app/how-to-pay/page";

test("every checkout currency has matching payment guidance and a working anchor",()=>{
  const page=renderToStaticMarkup(createElement(HowToPayPage));
  for(const method of paymentMethods) {
    const guide=cryptoPaymentGuides[method.id];
    assert.ok(guide);
    assert.ok(page.includes(`id="${method.id}"`));
    const help=renderToStaticMarkup(createElement(CryptoPaymentHelp,{currency:method.id}));
    assert.ok(help.includes(`/how-to-pay#${method.id}`));
    assert.ok(help.includes('target="_blank"'));
    assert.ok(help.includes('rel="noopener noreferrer"'));
    assert.ok(help.includes(guide.coin));
    assert.ok(help.includes(guide.shortNetwork));
  }
});

test("beginner wallet instructions cannot direct a USDT checkout to buy Litecoin",async()=>{
  const {TrustWalletGuide}=await import("../components/trust-wallet-guide");
  for(const currency of ["usdtbsc","usdttrc20"] as const) {
    const html=renderToStaticMarkup(createElement(TrustWalletGuide,{currency,onChooseLitecoin:()=>undefined,amountUsd:15.59}));
    assert.ok(html.includes("Use Litecoin for this order"));
    assert.ok(!html.includes("trust-wallet-guide__steps"));
    assert.ok(!html.includes("trust-wallet-guide__selected"));
  }
});
test("wallet buying steps wait for an available Litecoin checkout",async()=>{
  const {TrustWalletGuide}=await import("../components/trust-wallet-guide");
  const blocked=renderToStaticMarkup(createElement(TrustWalletGuide,{currency:"ltc",ready:false}));
  assert.ok(!blocked.includes("trust-wallet-guide__steps"));
  const ready=renderToStaticMarkup(createElement(TrustWalletGuide,{currency:"ltc",ready:true,amountUsd:15.59}));
  assert.ok(ready.includes("trust-wallet-guide__steps"));
  assert.ok(ready.includes("$15.59 USD"));
  assert.ok(ready.includes("LTC, not USD"));
  assert.ok(ready.includes('href="https://trustwallet.com/download"'));
  assert.ok(!ready.includes('href="https://buy.'));
});
