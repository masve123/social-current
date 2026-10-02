import Link from "next/link";

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link className={`logo ${inverted ? "logo--inverted" : ""}`} href="/" aria-label="Social Current home">
      <span className="logo__mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span>social current</span>
    </Link>
  );
}
