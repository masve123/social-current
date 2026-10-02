import type { ReactNode } from "react";

export function LegalPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) {
  return (
    <>
      <section className="page-hero page-hero--compact">
        <div className="shell narrow">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{intro}</p>
          <time>Last updated October 2, 2026</time>
        </div>
      </section>
      <article className="section shell legal-copy">{children}</article>
    </>
  );
}
