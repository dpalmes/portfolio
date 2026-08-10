"use client";

import type { HttpExchange } from "@/lib/api/secure-api";

/**
 * Renders one request and its response, the way you would read them in a
 * terminal.
 *
 * Showing the wire traffic is the whole point of this demo. A backend's
 * security behaviour is invisible in a pretty UI — "you can't see that record"
 * is a design decision, whereas a 404 with an empty body next to the token that
 * produced it is evidence.
 */
export function HttpExchangeView({
  exchange,
  expectation,
}: {
  exchange: HttpExchange;
  /** What the reader should notice about this one. */
  expectation?: string;
}) {
  const ok = exchange.status >= 200 && exchange.status < 300;
  const statusColour = ok
    ? "text-good"
    : exchange.status === 429
      ? "text-warn"
      : "text-bad";

  return (
    <div className="rounded-lg border border-line bg-raised/40 p-4 font-mono text-xs">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold text-ink">{exchange.method}</span>
        <span className="text-ink-muted">{exchange.path}</span>
        <span className={`ml-auto tabular font-semibold ${statusColour}`}>
          {exchange.status} {exchange.statusText}
        </span>
        <span className="tabular text-ink-faint">{exchange.durationMs}ms</span>
      </div>

      {exchange.auth ? (
        <p className="mt-2 break-all text-ink-faint">
          Authorization: Bearer {exchange.auth}
        </p>
      ) : (
        <p className="mt-2 text-ink-faint">No Authorization header</p>
      )}

      {exchange.requestBody !== undefined ? (
        <pre className="mt-2 overflow-x-auto rounded border border-line bg-canvas/60 p-2 text-ink-muted">
          {JSON.stringify(exchange.requestBody, null, 2)}
        </pre>
      ) : null}

      <pre className="mt-2 overflow-x-auto rounded border border-line bg-canvas/60 p-2 text-ink">
        {exchange.responseBody === null
          ? "(empty body)"
          : typeof exchange.responseBody === "string"
            ? exchange.responseBody
            : JSON.stringify(exchange.responseBody, null, 2)}
      </pre>

      {expectation ? (
        <p className="mt-3 border-l-2 border-accent pl-3 font-sans text-[13px] leading-relaxed text-ink-muted">
          {expectation}
        </p>
      ) : null}
    </div>
  );
}
