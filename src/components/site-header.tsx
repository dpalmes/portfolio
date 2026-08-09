"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ThemeToggle } from "./theme-toggle";
import { site } from "@/content/site";

const links = [
  { href: "/lab", label: "Lab" },
  { href: "/work", label: "Work" },
  { href: "/about", label: "About" },
];

/**
 * Scroll position is external state, so it is read through a store rather than
 * mirrored into React state by an effect. This also gets the initial value
 * right for free when a page loads already scrolled — a restored session, or a
 * link to an anchor.
 */
function subscribeToScroll(onChange: () => void): () => void {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

export function SiteHeader() {
  const pathname = usePathname();
  const scrolled = useSyncExternalStore(
    subscribeToScroll,
    () => window.scrollY > 8,
    () => false,
  );
  const [menuOpen, setMenuOpen] = useState(false);

  // The menu closes when a link inside it is followed (see below) rather than
  // by watching the pathname — closing it is a consequence of the click, not
  // something to re-derive from routing state afterwards. Escape closes it too,
  // which is what a keyboard user will try first.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors duration-300 ${
        scrolled
          ? "border-line bg-canvas/85 backdrop-blur-md"
          : "border-transparent bg-canvas"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-5">
        <Link
          href="/"
          className="font-display text-base font-semibold tracking-tight"
        >
          {site.shortName}
          <span className="text-accent">.</span>
        </Link>

        <nav aria-label="Main" className="ml-auto hidden items-center gap-1 sm:flex">
          {links.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              label={link.label}
              active={pathname === link.href || pathname.startsWith(`${link.href}/`)}
            />
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            className="grid size-9 place-items-center rounded-md border border-line text-ink-muted sm:hidden"
          >
            <span className="sr-only">
              {menuOpen ? "Close menu" : "Open menu"}
            </span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              aria-hidden="true"
              className="size-4"
            >
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 8h16M4 16h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className="border-t border-line bg-canvas px-5 py-2 sm:hidden"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              aria-current={pathname === link.href ? "page" : undefined}
              className="block rounded-md px-2 py-2.5 text-sm text-ink-muted hover:bg-raised hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative rounded-md px-3 py-2 text-sm transition-colors ${
        active ? "text-ink" : "text-ink-muted hover:text-ink"
      }`}
    >
      {label}
      {active ? (
        <span
          aria-hidden="true"
          className="absolute inset-x-3 -bottom-px h-px bg-accent"
        />
      ) : null}
    </Link>
  );
}
