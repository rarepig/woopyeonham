"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Topbar() {
  const path = usePathname();
  const links = [
    { href: "/dashboard", label: "대시보드" },
    { href: "/inbox", label: "메일함" },
    { href: "/settings", label: "설정" },
  ];
  return (
    <header className="topbar">
      <span className="brand">우편함</span>
      <nav>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={path === l.href ? "active" : ""}>
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
