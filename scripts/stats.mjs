/**
 * Prints the numbers quoted in `src/content/stats.ts`, taken from an actual
 * test run. Run it after adding tests so the copy on the site stays true.
 *
 *   npm run stats
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const directory = mkdtempSync(join(tmpdir(), "portfolio-stats-"));
const output = join(directory, "results.json");

try {
  execFileSync(
    "npx",
    ["vitest", "run", "--reporter=json", `--outputFile=${output}`],
    { stdio: ["ignore", "ignore", "inherit"] },
  );

  const results = JSON.parse(readFileSync(output, "utf8"));

  const perFile = new Map();
  for (const file of results.testResults) {
    const name = file.name.split("/").at(-1);
    perFile.set(name, (perFile.get(name) ?? 0) + file.assertionResults.length);
  }

  const count = (...files) =>
    files.reduce((total, file) => total + (perFile.get(file) ?? 0), 0);

  const total = [...perFile.values()].reduce((a, b) => a + b, 0);

  console.log("\nPer file:");
  for (const [file, n] of [...perFile].sort()) {
    console.log(`  ${String(n).padStart(4)}  ${file}`);
  }

  console.log("\nsrc/content/stats.ts should read:\n");
  console.log(`  tests: ${total},`);
  console.log(`  pitchTests: ${count("yin.test.ts")},`);
  console.log(`  timingTests: ${count("scheduler.test.ts")},`);
  console.log(
    `  theoryTests: ${count("chords.test.ts", "fretboard.test.ts", "scales.test.ts")},`,
  );
  console.log("");
} finally {
  rmSync(directory, { recursive: true, force: true });
}
