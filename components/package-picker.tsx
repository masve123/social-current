"use client";

import Link from "next/link";
import { Check, Clock3, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { calculatePrice, type Service } from "@/lib/services";
import { getStandardCheckoutMinimumQuantity } from "@/lib/checkout-pricing";

export function PackagePicker({ service }: { service: Service }) {
  const minQuantity = getStandardCheckoutMinimumQuantity(service);
  const presets = useMemo(() => {
    const values = [service.baseQuantity / 2, service.baseQuantity, service.baseQuantity * 2.5, service.baseQuantity * 5];
    return [...new Set(values.map((value) => Math.max(minQuantity, Math.min(service.max, Math.round(value / service.step) * service.step))))];
  }, [service, minQuantity]);
  const [quantity, setQuantity] = useState(Math.max(service.baseQuantity, minQuantity));
  const price = calculatePrice(service, quantity);

  return (
    <aside className="picker" aria-label={`${service.shortTitle} package picker`}>
      <div className="picker__header">
        <span>Choose your package</span>
        <span className="status-dot">Available now</span>
      </div>
      <div className="picker__presets">
        {presets.map((preset) => (
          <button
            className={quantity === preset ? "active" : ""}
            type="button"
            key={preset}
            onClick={() => setQuantity(preset)}
          >
            <strong>{preset.toLocaleString()}</strong>
            <span>{service.metric}</span>
          </button>
        ))}
      </div>
      <label className="range-label" htmlFor="quantity">
        <span>Custom amount</span><strong>{quantity.toLocaleString()}</strong>
      </label>
      <input
        id="quantity"
        className="range"
        type="range"
        min={minQuantity}
        max={service.max}
        step={service.step}
        value={quantity}
        onChange={(event) => setQuantity(Number(event.target.value))}
      />
      <div className="picker__total"><span>Total</span><strong>${price.toFixed(2)}</strong></div>
      <p className="checkout-note">We cover payment processing fees. Your wallet may charge a fee to send crypto.</p>
      <Link className="button button--coral button--wide" href={`/order?service=${service.slug}&quantity=${quantity}`}>
        Continue to checkout
      </Link>
      <div className="picker__trust">
        <span><Clock3 aria-hidden="true" /> {service.delivery}</span>
        <span><ShieldCheck aria-hidden="true" /> Secure checkout</span>
        <span><Check aria-hidden="true" /> {service.retention}</span>
      </div>
    </aside>
  );
}
