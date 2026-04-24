# 📝 **BlotzTaskApp**

Check out our [website](https://blotz-website.vercel.app/) for more

⭐ Star us on GitHub — it motivates us a lot!

Blotz is an AI-native productivity app built specifically for people struggling with productivity and task management, especially the ADHD people. It transforms overwhelming tasks into clear micro-steps through intelligent breakdown, context-aware reminders, and a distraction-free interface—helping users conquer task paralysis and time blindness across web and mobile.

## 🎯 Project Goal

We aim to realign productivity tools with how ADHDs struggle with — eliminating anxiety and self-judgment through a system that adapts to your energy, celebrates small wins, and turns organization into confidence. Our goal is to make productivity a support system, not a daily battle.

## 📁 Project Structure

```
Blotz-Task-App/
├── blotztask-api/           # .NET 8 REST API backend
├── blotztask-ui/            # (Legacy) Next.js web application
├── blotztask-mobile/        # React Native mobile app (Expo)
└── infra/                   # Azure infrastructure (Bicep)
```

## 🛠️ Tech Stack

BlotzTaskApp utilizes a variety of modern technologies to ensure a robust, scalable, and maintainable codebase:

### 💻 Web Frontend (Legacy)

- **Framework:** Next.js 14
- **UI Components:** Radix UI, Shadcn
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Authentication:** NextAuth.js

### 📱 Mobile

- **Framework:** React Native (Expo)
- **Navigation:** Expo Router
- **Styling:** NativeWind (Tailwind CSS)
- **State Management:** Zustand
- **Data Fetching:** React Query
- **Authentication:** Auth0
- **Analytics:** PostHog
- **Error Tracking:** Sentry

### 🔧 Backend

- **Framework:** .NET 8
- **API:** REST API with SignalR
- **AI Integration:** Azure OpenAI, Semantic Kernel
- **Logging:** Serilog, Application Insights

### 💾 Data Layer

- **ORM:** Entity Framework Core
- **Database:** SQL Server

### ☁️ Cloud Service & Hosting

- **Repository:** GitHub
- **CI/CD:** GitHub Actions
- **Backend Hosting:** Azure Web App
- **Frontend Hosting:** Vercel
- **Mobile:** Expo
- **Infrastructure:** Azure SQL Database, Azure Key Vault, Azure OpenAI, Application Insights
- **IaC:** Bicep
