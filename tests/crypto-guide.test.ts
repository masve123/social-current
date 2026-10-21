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
