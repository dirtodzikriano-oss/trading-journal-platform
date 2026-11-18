# Tradefolio — Trading Journal Platform

A multi-user, multi-strategy trading journal and analytics workspace.

## Current milestone: Phase 1 — Frontend foundation

The repository now contains a responsive Next.js dashboard foundation with:
- Overview metrics and an illustrative performance chart.
- Recent trade table with search.
- Demo trade entry form and primary-strategy selection.
- Strategy categories including Harmonic, SMC, ICT, Elliott Wave, Price Action, Breakout, and custom strategies.
- Responsive desktop and mobile layout.

**Important:** this is currently a frontend demo. Sample trades are illustrative, and new entries remain in browser memory only. Authentication, database persistence, tenant isolation, validated financial calculations, and broker/exchange synchronization are not implemented yet.

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Product principles

- Retrospective journal and analytics; not a trade execution or signal platform.
- No backtesting, historical tick simulation, or chart replay module.
- Strategy-agnostic architecture: Harmonic is an optional specialist strategy, not the platform's center.
- One primary strategy per trade, with multiple supporting confirmations planned.
- Provider integrations will be implemented only against verified APIs. Never commit API keys or secrets.

## Roadmap

1. Foundation, authentication, and secure user sessions.
2. Database schema, tenant isolation, and persistent journal.
3. Manual trade capture, execution grouping, and import model.
4. Risk management and tested financial calculations.
5. Dashboard analytics and multi-strategy performance.
6. Harmonic Analyzer as an optional specialist module.
7. Broker/exchange adapters, reviews, notifications, reports, administration, and subscriptions.
8. Security, QA, and deployment.

Features will be implemented in tested phases. A screen or placeholder will not be described as a completed backend feature.
