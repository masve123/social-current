import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return <section className="page-hero page-hero--center"><div className="shell narrow"><span className="eyebrow">404</span><h1>This page lost its <em>signal.</em></h1><p>The link may have moved, or the address may be incomplete.</p><Link className="button button--ink" href="/"><ArrowLeft /> Back home</Link></div></section>;
}
