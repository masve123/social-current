"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";

export function SupportForm({ initialOrder = "" }: { initialOrder?: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [orderNumber, setOrderNumber] = useState(initialOrder);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, orderNumber, message }),
      });
      const data = await response.json() as { request?: string; error?: string };
      if (!response.ok || !data.request) throw new Error(data.error || "Your message could not be saved.");
      setResult(data.request);
      setMessage("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your message could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) return (
    <div className="contact-form contact-form--success" role="status">
      <span className="eyebrow">Message received</span>
      <h2>We have your message.</h2>
      <p>Your support reference is <strong>{result}</strong>. Keep it for follow-up.</p>
      <button className="button button--cream" type="button" onClick={() => setResult("")}>Send another message</button>
    </div>
  );

  return (
    <form className="contact-form" onSubmit={submit}>
      <label><span>Name</span><input name="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} autoComplete="name" required /></label>
      <label><span>Email</span><input name="email" value={email} onChange={(event) => setEmail(event.target.value)} type="email" maxLength={254} autoComplete="email" required /></label>
      <label><span>Order number <small>(optional)</small></span><input name="orderNumber" value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} maxLength={80} placeholder="SC-…" /></label>
      <label><span>How can we help?</span><textarea name="message" value={message} onChange={(event) => setMessage(event.target.value)} minLength={10} maxLength={5000} rows={6} required /></label>
      {error && <p className="contact-form__error" role="alert">{error}</p>}
      <button className="button button--coral" type="submit" disabled={submitting}>{submitting ? <><LoaderCircle className="spin" /> Sending…</> : <>Send message <ArrowRight aria-hidden="true" /></>}</button>
    </form>
  );
}
