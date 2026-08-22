/**
 * Case studies for the Java backend repositories.
 *
 * Every claim here is checkable against the code and the test suites in
 * `stream-processor`, `integration-gateway` and `secure-api`. Where a case
 * study says a test caught something, that test exists and is named.
 */

import type { Project } from "./projects";
import { stats } from "./stats";

export const backendProjects: Project[] = [
  {
    slug: "stream-processor",
    kind: "backend",
    title: "Stream processor",
    tagline: "Subscriber usage in real time, on Kafka Streams",
    domain: "Streaming · Kafka · Quarkus",
    stack: ["Java 21", "Kafka Streams", "Quarkus", "JUnit"],
    repo: "stream-processor",
    repoHref: "https://github.com/dpalmes/stream-processor",
    testCount: stats.streamProcessorTests,
    summary:
      "A pipeline that parses raw usage events, de-duplicates redeliveries, aggregates volume per subscriber into event-time windows, raises threshold alerts, and dead-letters anything unusable. The whole topology is tested without a broker.",
    highlights: [
      "Event-time windowing with an explicit grace period — late data lands in the window it belongs to",
      "Suppression until window close, so consumers get one answer per window instead of a stream of partial ones",
      "Poison payloads routed to a dead-letter topic rather than killing the stream thread",
      `${stats.streamProcessorTests} tests drive the real topology through TopologyTestDriver — no broker, no Docker, event time controlled to the millisecond`,
      "`docker compose up` and one script runs the whole scenario against a real broker",
    ],
    sources: [
      "src/main/java/com/dvpalmes/streaming/topology/SubscriberUsageTopology.java",
      "src/main/java/com/dvpalmes/streaming/topology/DeduplicationProcessor.java",
      "src/test/java/com/dvpalmes/streaming/topology/SubscriberUsageTopologyTest.java",
    ],
    sections: [
      {
        heading: "The failure modes are the design",
        body: [
          "A consumer that reads a topic and adds up numbers is a morning's work. What takes the time is everything that happens when the input is not what you hoped: the same event delivered twice because a producer's acknowledgement timed out, a batch that arrives forty seconds after the window it belongs to, a payload that is not JSON at all.",
          "Each of those has a wrong answer that looks entirely plausible. A duplicate inflates a subscriber's usage and can trip a threshold alert that should never have fired. A late batch gets counted in the wrong hour. A malformed record throws inside the consumer, kills the stream thread, and gets redelivered on restart to kill it again — a poison pill that stops the pipeline until somebody intervenes.",
        ],
      },
      {
        heading: "Parse, do not deserialise",
        body: [
          "Records are consumed as strings and parsed explicitly, rather than being handed to a serde. A serde that throws does so inside the consumer, where there is no opportunity to route the offending record anywhere useful; the exception takes down the thread and the record is still there on restart.",
          "Modelling the failure as data instead of an exception means a bad record becomes a value that can be branched on. Anything unparseable, or well-formed but missing the fields the pipeline needs, goes to a dead-letter topic with the original payload kept verbatim — a dead letter that has been helpfully cleaned up is useless, because the point is to replay exactly what arrived once the defect is fixed.",
        ],
      },
      {
        heading: "Suppression, and why one answer beats many",
        body: [
          "Kafka Streams emits an updated aggregate on every record by default. For a usage total that means a consumer sees a stream of partial answers it must know to discard, and the alerting branch fires on every record after the threshold rather than once per breach.",
          "Suppressing until the window closes fixes both. The test that pins it down sends twelve records that collectively cross the limit and asserts exactly one alert — without suppression that is twelve alerts for one breach, which is how alerting systems get muted.",
        ],
        note: "Emitting on window close means accepting latency equal to the window plus its grace. That is the honest trade: correct totals arrive late, partial totals arrive immediately. For anything that ends up on a bill, late and correct wins.",
      },
      {
        heading: "The bug the tests found",
        body: [
          "De-duplication keeps recently seen event ids in a state store. The first implementation keyed that store on the event id alone, which looked obviously correct and passed four of the five de-duplication tests.",
          "The fifth sent two different subscribers an event carrying the same id. A Kafka partition holds many subscribers, and event ids are only unique within the system that issued them, so the second subscriber's event looked exactly like a redelivery of the first one's — and was silently discarded. Real usage, dropped, with nothing logged and no error anywhere.",
          "The fix is one line: key the store on subscriber and event id together. The point is not the fix, it is that a plausible-looking implementation lost data in a way that no amount of staring at it would have revealed, and a test that took two minutes to write did.",
        ],
      },
      {
        heading: "Testing a distributed system without distributing it",
        body: [
          "The topology is a pure function from a configuration record to a Topology object. It reads no configuration, opens no connections, and imports nothing from Quarkus — the only framework-aware class in the repository is the one that supplies the config.",
          "That makes the entire pipeline drivable through Kafka's TopologyTestDriver: real parsing, real state stores, real windowing and suppression, with event time under the test's control. The scenarios that are near-impossible to arrange against a live cluster — an event arriving after its grace expired, a producer retry, a poison payload — are ordinary unit tests that run in single-digit milliseconds.",
        ],
      },
    ],
  },
  {
    slug: "integration-gateway",
    kind: "backend",
    title: "Integration gateway",
    tagline: "One REST interface over a SOAP backend and a REST one",
    domain: "Middleware · Camel · Spring Boot",
    stack: ["Java 21", "Apache Camel", "Spring Boot", "WireMock"],
    repo: "integration-gateway",
    repoHref: "https://github.com/dpalmes/integration-gateway",
    testCount: stats.integrationGatewayTests,
    summary:
      "A middleware layer that gives callers one interface over two very different provisioning backends, and answers the questions a gateway exists for: what to retry, what to give up on, and what a caller gets back when the far end is down.",
    highlights: [
      "Retry policy that distinguishes transient from permanent — 5xx and 429 back off, 4xx fails immediately",
      "Idempotent by request id, and a duplicate gets an answer rather than being silently dropped",
      "SOAP envelopes escaped against XML injection; responses parsed with DTDs disabled against XXE",
      `${stats.integrationGatewayTests} tests against a WireMock backend that can be told to fail twice and then recover`,
      "A stub profile runs it end to end with no Docker and no external services",
    ],
    sources: [
      "src/main/java/com/dvpalmes/gateway/route/ActivationRoutes.java",
      "src/main/java/com/dvpalmes/gateway/transform/SoapResponseParser.java",
      "src/test/java/com/dvpalmes/gateway/route/ActivationRoutesTest.java",
    ],
    sections: [
      {
        heading: "Anyone can forward a request",
        body: [
          "The value of a gateway is not in passing messages along. It is in having a considered answer for what happens when a backend is slow, down, or replying with nonsense — and in making that answer the same for every caller, so twelve client teams do not each invent their own retry loop.",
          "Here that means a canonical request and result shape that callers speak regardless of which backend serves them. That broadband provisioning is a twenty-year-old SOAP service and mobile is a modern REST API is the gateway's problem, not theirs.",
        ],
      },
      {
        heading: "Retrying the right things",
        body: [
          "A 503 means try later, and a retry with backoff is exactly right. A 400 means the request is wrong, and four more attempts produce four more 400s while holding a connection open and delaying the caller's error. Retrying everything is the default mistake, and it converts a small backend wobble into a self-inflicted load spike at the worst possible moment.",
          "A SOAP fault gets the same treatment as a 4xx. It is a considered answer that will be identical next time, so it maps to a failed result rather than three more attempts. The test asserts the backend was called exactly once.",
        ],
      },
      {
        heading: "Two retry layers is one too many",
        body: [
          "The test for 429 handling failed on its first run: eight requests reached the backend where four were expected. Apache HttpClient retries 429 and 503 by default, underneath Camel's error handler, so the two layers multiplied — and because the inner layer knows nothing about the outer backoff, the attempts also came twice as fast as intended.",
          "This is the kind of defect that never surfaces in a functional test, because the request still succeeds. It surfaces in production, as a backend that is already struggling receiving double the retries anyone intended. Retry policy belongs in exactly one place; here that is the route, because only the route knows which failures are worth retrying and who is waiting for the answer.",
        ],
        note: "After disabling the client's automatic retries the retry test suite runs in 0.45 seconds instead of 5.5 — the duplicated attempts, and their sleeps, disappearing.",
      },
      {
        heading: "Security in a translation layer",
        body: [
          "The SOAP envelope is assembled as text, which makes the bytes on the wire obvious and puts the burden of escaping squarely on this code. Without it, a subscriber id containing a closing tag lets a caller write arbitrary elements into the envelope — the XML equivalent of SQL injection. The test feeds exactly that and asserts the injected element does not appear.",
          "In the other direction, the response parser disables DTDs entirely. A SOAP response is XML from another system, and a document declaring an external entity can make the parser read local files or open outbound connections — unauthenticated, and invisible in a response that otherwise looks normal. The test feeds the classic payload and asserts it is refused.",
        ],
      },
    ],
  },
  {
    slug: "secure-api",
    kind: "backend",
    title: "Secure API",
    tagline: "Personal data behind authorization that actually checks the record",
    domain: "API security · Spring Security",
    stack: ["Java 21", "Spring Security", "OAuth2 / JWT", "AES-GCM"],
    repo: "secure-api",
    repoHref: "https://github.com/dpalmes/secure-api",
    testCount: stats.secureApiTests,
    summary:
      "A subscriber API carrying personal data, with JWT authentication, object-level authorization, field-level encryption, per-caller rate limiting and an audit trail that records refusals as well as successes.",
    highlights: [
      "Object-level authorization: a valid token with someone else's record id gets nothing",
      "A foreign record and a missing one return byte-identical responses, so refusals cannot confirm which ids exist",
      "National IDs encrypted per field with AES-256-GCM, bound to the record so ciphertext cannot be moved between rows",
      `${stats.secureApiTests} tests, including a token bucket driven by an injected clock so nothing sleeps`,
      "Runs standalone with no database or identity provider, and a script that mints tokens and walks the security behaviour",
    ],
    sources: [
      "src/main/java/com/dvpalmes/secureapi/service/SubscriberService.java",
      "src/main/java/com/dvpalmes/secureapi/crypto/FieldEncryptor.java",
      "src/test/java/com/dvpalmes/secureapi/web/SubscriberApiSecurityTest.java",
    ],
    sections: [
      {
        heading: "Authentication is the easy half",
        body: [
          "Validating a token is a library call. The question that follows — may this caller see this particular record — is the one APIs get wrong, and it is first on the OWASP API Security list because getting it wrong leaks everything at once.",
          "It cannot be answered by a URL pattern or a scope, because the answer depends on the record rather than the route. A caller with a perfectly valid token and the correct scope, asking for an id belonging to another tenant, must be refused. The check therefore lives in the service, where the record is in hand, and the tenant comes from a claim in the token rather than from a parameter — a caller who can name their own tenant is self-certifying every check downstream.",
        ],
      },
      {
        heading: "Refusals that do not leak",
        body: [
          "A record belonging to another tenant and a record that does not exist return byte-identical responses. Answering 403 for one and 404 for the other confirms which ids are real, which is precisely what someone walking an id space is trying to learn — the refusal itself becomes the data.",
          "The test does not check the status codes separately. It performs both requests and asserts the response bodies are equal, because that is the property that matters.",
        ],
      },
      {
        heading: "Encryption that assumes the attacker got in",
        body: [
          "National IDs are encrypted per field before storage, so whatever sits behind the repository — a table, a nightly backup, a read replica with looser access — never contains a readable one.",
          "GCM rather than CBC, because it authenticates as well as encrypts: with CBC, an attacker able to modify stored ciphertext can flip bits in the plaintext and the application decrypts the result without complaint. A fresh IV per encryption, because deterministic encryption leaks equality — an observer could tell which subscribers share a value without decrypting anything. And the record id is bound in as additional authenticated data, so a ciphertext lifted from one row and pasted into another simply fails to decrypt.",
          "Decryption failures are deliberately uninformative. Distinguishing wrong key from tampered from wrong record in the error message hands an attacker an oracle.",
        ],
        note: "Reading a subscriber and reading their national ID are separate privileges. Without the pii:read scope the value comes back masked, and the record stays useful for everything that does not need it.",
      },
      {
        heading: "Rate limiting, and auditing the denials",
        body: [
          "The limiter is a token bucket keyed on the authenticated subject, not the IP address. Keying on IP punishes everyone behind a shared connection for one noisy client, and does nothing about a single credential used from many addresses — which is the shape of scraping and credential-stuffing traffic. A bucket rather than a fixed window, because a fixed window permits double the intended rate across its boundary.",
          "Every access to personal data is audited, including refusals. One 403 is somebody mistyping an id; two hundred from one subject is an enumeration attack, and only the log tells them apart. The entries carry the record id and never its contents — an audit trail that quotes the data it protects has just copied it somewhere with weaker access controls.",
        ],
      },
    ],
  },
];
