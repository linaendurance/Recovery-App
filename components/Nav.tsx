"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/app", label: "Today" },
  { href: "/app/log", label: "Log a meal" },
  { href: "/app/journal", label: "Journal" },
  { href: "/app/summary", label: "Summary" },
  { href: "/app/data", label: "Data" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="rn-tabs" role="tablist">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          role="tab"
          aria-selected={pathname === t.href}
          className={`rn-tab ${pathname === t.href ? "is-on" : ""}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
