# Backend - Product Management

Backend starter for the supplied Next.js frontend and the billing/product plan. Stack: Node.js, Express, TypeScript and PostgreSQL.

## Included
- Health check and versioned `/api` routes
- Shop registration and login using JWT + bcrypt
- Tenant-scoped products and categories CRUD with pagination
- Shared permission model, roles, role permissions, module toggles
- Employee profile management, user activation/deactivation
- Audit log for important changes
- SQL schema and permission seed data
- Helmet, CORS allow-list, login rate limit, request validation and centralized errors

## Requirements
- Node.js 20+
- Docker Desktop (recommended) or PostgreSQL 14+
- npm

## Run locally (PowerShell)
1. Open this folder in VS Code.
2. Copy `.env.example` to `.env`; set a strong `JWT_SECRET`.
3. Start PostgreSQL: `docker compose up -d`
4. Install dependencies: `npm install`
5. Create schema and seed permissions: `npm run db:migrate` then `npm run db:seed`
6. Start API: `npm run dev`
7. Test `http://localhost:8000/api/health`

The included Compose file uses `local_dev_password`; update `DATABASE_URL` in `.env` to:
`postgresql://postgres:local_dev_password@localhost:5432/product_management`

## Frontend connection
Set the frontend `.env.local`:
`NEXT_PUBLIC_API_URL=http://localhost:8000/api`

Expected product API paths match the existing frontend service intent:
- `GET /api/products?page=1&limit=10`
- `GET /api/products/:id`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`
- `GET /api/categories`
- `POST /api/categories`

Product responses use `{ success, message, data }`; product list additionally includes `total`, `page`, `limit`.

## First shop setup
`POST /api/auth/register-shop` accepts:
```json
{
  "shopName": "Demo General Store",
  "shopType": "general",
  "currency": "INR",
  "name": "Shop Owner",
  "email": "owner@example.com",
  "phone": "9876543210",
  "password": "ChangeThisPassword123!"
}
```
It creates a shop, owner user, system roles, default module switches and returns a JWT. Save the token and send `Authorization: Bearer <token>` on protected routes.

Login: `POST /api/auth/login` with `{ "email": "...", "password": "..." }`.
For v1, login email is unique within a shop in the schema; if you later allow the same email across shops, change login to require a shop identifier or slug.

## Product payload
```json
{
  "name": "Notebook",
  "description": "A5 ruled notebook",
  "price": 45.5,
  "categoryId": "UUID returned by categories API",
  "stock": 30,
  "imageUrl": null
}
```
`categoryId` is optional. `category` is also included in response as a name for the current frontend's Product type.

## API overview
- `GET /api/health`
- `POST /api/auth/register-shop`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET/POST/PUT/DELETE /api/products`
- `GET/POST/PUT/DELETE /api/categories`
- `GET/POST /api/roles`, `GET /api/permissions`
- `GET/PATCH /api/modules`
- `GET/POST /api/employees`, `PATCH /api/employees/:userId`
- `GET /api/audit-logs`

Permissions are checked on the backend. Owner is treated as full-access. Customers and suppliers are records, not login roles, as specified in the plan.

## Important implementation notes
- This is a development-ready foundation, not a complete production billing system.
- Billing, invoices, payments, inventory movement ledger, supplier purchasing, returns/credit notes, password reset/email delivery, refresh-token rotation, and subscription billing are not implemented yet.
- Product `stock` is a simple initial field. Before billing goes live, implement transactional stock movements and immutable finalized invoices.
- For production, use HTTPS, managed database backups, secrets manager, migrations in deployment pipeline, monitoring, and security review.
