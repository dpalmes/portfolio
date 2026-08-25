/**
 * Case studies for the AI-automation repositories.
 *
 * Same rule as the backend case studies: every claim here is checkable
 * against `invoice-extraction` and `lead-triage`, and where a case study
 * says a test or an eval caught something, it did and the output is quoted.
 */

import type { Project } from "./projects";
import { stats } from "./stats";

export const automationProjects: Project[] = [
  {
    slug: "invoice-extraction",
    kind: "automation",
    title: "Invoice extraction",
    tagline: "An LLM reads receipts. Code decides whether to believe it.",
    domain: "AI automation · LLM APIs · Python",
    stack: ["Python", "LLM APIs × 4", "SQLite", "Zero dependencies"],
    repo: "invoice-extraction",
    repoHref: "https://github.com/dpalmes/invoice-extraction",
    testCount: stats.extractionTests,
    summary:
      "Philippine retail receipts extracted to structured records by a language model, then checked by arithmetic the model cannot talk its way past: every line must multiply, lines must sum to the subtotal, and the VAT must be exactly 12/112 of a tax-inclusive total. Failures get one repair attempt with the errors fed back verbatim, then go to a human with the reasons attached.",
    highlights: [
      "A deterministic verification layer between the model and the books — a fabricated total is caught by arithmetic, not by hoping the model was honest",
      "One repair round: the validation errors go back to the model verbatim, which reliably fixes transcription slips; a second failure routes to a review queue instead of looping",
      "Anthropic, OpenAI, Groq and Gemini behind one two-method interface with no SDKs — request building is a pure function, so every wire format is unit-tested offline",
      `${stats.extractionTests} tests and an eight-receipt eval harness, all running with no API key and no network`,
    ],
    sources: [
      "extractor/verify.py",
      "extractor/pipeline.py",
      "extractor/providers.py",
      "evals/run_evals.py",
    ],
    sections: [
      {
        heading: "The split that makes it trustworthy",
        body: [
          "A language model is good at exactly the part software is bad at — reading a crumpled, OCR-mangled receipt — and unreliable at the part software is perfect at: arithmetic. Most AI extraction demos ignore this and pipe whatever the model says into a spreadsheet. This one makes the split absolute. The model produces a structured record; a verification layer then checks every relation the receipt must satisfy regardless of who read it. Each line item must equal quantity times unit price. The lines must sum to the subtotal. On a VAT-exclusive invoice, subtotal plus VAT must equal the total; on the tax-inclusive receipts Philippine retail actually prints, the VAT line must be exactly 12/112 of the total, to the centavo.",
          "Money is integer centavos from the moment it is parsed, and the model is asked for centavos too — ask a model for floats and it will eventually hand back 285.99999999, at which point the verifier is testing the parser's rounding rather than the receipt's arithmetic. Rounding happens in exactly one place in the codebase.",
        ],
        note: "During development the verifier rejected one of my own hand-written eval fixtures — a total off by one peso. The layer built to catch the model caught its author first, which is the strongest argument for it I have.",
      },
      {
        heading: "Repair once, then ask a human",
        body: [
          "An extraction that fails verification is not discarded and not trusted — it goes back to the model exactly once, with the validation errors quoted verbatim: \"subtotal 3,630.00 + VAT 435.60 = 4,065.60, total says 5,065.60\". Models fix transcription slips reliably when told precisely what disagrees, so schema validation collects every error in one pass rather than failing fast — a model told about one mistake at a time fixes them one retry at a time.",
          "A second failure means the receipt, the model or the rules have a real problem, and looping harder at a real problem burns tokens while hiding it. The record lands in a review queue with the structured data and the reasons attached, because a human reviewing a filled-in form against a receipt is faster than a human starting over.",
        ],
      },
      {
        heading: "Four providers, no SDKs, no key needed to test",
        body: [
          "Anthropic, OpenAI, Groq and Gemini sit behind one interface with two methods. Building a request is a pure function from configuration and prompt to URL, headers and body, so every provider's wire format — down to Gemini taking its key in a header rather than a URL, where it would leak into logs — is unit-tested without a network. The one class that touches the network is eight lines of urllib.",
          "The whole suite and the eval harness run with no API key: a fake provider replays scripted responses, and the harness is calibrated by replaying the golden answers through the full pipeline and requiring a perfect score. Swapping the free-tier Gemini for Claude in production is a config change, not a rewrite.",
        ],
      },
    ],
  },
  {
    slug: "lead-triage",
    kind: "automation",
    title: "Lead triage",
    tagline: "LLM classification, rule-based routing, packaged for n8n",
    domain: "AI automation · n8n · Workflows",
    stack: ["n8n", "Gemini API", "Python", "Google Sheets"],
    repo: "lead-triage",
    repoHref: "https://github.com/dpalmes/lead-triage",
    testCount: stats.triageTests,
    summary:
      "Inbound leads classified by a model against closed vocabularies — five labels, three urgencies — and routed by tested rules: spam is archived even when it shouts, urgent support escalates, sales goes to the pipeline, and anything the validator does not recognise goes to a human. Packaged as an n8n workflow that runs end to end on a laptop with zero accounts.",
    highlights: [
      "The model answers one narrow question — what is this about, and can it wait; routing policy lives in tested code, not in a prompt where nobody can test it",
      "Answers outside the closed vocabulary route to review — an unexpected model output is a reason for a human to look, never a reason to guess",
      "The n8n workflow JSONs are generated from the Python package, so the prompt the flow ships is the prompt the evals measured — a test fails if they drift",
      `${stats.triageTests} tests plus a twelve-lead eval harness scoring label, urgency and route, no API key required`,
    ],
    sources: [
      "triage/rules.py",
      "triage/classify.py",
      "workflows/generate.py",
      "evals/run_evals.py",
    ],
    sections: [
      {
        heading: "What the model is allowed to decide",
        body: [
          "The classifier returns a label from a vocabulary of five and an urgency from a vocabulary of three, or it returns an error. There is no \"the model said 'Sales inquiry', close enough\" — the workflow's Switch node matches exact strings, and close enough is exactly where a pipeline goes silently empty. Everything deterministic lives outside the prompt: normalisation knows that 0917 123 4567 and +639171234567 are the same caller, and the routing policy is a total function — every label-urgency pair, including invalid ones, routes somewhere, with the invalid ones routed to a person.",
          "That split is the transferable part. The model is a component with a narrow contract, wrapped in validation, with business policy in code where it can be tested, reviewed and changed without wondering what else the prompt might do differently now.",
        ],
      },
      {
        heading: "Workflows as generated artifacts",
        body: [
          "The n8n workflow JSONs are not hand-maintained — a generator imports the classification prompt from the Python package and emits both flows, so the prompt n8n ships is byte-identical to the prompt the eval suite measured. A test regenerates the workflows and fails if the committed files differ; another walks every connection and fails on a dangling node reference; a third asserts the production flow carries a credential slot and no actual key.",
          "Two variants come out of the generator. The local one runs end to end with zero accounts — a mock Gemini server answers the same wire format and a recording sink stands in for the spreadsheet — which is the same discipline as the backend repositories, where every suite runs with no broker and no Docker. The production variant swaps in real Gemini and Google Sheets appends, with an urgent-lead escalation email.",
        ],
        note: "Run against the mock's keyword rules, the eval harness reports 11/12 labels — it misreads \"cannot process payments\" as billing. The number stays in the README because a harness that can catch a mock being wrong is the harness you want measuring the real prompt.",
      },
      {
        heading: "Why this shape and not a bigger one",
        body: [
          "Triage is the automation with the best ratio of value to risk: it never answers a customer, so a wrong classification costs a mis-sorted queue entry rather than a wrong promise. The design puts every consequential decision — what escalates, what archives — in code a reviewer can read, and reserves the model for the judgment call software is genuinely bad at.",
          "The same skeleton — webhook in, model answers a narrow question, validated answer drives tested routing, rows land in a sheet — is the shape of most business automation worth building: document intake, ticket routing, order-status inquiries. Swapping the vocabulary and the sinks is configuration; the discipline is the product.",
        ],
      },
    ],
  },
];
