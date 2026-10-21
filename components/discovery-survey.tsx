"use client";

import { useEffect, useRef, useState } from "react";
import { discoverySources } from "@/lib/discovery-survey";

export function DiscoverySurvey({ order }: { order: string }) {
  const [available, setAvailable] = useState(false);
  const [choice, setChoice] = useState("");
  const [other, setOther] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "skipped">("idle");
  const [error, setError] = useState("");
  const saving = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/order/discovery?order=${encodeURIComponent(order)}`, { cache: "no-store", signal: controller.signal })
      .then(async response => { if (response.ok) { const data = await response.json(); if (!controller.signal.aborted) setAvailable(data.available === true); } })
      .catch(() => undefined);
    return () => controller.abort();
  }, [order]);

  async function save(source: string) {
    if (saving.current) return;
    saving.current = true;
    setChoice(source);
    setState("saving");
    setError("");
    try {
      const response = await fetch("/api/order/discovery", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order, source, ...(source === "other" ? { other: other.trim() } : {}) }),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error("Could not save");
      setState("saved");
    } catch {
      setState("idle");
      setError("We couldn’t save that. You can try again or skip — your order is already paid.");
    } finally { saving.current = false; }
  }

  if (!available || state === "skipped") return null;
  if (state === "saved") return <p className="discovery-survey__thanks" role="status">Thanks for letting us know!</p>;
  return (
    <section className="discovery-survey" aria-label="Optional feedback">
      <h3>Where did you find us?</h3>
      <p>Optional · Pick one. Your payment is confirmed and delivery does not depend on your answer.</p>
      <div className="discovery-survey__choices" aria-label="Choose one source">
        {discoverySources.map(source => <button type="button" key={source.id} disabled={state === "saving"}
          aria-pressed={choice === source.id}
          onClick={() => { if (source.id === "other") { setChoice("other"); setError(""); } else void save(source.id); }}>
          {source.label}
        </button>)}
      </div>
      {choice === "other" && <form onSubmit={event => { event.preventDefault(); void save("other"); }}>
        <label>Where did you hear about us?<input value={other} onChange={event => setOther(event.target.value)} maxLength={200} required disabled={state === "saving"} placeholder="Tell us in a few words" /></label>
        <button type="submit" className="button button--ink" disabled={state === "saving" || !other.trim()}>Save answer</button>
      </form>}
      {state === "saving" && <p role="status">Saving your answer…</p>}
      {error && <p role="status">{error}</p>}
      <button className="discovery-survey__skip" type="button" onClick={() => setState("skipped")}>Skip</button>
    </section>
  );
}
