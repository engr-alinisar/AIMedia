# AiMedia — Claude Code Configuration

## Project type
Full-stack .NET 8 + Angular (latest) SaaS application
Note: Spec calls for .NET 9, but .NET 8 SDK is installed. Upgrade by installing .NET 9 SDK and changing TargetFramework to net9.0 in all csproj files.

## Repository layout
```
AiMedia/
├── backend/          ← .NET solution (AiMedia.sln lives here)
│   ├── src/
│   │   ├── AiMedia.Domain/
│   │   ├── AiMedia.Application/
│   │   ├── AiMedia.Infrastructure/
│   │   ├── AiMedia.FalAi/    ← fal.ai integration
│   │   ├── AiMedia.API/
│   │   └── AiMedia.Worker/
│   ├── tests/AiMedia.Tests/
│   └── docker-compose.yml
├── frontend/         ← Angular project (npm workspace, no .csproj)
└── CLAUDE.md
```

## Backend conventions
- Clean Architecture: Domain → Application → Infrastructure → API
- CQRS via MediatR — commands in Application/Commands, queries in Application/Queries
- All DB columns snake_case (UseSnakeCaseNamingConvention)
- PostgreSQL enums for all domain enums (HasPostgresEnum<T>())
- JSONB for FalInput/FalOutput columns
- Repository pattern — IAppDbContext interface in Application, AppDbContext in Infrastructure
- Services registered as Scoped unless stateless (then Singleton)
- Always use ILogger<T> via constructor injection
- Polly policies defined in Infrastructure/Http/PollyPolicies.cs

## fal.ai integration
- All fal.ai code lives in AiMedia.FalAi project only
- Never call fal.ai directly from controllers or command handlers
- Always use webhook mode (queue.fal.run) — never sync mode for production
- Webhook endpoint: POST /api/webhooks/fal
- All endpoints in AiMedia.FalAi/ModelRouter.cs — single source of truth

## Credit rules
- Reserve on submit, deduct on success, release on failure
- CreditCalculator.cs (Application/Common/) is single source of truth for credit costs
- All credit changes go through CreditService — never update balance directly
- CreditService uses atomic SQL UPDATE to prevent race conditions

## Frontend conventions
- Angular latest standalone components only — no NgModules
- Signals for state — no NgRx
- SCSS + BEM naming: block__element--modifier
- HttpClient in services only — never in components
- Always unsubscribe from observables in components (takeUntilDestroyed)
- SignalR messages handled in SignalRService — broadcast via signals

## Testing
- Unit tests: xUnit + Moq for .NET
- Integration tests: WebApplicationFactory for API
- Angular: Jest unit tests for services and components

## Local development
- `cd backend && docker compose up -d` starts PostgreSQL 16 + Redis 7
- Connection string: `Host=localhost;Database=aimediadb;Username=aimedia;Password=aimedia_dev`
- Redis: `localhost:6379`
- Run migrations: `cd backend && dotnet ef database update --project src/AiMedia.Infrastructure --startup-project src/AiMedia.API`
- Run API: `cd backend && dotnet run --project src/AiMedia.API`
- Run frontend: `cd frontend && ng serve`

## Key environment variables
- DATABASE_URL / ConnectionStrings__DefaultConnection
- REDIS_URL
- FAL_API_KEY
- FAL_WEBHOOK_BASE_URL
- CF_R2_ACCOUNT_ID, CF_R2_ACCESS_KEY_ID, CF_R2_SECRET_KEY, CF_R2_BUCKET_NAME
- JWT__SECRET, JWT__ISSUER, JWT__AUDIENCE, JWT__EXPIRYHOURS
