# OnServe

> Location-secure, trust-first marketplace connecting South Africans to on-demand services.

## Quick Links

- [Architecture Document](./docs/architecture/ARCHITECTURE.md)
- [Project Plan](./docs/architecture/PROJECT_PLAN.md)
- [C4 Diagrams](./docs/diagrams/C4_DIAGRAMS.md)
- [ERD](./docs/diagrams/ERD.md)
- [Architecture Decision Records](./docs/adr/ADRs.md)

## Stack

| Layer | Technology |
|---|---|
| Web | React 18 + TypeScript + Vite + Tailwind |
| Mobile | React Native + Expo |
| Backend | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| State | TanStack Query + Zustand |
| Monorepo | Turborepo |
| Payments | Yoco |
| Maps | Google Maps API |
| AI | Anthropic Claude API |

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Start development
npm run dev
```

## Project Structure

```
onserve/
├── apps/
│   ├── web/        # React web app
│   ├── mobile/     # React Native app
│   └── api/        # Supabase Edge Functions
├── packages/
│   ├── types/      # Shared TypeScript types
│   ├── shared/     # Business logic + utils
│   └── ui/         # Shared UI components
└── docs/           # Architecture + diagrams
```

## Development Phases

- **Phase 0** ✅ Architecture & Design
- **Phase 1** 🔲 Foundation (Monorepo + Auth + DB)
- **Phase 2** 🔲 Core Marketplace
- **Phase 3** 🔲 Trust & Payments
- **Phase 4** 🔲 Polish & Mobile

## Contributing

- TypeScript strict mode — no `any` without justification
- Conventional commits (`feat:`, `fix:`, `chore:`)
- Tests alongside features (Vitest)
- Services pattern — no direct Supabase calls in components
- Mobile-first, accessible by default
