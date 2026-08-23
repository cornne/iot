# Agent Execution Rules & Skill Workflow Guidance

These rules govern agent behavior across all development tasks, enforcing senior engineering standards, deep module architecture, and automatic skill activation (combining Addy Osmani's Agent-Skills & Matt Pocock's Engineering Skills).

## Core Rules & Execution Model

1. **Skill-Driven Execution**: Whenever a task or user request matches any skill in `skills/`, you MUST activate and strictly follow the skill instructions.
2. **No Direct Implementation Without Verification**: Never skip required design, planning, or testing steps. Always follow the skill workflow end-to-end.
3. **Tests are Proof**: Never declare a feature or bug fix complete without running verification and proving that tests pass (Red-Green-Refactor).
4. **Relentless Alignment & Grilling**: Before starting complex features, use grilling (`grill-me` / `grill-with-docs`) to resolve ambiguities, establish shared domain language, and record decisions in `CONTEXT.md` and ADRs.
5. **Deep Module Design**: Strive for deep modules — simple, clean interfaces hiding high functional complexity behind a clear seam (`codebase-design`).

## Intent → Skill Mapping

Automatically map user intents to the corresponding skills:

- **Feature / New Functionality**: `spec-driven-development` / `to-spec` → `planning-and-task-breakdown` / `to-tickets` → `incremental-implementation` / `implement` → `test-driven-development` / `tdd`
- **Bug Fix / Error Investigation**: `debugging-and-error-recovery` / `diagnosing-bugs` → `test-driven-development` / `tdd`
- **Requirements Clarification & Interview**: `grill-with-docs` / `grill-me` / `interview-me`
- **Code Review & Quality Gate**: `code-review-and-quality` / `code-review`
- **Refactoring & Architecture Improvement**: `code-simplification` / `improve-codebase-architecture` / `domain-modeling`
- **API & Interface Design**: `api-and-interface-design` / `codebase-design`
- **Frontend / UI Engineering**: `frontend-ui-engineering` / `prototype`
- **Performance Tuning**: `performance-optimization`
- **Security Hardening**: `security-and-hardening`
- **Pre-Launch & Shipping**: `shipping-and-launch` / `handoff`

## Development Lifecycle (Implicit Commands)

Follow this lifecycle for non-trivial development tasks:
- **DEFINE**: `spec-driven-development` | `to-spec` | `grill-with-docs`
- **PLAN**: `planning-and-task-breakdown` | `to-tickets` | `wayfinder`
- **BUILD**: `incremental-implementation` + `implement` + `tdd`
- **VERIFY**: `debugging-and-error-recovery` | `diagnosing-bugs`
- **REVIEW**: `code-review-and-quality` | `code-review`
- **SHIP**: `shipping-and-launch` | `handoff`

## Anti-Rationalization Guardrails

Avoid the following invalid assumptions:
- *"This task is too small to need a skill or test."* (False — always verify and follow established patterns).
- *"I'll just quickly write the code first and test later."* (False — write tests to reproduce bugs and verify features).
- *"The user didn't explicitly ask for code review, so I can skip quality checks."* (False — enforce high code quality standards always).
- *"The user knows exactly what they want without grilling."* (False — ask clarifying questions, sharpen domain terms, update CONTEXT.md).
