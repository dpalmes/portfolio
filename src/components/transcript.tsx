import type { Transcript } from "@/content/transcripts";

/**
 * A captured terminal run.
 *
 * Deliberately static rather than an animated replay: the value is in being
 * able to read the output and scroll back through it, which an animation
 * actively obstructs. It also means no player library, no external requests,
 * and text a search engine and a screen reader can both handle.
 */
export function TranscriptView({ transcript }: { transcript: Transcript }) {
  return (
    <figure className="not-prose">
      <div className="overflow-hidden rounded-lg border border-line bg-[#0b0c0e]">
        <div className="flex items-center gap-2 border-b border-line/60 px-4 py-2.5">
          <span aria-hidden="true" className="size-2.5 rounded-full bg-bad/70" />
          <span aria-hidden="true" className="size-2.5 rounded-full bg-warn/70" />
          <span aria-hidden="true" className="size-2.5 rounded-full bg-good/70" />
          <span className="ml-2 font-mono text-[11px] text-ink-faint">
            {transcript.command}
          </span>
        </div>

        <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-[#ece9e4]">
          {transcript.lines.map((line, index) => (
            <span key={index} className="block">
              {/* Commands in accent, output plain — the same distinction the
                  terminal itself makes with a prompt. */}
              <span className={line.startsWith("$") ? "text-accent" : undefined}>
                {line === "" ? " " : line}
              </span>
            </span>
          ))}
        </pre>
      </div>

      <figcaption className="mt-3 text-sm leading-relaxed text-ink-muted">
        {transcript.caption}
      </figcaption>
    </figure>
  );
}
