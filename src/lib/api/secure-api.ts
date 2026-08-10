/**
 * Client for the deployed `secure-api` service.
 *
 * The page's job is to show the HTTP traffic, not to hide it, so every call
 * returns the request and response as data rather than throwing. A demo of an
 * API's security behaviour is uninteresting unless you can see the 404 that
 * came back and the token that failed to prevent it.
 */

export const SECURE_API_URL = process.env.NEXT_PUBLIC_SECURE_API_URL ?? "";

export interface HttpExchange {
  method: string;
  path: string;
  /** Authorization header, already abbreviated for display. */
  auth: string | null;
  requestBody?: unknown;
  status: number;
  statusText: string;
  responseBody: unknown;
  durationMs: number;
}

export interface DemoSession {
  tenant: string;
  otherTenant: string;
  expiresInSeconds: number;
  tokens: {
    write: string;
    read: string;
    readPii: string;
    intruder: string;
    wrongScope: string;
  };
}

export class ApiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiUnavailableError";
  }
}

/** A bearer token is long and uninteresting; the middle adds nothing. */
export function abbreviate(token: string): string {
  if (token.length <= 24) return token;
  return `${token.slice(0, 12)}…${token.slice(-8)}`;
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function call(
  method: "GET" | "POST",
  path: string,
  options: { token?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<HttpExchange> {
  if (!SECURE_API_URL) {
    throw new ApiUnavailableError("No API URL is configured");
  }

  const headers: Record<string, string> = {};
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  const started = performance.now();
  let response: Response;
  try {
    response = await fetch(`${SECURE_API_URL}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (cause) {
    // A network-level failure here is almost always the service being asleep or
    // a CORS origin mismatch, neither of which fetch will tell us apart.
    throw new ApiUnavailableError(
      cause instanceof Error && cause.name === "AbortError"
        ? "The request was cancelled"
        : "Could not reach the service",
    );
  }

  return {
    method,
    path,
    auth: options.token ? abbreviate(options.token) : null,
    requestBody: options.body,
    status: response.status,
    statusText: response.statusText,
    responseBody: await parseBody(response),
    durationMs: Math.round(performance.now() - started),
  };
}

export async function startSession(signal?: AbortSignal): Promise<DemoSession> {
  const exchange = await call("POST", "/api/demo/session", { signal });
  if (exchange.status !== 200) {
    throw new ApiUnavailableError(`The service answered ${exchange.status}`);
  }
  return exchange.responseBody as DemoSession;
}

/**
 * Waits for a scale-to-zero service to wake.
 *
 * Free tiers stop the container when idle, and the first request afterwards
 * pays for the whole cold start — up to a minute on some hosts. Polling health
 * lets the page say "waking the service" instead of appearing broken, which is
 * the difference between a demo that looks cheap and one that looks asleep.
 */
export async function waitForService(
  onAttempt: (attempt: number) => void,
  maxAttempts = 30,
  signal?: AbortSignal,
): Promise<boolean> {
  if (!SECURE_API_URL) return false;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (signal?.aborted) return false;
    onAttempt(attempt);
    try {
      const response = await fetch(`${SECURE_API_URL}/actuator/health`, { signal });
      if (response.ok) return true;
    } catch {
      // Still asleep, or not there at all. Keep trying until the budget runs
      // out; the caller decides what to say when it does.
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return false;
}
