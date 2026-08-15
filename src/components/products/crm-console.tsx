"use client";

import { useMemo, useState } from "react";
import { canContact, consentStates, contactable, mergeConsent } from "@/lib/crm/consent";
import {
  AUTO_MERGE_THRESHOLD,
  findDuplicates,
  mergeCustomers,
  type Customer,
} from "@/lib/crm/identity";
import {
  DEFAULT_SEGMENT_RULES,
  crossSellCandidates,
  segmentAll,
  type Transaction,
} from "@/lib/crm/segments";
import { formatPeso } from "@/lib/money";
import {
  CRM_NOW,
  SEED_CONSENT,
  SEED_CUSTOMERS,
  SEED_TRANSACTIONS,
  SOURCE_LABELS,
} from "@/content/crm-fixtures";

type Channel = "email" | "sms";

const SEGMENT_STYLES: Record<string, string> = {
  champion: "text-accent",
  loyal: "text-good",
  promising: "text-good",
  new: "text-ink",
  "at-risk": "text-warn",
  lapsed: "text-bad",
  none: "text-ink-faint",
};

/**
 * One CRM over three businesses.
 *
 * The duplicate review is the part worth watching. Ana appears three times —
 * booked a villa by phone, ordered coffee with the number written differently,
 * bought groceries under a fuller name — and until those are merged her
 * lifetime value is split across three records, none of which look like a
 * customer worth keeping.
 */
export function CrmConsole() {
  const [customers, setCustomers] = useState<Customer[]>(SEED_CUSTOMERS);
  const [transactions, setTransactions] = useState<Transaction[]>(SEED_TRANSACTIONS);
  const [consent, setConsent] = useState(SEED_CONSENT);
  const [channel, setChannel] = useState<Channel>("email");
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [log, setLog] = useState<string[]>([]);

  const duplicates = useMemo(
    () =>
      findDuplicates(customers).filter(
        (candidate) => !dismissed.includes(pairKey(candidate.a.id, candidate.b.id)),
      ),
    [customers, dismissed],
  );

  const segmented = useMemo(
    () =>
      segmentAll(
        customers.map((customer) => customer.id),
        transactions,
        DEFAULT_SEGMENT_RULES,
        CRM_NOW,
      ),
    [customers, transactions],
  );

  const byId = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers],
  );

  const audience = customers.map((customer) => customer.id);
  const reachable = contactable(audience, channel, "marketing", consent);
  const crossSell = crossSellCandidates(segmented);

  const merge = (primaryId: string, secondaryId: string) => {
    const primary = byId.get(primaryId);
    const secondary = byId.get(secondaryId);
    if (!primary || !secondary) return;

    const merged = mergeCustomers(primary, secondary);

    setCustomers((current) =>
      current
        .filter((customer) => customer.id !== secondaryId)
        .map((customer) => (customer.id === primaryId ? merged : customer)),
    );
    // The history has to follow, or the merged record loses the very purchases
    // that made it worth merging.
    setTransactions((current) =>
      current.map((transaction) =>
        transaction.customerId === secondaryId
          ? { ...transaction, customerId: primaryId }
          : transaction,
      ),
    );
    setConsent((current) => mergeConsent(primaryId, secondaryId, current));

    setLog((current) => [
      `Merged ${secondary.displayName} into ${merged.displayName}`,
      ...current,
    ]);
  };

  const reset = () => {
    setCustomers(SEED_CUSTOMERS);
    setTransactions(SEED_TRANSACTIONS);
    setConsent(SEED_CONSENT);
    setDismissed([]);
    setLog([]);
  };

  return (
    <div className="panel overflow-hidden">
      {/* ------------------------------------------------ duplicate review */}
      <div className="border-b border-line p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
            Possible duplicates · {duplicates.length}
          </p>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-ink-muted underline decoration-line underline-offset-4"
          >
            Reset
          </button>
        </div>

        {duplicates.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">
            Nothing left to review.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {duplicates.map((candidate) => {
              const key = pairKey(candidate.a.id, candidate.b.id);
              const auto = candidate.match.score >= AUTO_MERGE_THRESHOLD;

              return (
                <div
                  key={key}
                  className={`rounded-lg border p-3 ${
                    auto ? "border-accent-line bg-accent-soft/40" : "border-line"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-ink">
                        <span className="font-medium">{candidate.a.displayName}</span>
                        <span className="text-ink-faint"> ↔ </span>
                        <span className="font-medium">{candidate.b.displayName}</span>
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {candidate.match.reasons.map((reason) => (
                          <li key={reason} className="font-mono text-[11px] text-ink-muted">
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`font-mono text-xs ${
                          auto ? "text-accent" : "text-warn"
                        }`}
                      >
                        {Math.round(candidate.match.score * 100)}%{" "}
                        {auto ? "certain" : "review"}
                      </span>
                      <button
                        type="button"
                        onClick={() => merge(candidate.a.id, candidate.b.id)}
                        className="rounded border border-line px-2 py-1 text-xs text-ink transition-colors hover:border-accent hover:text-accent"
                      >
                        Merge
                      </button>
                      <button
                        type="button"
                        onClick={() => setDismissed((current) => [...current, key])}
                        className="rounded border border-line px-2 py-1 text-xs text-ink-muted transition-colors hover:text-ink"
                      >
                        Not the same
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-3 text-xs leading-relaxed text-ink-muted">
          Only a shared phone or email reaches <span className="text-accent">certain</span>.
          Two people called Maria Santos score high enough to review and never
          high enough to merge automatically — welding two real customers
          together is far harder to undo than leaving a duplicate.
        </p>
      </div>

      {/* -------------------------------------------------------- customers */}
      <div className="p-4 sm:p-5">
        <p className="font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
          Customers · {customers.length}
        </p>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="font-mono text-[11px] text-ink-faint uppercase">
              <tr>
                <th className="pb-2 font-normal">Customer</th>
                <th className="pb-2 font-normal">Segment</th>
                <th className="pb-2 font-normal">Seen in</th>
                <th className="pb-2 text-right font-normal">Visits</th>
                <th className="pb-2 text-right font-normal">Lifetime</th>
                <th className="pb-2 text-right font-normal">Last</th>
                <th className="pb-2 text-right font-normal">{channel}</th>
              </tr>
            </thead>
            <tbody>
              {segmented.map((entry) => {
                const customer = byId.get(entry.customerId);
                if (!customer) return null;
                const decision = canContact(
                  entry.customerId,
                  channel,
                  "marketing",
                  consent,
                );

                return (
                  <tr key={entry.customerId} className="border-t border-line/60">
                    <td className="py-2">
                      <span className="block text-ink">{customer.displayName}</span>
                      <span className="block font-mono text-[11px] text-ink-faint">
                        {customer.contacts.map((contact) => contact.normalised).join(" · ")}
                        {customer.mergedFrom.length > 0 ? (
                          <span className="ml-1 text-accent">
                            merged ×{customer.mergedFrom.length}
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className={SEGMENT_STYLES[entry.segment]}>
                      <span title={entry.rationale}>{entry.segment}</span>
                    </td>
                    <td className="font-mono text-[11px] text-ink-muted">
                      {entry.sources.map((source) => SOURCE_LABELS[source]).join(", ") ||
                        "—"}
                    </td>
                    <td className="tabular text-right text-ink-muted">
                      {entry.frequency}
                    </td>
                    <td className="tabular text-right text-ink">
                      {formatPeso(entry.monetary)}
                    </td>
                    <td className="tabular text-right text-ink-muted">
                      {Number.isFinite(entry.recencyDays) ? `${entry.recencyDays}d` : "—"}
                    </td>
                    <td className="text-right">
                      <span
                        title={decision.reason}
                        className={`font-mono text-[11px] ${
                          decision.allowed ? "text-good" : "text-bad"
                        }`}
                      >
                        {decision.allowed ? "may contact" : "no"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ----------------------------------------------------------- audience */}
      <div className="grid gap-6 border-t border-line p-4 sm:p-5 lg:grid-cols-2">
        <div>
          <div className="flex items-center gap-3">
            <p className="font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
              Campaign audience
            </p>
            <div className="flex rounded border border-line p-0.5">
              {(["email", "sms"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setChannel(option)}
                  aria-pressed={channel === option}
                  className={`rounded px-2 py-0.5 font-mono text-[11px] transition-colors ${
                    channel === option
                      ? "bg-accent-soft text-accent"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-3 font-display text-2xl font-semibold tabular">
            <span className="text-good">{reachable.length}</span>
            <span className="text-ink-faint"> of {customers.length} contactable</span>
          </p>

          <p className="mt-2 text-xs leading-relaxed text-ink-muted">
            The default is no. A customer with no consent record cannot be
            marketed to, and a withdrawal on one channel does not touch the
            other — unsubscribing from SMS leaves email alone, and the reverse.
          </p>

          <ul className="mt-3 space-y-1">
            {customers.map((customer) => {
              const states = consentStates(customer.id, consent);
              return (
                <li key={customer.id} className="font-mono text-[11px] text-ink-muted">
                  {customer.displayName}:{" "}
                  {states.length === 0 ? (
                    <span className="text-ink-faint">no record</span>
                  ) : (
                    states
                      .map(
                        (state) =>
                          `${state.channel} ${state.granted ? "yes" : "no"} (${state.source})`,
                      )
                      .join(", ")
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <p className="font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
            Seen in more than one business · {crossSell.length}
          </p>
          {crossSell.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">
              None yet — merge the duplicates and watch this change.
            </p>
          ) : (
            <ul className="mt-3 space-y-1 text-sm text-ink-muted">
              {crossSell.map((entry) => (
                <li key={entry.customerId} className="flex justify-between gap-3">
                  <span>{byId.get(entry.customerId)?.displayName}</span>
                  <span className="font-mono text-[11px]">
                    {entry.sources.map((source) => SOURCE_LABELS[source]).join(" + ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs leading-relaxed text-ink-muted">
            This is the reason to run one CRM over three businesses rather than
            three lists. Without it the resort and the coffee shop each see a
            stranger, and neither knows the other is serving the same person.
          </p>

          {log.length > 0 ? (
            <ul className="mt-4 space-y-1">
              {log.map((entry, index) => (
                <li key={index} className="font-mono text-[11px] text-accent">
                  {entry}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}
