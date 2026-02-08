# 🧠 Cortex: The Visual Data Commander

Cortex is a production-grade, identity-aware generative database management platform. It transforms complex database interactions into intuitive natural language conversations with state-of-the-art Generative UI components.

## 🚀 Features

- **Generative UI**: Intelligent rendering of Graphs, Tables, and Interactive Schemas.
- **Identity-Aware**: Role-based access control (RBAC) integrated into the core conversation loop.
- **Visual Schema**: Interactive ReactFlow-based schema visualization and modification.
- **Mission Control**: Centralized dashboard for business intelligence and system monitoring.
- **Production Ready**: Built with Next.js 15+, Prisma, Better-Auth, and Tailwind CSS.

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Database**: [Prisma](https://www.prisma.io/) (PostgreSQL/SQLite)
- **Authentication**: [Better-Auth](https://better-auth.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/)
- **Visualization**: [ReactFlow](https://reactflow.dev/), [Recharts](https://recharts.org/)

## 🏁 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL (or use the included SQLite for local dev)

### Local Development

1. **Clone the repository**
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure environment**:
   Copy `.env-example` to `.env` and fill in the required values.
4. **Setup the database**:
   ```bash
   npx prisma migrate dev
   npm run db:setup
   ```
5. **Start the development server**:
   ```bash
   npm run dev
   ```

## 🚢 Production Deployment

### Docker (Recommended)

Cortex is optimized for containerized deployments.

1. **Build the image**:
   ```bash
   docker build -t cortex-visual-commander .
   ```
2. **Run with Docker Compose**:
   ```bash
   docker-compose up -d
   ```

### Health Monitoring

Monitor system health via the `/api/health` endpoint.

## 🔒 Security

- All administrative actions are protected via server-side session validation.
- Input validation is enforced using Zod schemas.
- Structured logging provides full observability of system events.

---

Built for the **Generative UI Hackathon**. Powered by AI.
