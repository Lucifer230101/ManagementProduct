# Shop Billing + Inventory + Management System

Full-stack production platform for local retail shops (Kirana, Clothing, Pharmacy, Electronics, Hardware, General Retail) adhering to `billing-product-plan(2).txt`.

---

## Project Structure

```
ManagementProduct/
├── Backend-Product Management/     # Node.js + TypeScript + Express + PostgreSQL REST API
│   ├── src/                        # Express API, RBAC middleware, routes, migrations, seeds
│   ├── tests/                      # Automated Vitest test suite (47 passed tests)
│   ├── openapi.json                # OpenAPI 3.0 specification
│   ├── README.md                   # Backend documentation and API reference
│   └── package.json
│
└── Frontend-Product Management/    # Next.js 16 + React 19 + MUI + Redux Toolkit Web App
    ├── src/                        # App Router pages, auth layout, services, Redux store
    ├── .env.example                # Frontend environment template
    ├── README.md                   # Frontend running and integration guide
    └── package.json
```

---

## Quick Start (Run Both Backend & Frontend)

### 1. Start PostgreSQL
Ensure PostgreSQL is running locally on port 5432 with a database named `product_management`.

### 2. Start Backend API (Port 8000)
```powershell
cd "Backend-Product Management"

# Install dependencies (first time only)
npm install

# Run database schema migrations & permission seeds
npm run db:migrate
npm run db:seed

# Optional: seed demo shop and owner credentials
npm run db:seed:demo

# Start backend server
npm run dev
```
*Backend health check*: **[http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)*

---

### 3. Start Frontend Web App (Port 3000)
Open a new terminal window:
```powershell
cd "Frontend-Product Management"

# Install dependencies (first time only)
npm install

# Start Next.js development server
npm run dev
```
*Frontend URL*: **[http://localhost:3000](http://localhost:3000)** (redirects to `/login`)

---

## Ready-to-Use Demo Credentials
- **Email**: `owner@example.com`
- **Password**: `Password123!`
- **Role**: `Owner`
- **Shop**: Metro General Store

Or click **"Create an account"** at `http://localhost:3000/register` to register your own shop.
