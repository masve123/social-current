"use client";

import { FormEvent, useState } from "react";
import { LoaderCircle, RefreshCcw, Search } from "lucide-react";

type AdminOrder = {
  public_id: string;
  email: string;
  service_slug: string;
  offer_id: string;
  quantity: number;
  amount_usd: string;
  payment_status: string;
  fulfillment_status: string;
  wholesale_cost: string | null;
  failure_reason: string | null;
  created_at: string;
};

export function AdminOrders() {
  const [secret, setSecret] = useState("");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<{ balance: string; currency: string } | null>(null);

  async function load(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/orders", { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Orders could not be loaded.");
      setOrders(data.orders);
      setBalance(data.supplier_balance || null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Orders could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function retry(order: AdminOrder) {
    const reviewedProvider = order.fulfillment_status === "manual_review";
    if (reviewedProvider && !window.confirm("Confirm that you checked the SMM World dashboard and found no matching supplier order. Retrying without checking can create a duplicate.")) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
        body: JSON.stringify({ order: order.public_id, reviewedProvider }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The order could not be retried.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The order could not be retried.");
      setLoading(false);
    }
  }

  return (
    <div className="admin-orders">
      <form className="admin-auth" onSubmit={load}>
        <label htmlFor="admin-secret">Fulfillment secret</label>
        <div className="input-button">
          <input id="admin-secret" type="password" value={secret} onChange={(event) => setSecret(event.target.value)} autoComplete="current-password" required />
          <button className="button button--ink" type="submit" disabled={loading}>{loading ? <LoaderCircle className="spin" /> : <Search />} Load queue</button>
        </div>
      </form>
      {error && <p className="form-message form-message--error">{error}</p>}
      {balance && <p className="admin-balance">SMM World balance <strong>{balance.balance} {balance.currency}</strong></p>}
      {!loading && orders.length === 0 && secret && !error && <p className="admin-empty">No orders currently need attention.</p>}
      {orders.map((order) => (
        <article className="admin-order" key={order.public_id}>
          <div>
            <span>{order.payment_status} · {order.fulfillment_status}</span>
            <h2>{order.public_id}</h2>
            <p>{order.service_slug} / {order.offer_id} · {order.quantity.toLocaleString()} · ${Number(order.amount_usd).toFixed(2)}</p>
            {order.failure_reason && <small>{order.failure_reason}</small>}
          </div>
          <button className="button button--cream" type="button" disabled={loading || !["queued_supplier_funds", "manual_review"].includes(order.fulfillment_status) || !["confirmed", "sending", "finished"].includes(order.payment_status)} onClick={() => retry(order)}><RefreshCcw /> {order.fulfillment_status === "manual_review" ? "Checked — retry" : "Retry"}</button>
        </article>
      ))}
    </div>
  );
}
