"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { HttpExchangeView } from "./http-exchange";
import {
  ApiUnavailableError,
  SECURE_API_URL,
  call,
  startSession,
  waitForService,
  type DemoSession,
  type HttpExchange,
} from "@/lib/api/secure-api";

interface Step {
  exchange: HttpExchange;
  expectation: string;
}

type Phase = "idle" | "waking" | "running" | "done" | "unavailable";

/**
 * Drives the deployed API and shows the traffic.
 *
 * The interesting steps are 4 and 5: a valid token with the right scope asking
 * for another tenant's record, and the same token asking for a record that was
 * never there. Both come back identical, which is the only way a refusal cannot
 * be used to work out which ids exist.
 */
export function SecureApiDemo() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [steps, setSteps] = useState<Step[]>([]);
  const [session, setSession] = useState<DemoSession | null>(null);
  const [burst, setBurst] = useState<{ allowed: number; refused: number; ms: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [wakeAttempt, setWakeAttempt] = useState(0);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const push = (exchange: HttpExchange, expectation: string) =>
    setSteps((current) => [...current, { exchange, expectation }]);

  const run = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    setSteps([]);
    setBurst(null);
    setError(null);
    setSession(null);

    try {
      // A free-tier service stops when idle. Say so, rather than letting the
      // first request hang for a minute and look broken.
      setPhase("waking");
      const awake = await waitForService(setWakeAttempt, 30, signal);
      if (signal.aborted) return;
      if (!awake) {
        setPhase("unavailable");
        setError("The service did not answer. It may be asleep or offline.");
        return;
      }

      setPhase("running");

      const demo = await startSession(signal);
      if (signal.aborted) return;
      setSession(demo);

      const created = await call("POST", "/api/subscribers", {
        token: demo.tokens.write,
        body: { name: "Juan Dela Cruz", nationalId: "1234-5678-9012", plan: "FIBRE-100" },
        signal,
      });
      push(
        created,
        "Created in your own tenant. Note the national ID is already masked in the response — the write scope does not include permission to read it back.",
      );

      const id = (created.responseBody as { id?: string })?.id;
      if (!id) throw new ApiUnavailableError("The service did not return a record id");

      push(
        await call("GET", `/api/subscribers/${id}`, { token: demo.tokens.read, signal }),
        "Your record, read with subscribers:read. Still masked: reading a record and reading the personal data inside it are separate privileges.",
      );

      push(
        await call("GET", `/api/subscribers/${id}`, { token: demo.tokens.readPii, signal }),
        "The same record with pii:read added. Now the value is revealed — and every one of these reads was written to the audit trail.",
      );

      push(
        await call("GET", `/api/subscribers/${id}`, { token: demo.tokens.intruder, signal }),
        `404. Nothing about this request was malformed: the signature is valid and the scope is correct. It belongs to ${demo.otherTenant}, and the record does not. This is the failure mode that leaks whole databases when it is missing.`,
      );

      push(
        await call("GET", "/api/subscribers/00000000-0000-0000-0000-000000000000", {
          token: demo.tokens.intruder,
          signal,
        }),
        "The same token asking for an id that never existed. Byte-identical to the response above — deliberately. A different answer would confirm which ids are real, which is exactly what someone walking the id space wants to learn.",
      );

      push(
        await call("GET", "/api/subscribers", { token: demo.tokens.wrongScope, signal }),
        "403, not 401. The token is perfectly valid; it simply does not carry subscribers:read.",
      );

      push(
        await call("GET", "/api/subscribers", { signal }),
        "401 with no token at all — the only one of these an ordinary API gets right by default.",
      );

      // Fired in parallel: the bucket refills continuously, so a sequential
      // loop from a browser can refill faster than it drains and the limiter
      // looks broken when it is the measurement that is too slow.
      const burstStarted = performance.now();
      const results = await Promise.all(
        Array.from({ length: 120 }, () =>
          call("GET", "/api/subscribers", { token: demo.tokens.read, signal }).catch(
            () => null,
          ),
        ),
      );
      if (signal.aborted) return;

      setBurst({
        allowed: results.filter((r) => r?.status === 200).length,
        refused: results.filter((r) => r?.status === 429).length,
        ms: Math.round(performance.now() - burstStarted),
      });

      setPhase("done");
    } catch (cause) {
      if (signal.aborted) return;
      setPhase("unavailable");
      setError(
        cause instanceof ApiUnavailableError
          ? cause.message
          : "Something went wrong talking to the service.",
      );
    }
  }, []);

  if (!SECURE_API_URL) {
    return <NotDeployed />;
  }

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-4 border-b border-line p-4 sm:p-5">
        <Button onClick={() => void run()} disabled={phase === "waking" || phase === "running"}>
          {phase === "idle"
            ? "Run the walkthrough"
            : phase === "waking"
              ? "Waking the service…"
              : phase === "running"
                ? "Running…"
                : "Run again"}
        </Button>

        {phase === "waking" ? (
          <p className="text-sm text-ink-muted">
            The service scales to zero when idle, so the first request pays for
            the cold start. Attempt {wakeAttempt}.
          </p>
        ) : null}

        {session ? (
          <p className="font-mono text-xs text-ink-faint">
            your tenant <span className="text-accent">{session.tenant}</span> · tokens
            expire in {Math.round(session.expiresInSeconds / 60)} min
          </p>
        ) : null}
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {steps.length === 0 && phase !== "waking" ? (
          <p className="text-sm text-ink-muted">
            Eight requests against the live service, showing the response to
            each. Every token is minted server-side for a tenant of your own —
            the signing key never reaches your browser.
          </p>
        ) : null}

        {steps.map((step, index) => (
          <HttpExchangeView
            key={`${step.exchange.path}-${index}`}
            exchange={step.exchange}
            expectation={step.expectation}
          />
        ))}

        {burst ? (
          <div className="rounded-lg border border-line bg-raised/40 p-4">
            <p className="font-mono text-xs text-ink-faint">
              120 parallel requests in {burst.ms}ms
            </p>
            <p className="mt-2 font-display text-2xl font-semibold tabular">
              <span className="text-good">{burst.allowed}</span>
              <span className="text-ink-faint"> allowed · </span>
              <span className="text-warn">{burst.refused}</span>
              <span className="text-ink-faint"> refused</span>
            </p>
            <p className="mt-3 border-l-2 border-accent pl-3 text-[13px] leading-relaxed text-ink-muted">
              The token bucket allows a burst up to its capacity and refuses the
              rest, keyed on your token&rsquo;s subject rather than your IP — so
              one noisy client cannot exhaust the budget of everyone behind the
              same connection.
            </p>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-bad">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Shown when the site was built without an API URL. Says what is missing rather
 * than pretending the demo is broken.
 */
function NotDeployed() {
  return (
    <div className="panel p-6">
      <h3 className="font-display text-lg font-semibold">
        The live service is not configured
      </h3>
      <p className="mt-3 leading-relaxed text-ink-muted">
        This page calls a deployed instance of{" "}
        <code className="font-mono text-ink">secure-api</code>. Set{" "}
        <code className="font-mono text-ink">NEXT_PUBLIC_SECURE_API_URL</code>{" "}
        at build time and it will appear here.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">
        Until then, the recording below shows the same walkthrough running
        against the service locally, and the repository&rsquo;s{" "}
        <code className="font-mono text-ink">deploy/</code> directory has the
        Dockerfile and host configuration.
      </p>
    </div>
  );
}
