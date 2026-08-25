/**
 * Captured output from the demo scripts.
 *
 * These are verbatim runs, not illustrations — each was produced by running the
 * command shown against the real service and pasting what came back. They exist
 * so a case study still demonstrates something when nothing is deployed, and
 * for the two services that are not deployed at all.
 *
 * If a demo's behaviour changes, re-run the script and replace the text. A
 * transcript that no longer matches the code is worse than none.
 */

export interface Transcript {
  /** The command that produced this output. */
  command: string;
  /** What the reader should take from it. */
  caption: string;
  lines: string[];
}

export const transcripts: Record<string, Transcript> = {
  "invoice-extraction": {
    command: "python demo/run_demo.py",
    caption:
      "Scripted model responses (so it runs with no API key), real everything else. The fabricated total is caught by arithmetic, the repair prompt names the exact disagreement, and the unfixable case lands in the review queue with reasons attached.",
    lines: [
      "$ python demo/run_demo.py",
      "",
      "1. The model fabricates a total — off by exactly 1,000 pesos.",
      "   The kind of error that looks plausible and survives a glance.",
      "",
      "   After one repair round:",
      "  status: verified   attempts: 2",
      "  Bayanihan Construction Supply · 2026-0347 · 2026-01-12 · total 4,065.60",
      "",
      "   The repair prompt named the exact disagreement:",
      "     - subtotal 3,630.00 + VAT 435.60 = 4,065.60, total says 5,065.60",
      "",
      "2. The model cannot fix it — same wrong answer twice.",
      "",
      "   After the repair round fails:",
      "  status: needs_review   attempts: 2",
      "  what the verifier rejected:",
      "    - subtotal 3,630.00 + VAT 435.60 = 4,065.60, total says 5,065.60",
      "   -> lands in the review queue with the record and the reasons attached.",
      "",
      "3. The queue, as accounting sees it: {'needs_review': 1, 'verified': 1}",
    ],
  },
  "lead-triage": {
    command: "n8n start · curl POST /webhook/lead-intake ×4 · curl /sink/log",
    caption:
      "Four leads through a real n8n engine — webhook to normalisation to LLM to validation to routed sink, zero accounts. The phones went in as 0917 123 4567 and came out +63: the normalisation ran inside the flow, not just in the test suite.",
    lines: [
      "$ python mock/llm_server.py &",
      "$ n8n import:workflow --input=workflows/lead-triage.local.json",
      "Successfully imported 1 workflow.",
      "$ n8n start &",
      "",
      "$ curl -X POST http://localhost:5678/webhook/lead-intake -d '{",
      '    "name": "Maria  Santos", "phone": "0917 123 4567",',
      '    "message": "Interested po ako sa pricing ng catering package" }' + "'",
      "  ... and three more: an outage, an obvious scam, a casual question",
      "",
      "$ curl -s http://127.0.0.1:8787/sink/log",
      "",
      "  route            label/urgency    lead",
      "  sales_pipeline   sales/normal     Maria Santos    +639171234567",
      "  escalate         support/urgent   Jun Reyes       +639181234567",
      "  archive          spam/urgent      WINNER",
      "  inbox            other/low        D. Villanueva   +639661234567",
    ],
  },
  "stream-processor": {
    command: "./demo/run-demo.sh",
    caption:
      "Against a real single-node Kafka. sub-1 sent four events and was counted for three — two carried the same eventId. sub-3 sent three unusable records and has no usage window at all.",
    lines: [
      "$ docker compose up -d && ./demo/setup.sh",
      "  ready after 1s",
      "  topic subscriber-events",
      "  topic subscriber-usage-windows",
      "  topic subscriber-usage-alerts",
      "  topic subscriber-events-dlq",
      "",
      "$ ./demo/run-demo.sh",
      "",
      "Producing the scenario",
      "  sub-1  600 bytes over three events, plus a REDELIVERY of e1",
      "  sub-2  1100 bytes over two events (the alert threshold is 1000)",
      "  sub-3  three unusable records: bad JSON, no subscriberId, negative bytes",
      "",
      "Keeping the stream alive so the windows can close",
      "  heartbeat 1/5",
      "  heartbeat 5/5",
      "",
      "subscriber-usage-windows",
      '  sub-1 | {"subscriberId":"sub-1","windowStart":1786325920000,"totalBytes":600,"eventCount":3}',
      '  sub-2 | {"subscriberId":"sub-2","windowStart":1786325920000,"totalBytes":1100,"eventCount":2}',
      "",
      "subscriber-usage-alerts",
      '  sub-2 | {"subscriberId":"sub-2","totalBytes":1100,"thresholdBytes":1000}',
      "",
      "subscriber-events-dlq",
      '  sub-3 | {"payload":"{not json at all","reason":"malformed JSON: Unexpected character..."}',
      '  sub-3 | {"payload":"{\\"eventId\\":\\"g1\\"...}","reason":"subscriberId is required"}',
      '  sub-3 | {"payload":"{\\"eventId\\":\\"g2\\"...}","reason":"bytes must not be negative"}',
    ],
  },

  "integration-gateway": {
    command: "./demo/run-demo.sh",
    caption:
      "The four numbers at the end are the retry policy. FAIL-400 reached the backend once, because a client error will not improve on the fourth attempt.",
    lines: [
      "$ mvn spring-boot:run -Dspring-boot.run.profiles=stub",
      "$ ./demo/run-demo.sh",
      "",
      "1. Broadband activation — routed to the SOAP backend",
      '  HTTP 200  {"status":"ACTIVATED","backendReference":"PRV-CIRCUIT-1"}',
      "",
      "2. Mobile activation — routed to the REST backend",
      '  HTTP 200  {"status":"ACTIVATED","backendReference":"REST-MSISDN-1"}',
      "",
      "3. Same request id twice — idempotency",
      '  HTTP 200  {"status":"ACTIVATED","backendReference":"PRV-CIRCUIT-2"}',
      '  HTTP 200  {"status":"DUPLICATE","message":"Request already processed"}',
      "",
      "4. Backend fails twice then recovers — retry with backoff",
      '  HTTP 200  {"status":"ACTIVATED","backendReference":"PRV-FLAKY-2"}',
      "",
      "5. Backend always answers 500 — retries exhaust",
      '  HTTP 502  {"status":"FAILED","message":"...statusCode: 500"}',
      "",
      "6. Backend answers 400 — must NOT be retried",
      '  HTTP 502  {"status":"FAILED","message":"...statusCode: 400"}',
      "",
      "7. SOAP fault — a considered refusal, not a transient error",
      '  HTTP 502  {"status":"FAILED","message":"Provisioning fault: Circuit already active"}',
      "",
      "How many times each resource actually reached a backend",
      '  {"FAIL-400":1,"FAIL-500":4,"FAULT":1,"FLAKY-2":3}',
    ],
  },

  "secure-api": {
    command: "./demo/run-demo.sh",
    caption:
      "The same walkthrough the live page runs, from a terminal. Steps 6 and 7 return byte-identical responses, which is what stops a refusal being used to work out which record ids are real.",
    lines: [
      "$ mvn spring-boot:run",
      "$ ./demo/run-demo.sh",
      "",
      "1. No token at all",
      "  HTTP 401",
      "",
      "2. Token with the wrong scope",
      "  HTTP 403",
      "",
      "3. Create a subscriber as tenant-a",
      '  HTTP 201  {"id":"648a412f...","nationalId":"**********9012"}',
      "",
      "4. Read it back without pii:read",
      '  HTTP 200  {"nationalId":"**********9012"}',
      "",
      "5. Read it back WITH pii:read",
      '  HTTP 200  {"nationalId":"1234-5678-9012"}',
      "",
      "6. tenant-b asks for tenant-a's record",
      '  HTTP 404  {"error":"not found"}',
      "",
      "7. tenant-b asks for an id that does not exist",
      '  HTTP 404  {"error":"not found"}',
      "",
      "8. A tampered token",
      "  HTTP 401",
      "",
      "9. Malformed national ID",
      '  HTTP 400  {"fields":{"nationalId":"nationalId must be ####-####-####"}}',
      "",
      "10. Rate limiting",
      "  200 requests in 0.12s",
      "    HTTP 200: 105",
      "    HTTP 429: 95",
    ],
  },
};
