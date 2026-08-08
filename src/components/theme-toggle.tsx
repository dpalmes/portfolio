"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

/**
 * The `data-theme` attribute on <html> is the single source of truth, set
 * before first paint by the inline script in the root layout. Rather than copy
 * it into React state — which would mean two things that can disagree — the
 * component subscribes to the attribute itself.
 *
 * The server snapshot is null, so the button renders with a neutral label until
 * the client knows the real theme. Guessing would mean a wrong label in the
 * markup for half of all visitors.
 */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function readTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme | null>(subscribe, readTheme, () => null);

  const toggle = () => {
    const next: Theme = readTheme() === "dark" ? "light" : "dark";
    // Writing the attribute is the whole update; the observer above pushes it
    // back into React.
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Private browsing can refuse writes. The theme still applies to this
      // page view, which is the part that matters.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        theme === null
          ? "Toggle theme"
          : `Switch to ${theme === "dark" ? "light" : "dark"} theme`
      }
      className="grid size-9 place-items-center rounded-md border border-line text-ink-muted transition-colors hover:border-accent-line hover:text-ink"
    >
      <SunMoon />
    </button>
  );
}

/**
 * Sun in light mode, moon in dark. Swapped by CSS rather than by state, so the
 * icon is already correct in the server-rendered markup.
 */
function SunMoon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
      className="size-4"
    >
      <g className="dark:hidden">
        <circle cx="12" cy="12" r="4.2" fill="currentColor" stroke="none" />
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.1 5.1l1.4 1.4M17.5 17.5l1.4 1.4M18.9 5.1l-1.4 1.4M6.5 17.5l-1.4 1.4" />
      </g>
      <path
        d="M17.5 14.5A6.5 6.5 0 0 1 9.5 6.5a6.5 6.5 0 1 0 8 8Z"
        fill="currentColor"
        stroke="none"
        className="hidden dark:block"
      />
    </svg>
  );
}
