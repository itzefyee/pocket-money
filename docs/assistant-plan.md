# Ask Pocket

## Intent and design

Extend the existing app with a conversational way to find transactions, aggregate spending, inspect patterns, compare periods and understand budgets. Retain Pocket's established design and local-first data ownership. A dedicated Ask Pocket route uses short suggested questions, a readable conversation, numerical summaries, category/merchant breakdowns, and expandable transaction evidence with edit links. Mobile gets a compact navigation entry and a composer above bottom navigation.

Local questions use a deterministic query interpreter with explicit scope and recovery suggestions for unsupported questions. Follow-ups inherit previous query filters only when conversationally appropriate. Never turn an unknown question into a confident unrelated total. Transfers are excluded from spending. Comparisons label periods and use matching elapsed calendar days for a partial current month. Every result is computed from the current workspace, and conversations reset independently per workspace without writing transaction data.

Optional AI interprets a question into a constrained query plan. Only the question, previous plan, date, currency, and account labels are sent to the configured provider, with explicit opt-in. All aggregation and result rendering remains local. No executable SQL/code, open-ended ungrounded financial claims, or transaction mutation by the assistant. A failed provider call yields clear recovery to local answers.

## Implementation

1. Write failing tests for question parsing, contextual follow-ups, date ranges, amount/account/category filters, exact aggregation, transfer exclusion, period comparison, unsupported intent and malformed model plans.
2. Implement assistant-query.js as shared query interpretation/validation/execution with structured evidence.
3. Add a same-origin, bounded /api/assistant-plan endpoint using existing Gemini configuration and validate provider output before returning.
4. Implement assistant-ui.js and assistant.css. Integrate into app navigation and existing transaction edit flow. Preserve accessibility, keyboard focus and mobile layout. Conversation state is in memory and separated by workspace.
5. Run domain/API tests and browser workflows, inspect desktop/mobile screenshots, independent finish review, update product/design/run documentation.

Authorized as a direct feature addition; no deployment, new credentials, or bank access required.

## Delivered and verified

All five steps are implemented. Date scopes include exact dates/ranges, named months, today/yesterday, weeks, years, last N days and last N complete calendar months. Multiple lower/upper amount bounds are combined; follow-ups can clear category/account scope or switch transaction type without inheriting an incompatible category. Model-authored clarification prose is replaced by trusted local text.

35 domain/API tests, 17 assistant browser checks and 22 existing-app browser regressions pass. Desktop/mobile captures were inspected; the composer fits above mobile navigation and the thread fits 320px. Independent finish review reproduced and cleared the query-scope issues, checked cancellation/workspace isolation, and issued `ship`. The contrast correction measures 5.78:1. Live Gemini and real microphone audio remain untested without a configured key/hardware session.
