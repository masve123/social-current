import type { StoredOrder } from "@/lib/order-store";
import { site } from "@/lib/site";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] || character);
}

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: `Social Current <orders@getsocialcurrent.com>`,
      to: [to],
      subject,
      html,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Order email failed (${response.status}).`);
}

export async function sendOrderUpdate(order: StoredOrder, heading: string, message: string) {
  const trackingUrl = `${site.url}/track?order=${encodeURIComponent(order.public_id)}`;
  await sendEmail(order.email, `${heading} — ${order.public_id}`, `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#20211e">
      <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase">Social Current</p>
      <h1 style="font-family:Georgia,serif;font-weight:400">${escapeHtml(heading)}</h1>
      <p>${escapeHtml(message)}</p>
      <p><strong>Order:</strong> ${escapeHtml(order.public_id)}<br><strong>Total:</strong> $${Number(order.amount_usd).toFixed(2)}</p>
      <p><a href="${trackingUrl}" style="display:inline-block;padding:12px 18px;background:#20211e;color:white;text-decoration:none">Track your order</a></p>
    </div>
  `);
}

export async function sendSupplierBalanceAlert(order: StoredOrder, reason: string) {
  await sendEmail(site.email, `Supplier balance alert — ${order.public_id}`, `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#20211e">
      <h1 style="font-family:Georgia,serif;font-weight:400">A paid order is queued</h1>
      <p>${escapeHtml(reason)}</p>
      <p><strong>Order:</strong> ${escapeHtml(order.public_id)}<br><strong>Retail:</strong> $${Number(order.amount_usd).toFixed(2)}</p>
    </div>
  `);
}

export async function sendFulfillmentReviewAlert(order: StoredOrder) {
  await sendEmail(site.email, `Fulfillment review needed — ${order.public_id}`, `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#20211e">
      <h1 style="font-family:Georgia,serif;font-weight:400">Check the supplier dashboard</h1>
      <p>${escapeHtml(order.failure_reason || "The supplier submission may have been interrupted.")}</p>
      <p><strong>Order:</strong> ${escapeHtml(order.public_id)}</p>
      <p>Resolve the issue before retrying. If the supplier request might have reached SMM World, check for a matching order first.</p>
    </div>
  `);
}

export async function sendFulfillmentRetryAlert(order: StoredOrder) {
  await sendEmail(site.email, `Supplier connection needs attention — ${order.public_id}`, `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#20211e">
      <h1 style="font-family:Georgia,serif;font-weight:400">A paid order is waiting for the supplier</h1>
      <p>${escapeHtml(order.failure_reason || "The supplier check did not complete.")}</p>
      <p><strong>Order:</strong> ${escapeHtml(order.public_id)}</p>
      <p>No supplier order request was sent. The order can be retried safely.</p>
    </div>
  `);
}
