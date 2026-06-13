# Xeno CRM

AI-Native Mini CRM for shopper engagement.

## Architecture

```
frontend/          → Next.js + TypeScript + Tailwind (Vercel)
backend/crm-api/   → Express + TypeScript + Prisma  (Railway)
backend/channel-service/ → Express + TypeScript      (Railway)
```

## Setup

### 1. Install dependencies

```bash
cd frontend && npm install
cd backend/crm-api && npm install
cd backend/channel-service && npm install
```

### 2. Configure environment

```bash
# Copy example env files and fill in your values
cp backend/crm-api/.env.example backend/crm-api/.env
cp backend/channel-service/.env.example backend/channel-service/.env
```

### 3. Run database migrations

```bash
cd backend/crm-api && npx prisma migrate dev
```

### 4. Start services

```bash
# Terminal 1 - CRM API
cd backend/crm-api && npm run dev

# Terminal 2 - Channel Service
cd backend/channel-service && npm run dev

# Terminal 3 - Frontend
cd frontend && npm run dev
```

## Tech Stack

- **Frontend**: Next.js, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: Supabase PostgreSQL
- **ORM**: Prisma
- **AI**: Google Gemini API