# BlotzTask

<p align="center">
  <strong>AI-native productivity for turning overwhelming tasks into clear, doable steps.</strong>
</p>

<p align="center">
  <a href="https://blotz-website.vercel.app/">Website</a>
  ·
  <a href="#project-structure">Project Structure</a>
  ·
  <a href="#quick-start">Quick Start</a>
  ·
  <a href="#tech-stack">Tech Stack</a>
</p>

<p align="center">
  <img alt=".NET 10" src="https://img.shields.io/badge/.NET-10.0-512BD4?style=for-the-badge&logo=dotnet&logoColor=white" />
  <img alt="Expo" src="https://img.shields.io/badge/Expo-55-000020?style=for-the-badge&logo=expo&logoColor=white" />
  <img alt="React Native" src="https://img.shields.io/badge/React%20Native-0.83-61DAFB?style=for-the-badge&logo=react&logoColor=111111" />
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
</p>

## What Is BlotzTask?

BlotzTask is an AI-native productivity app built for people who struggle with task management, especially people dealing with ADHD, task paralysis, and time blindness.

The product turns large, stressful tasks into clear micro-steps, pairs them with context-aware reminders, and keeps the experience focused so planning feels supportive instead of punishing.

## Product Goal

BlotzTask aims to make productivity feel like a support system:

- Break overwhelming work into small next actions.
- Help users plan around energy, context, and timing.
- Reduce anxiety and self-judgment around unfinished tasks.
- Build confidence through visible progress and small wins.

## Project Structure

```text
Blotz-Task-App/
├── blotztask-api/          # .NET 10 REST API backend
├── blotztask-mobile/       # Expo React Native mobile app
├── blotztask-devtools/     # Next.js internal devtools app
├── blotztask-test/         # .NET 10 xUnit test project
├── infra/                  # Azure infrastructure as code
├── .github/workflows/      # GitHub Actions workflows
└── README.md
```

## Tech Stack

| Area | Stack |
| --- | --- |
| Mobile app | Expo 55, React Native 0.83, React 19, Expo Router |
| Mobile styling | NativeWind, Tailwind CSS, Expo fonts |
| Mobile state/data | Zustand, TanStack React Query, Axios |
| Mobile forms | React Hook Form, Zod |
| Mobile auth | Auth0 |
| Mobile observability | Sentry, PostHog |
| Backend | .NET 10, ASP.NET Core, REST API, SignalR |
| Backend data | Entity Framework Core 10, SQL Server |
| Backend AI | Azure OpenAI, Azure AI Projects, Microsoft Agents AI |
| Backend observability | Serilog, Application Insights, OpenTelemetry |
| Devtools | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Biome |
| Tests | xUnit, FluentAssertions, Testcontainers for SQL Server |
| Cloud/infra | Azure Web App, Azure SQL, Key Vault, Application Insights, Bicep |

## Quick Start

### Backend API

```bash
cd blotztask-api
dotnet restore
dotnet run
```

### Mobile App

```bash
cd blotztask-mobile
npm install
npm run start
```

Common mobile commands:

```bash
npm run ios
npm run android
npm run web
npm run lint
```

### Devtools App

```bash
cd blotztask-devtools
npm install
npm run dev
```

### Tests

```bash
dotnet test blotztask-test/BlotzTask.Tests.csproj
```

## Main Capabilities

- AI-assisted task breakdown.
- Task, note, and planning workflows.
- Context-aware reminders and scheduling support.
- Authenticated mobile experience.
- API-backed persistence with SQL Server.
- Internal devtools for evaluation and development workflows.

## Development Notes

- The backend and test projects target `net10.0`.
- The mobile app is the primary user-facing client.
- The devtools app is separate from the mobile app and uses its own Next.js stack.
- Keep repo documentation aligned with the actual package files when versions change.

## Links

- Website: https://blotz-website.vercel.app/