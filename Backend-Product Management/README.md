# Shop Billing + Inventory + Management System — Backend (Phase 1)

Production-minded backend implementation for multi-tenant retail shop billing and management, following `billing-product-plan(2).txt`.

## Tech Stack
- **Runtime**: Node.js (LTS >= 20, tested on v24)
- **Language**: TypeScript 5.7+ (strict mode enabled)
- **HTTP Server**: Express.js 4.21+
- **Database**: PostgreSQL (tested on PostgreSQL 18)
- **Database Access**: Parameterized `pg` connection pool with SQL schema migrations
- **Authentication**: JWT (`jsonwebtoken`) + BCrypt (`bcryptjs`) password hashing with rate-limited endpoints
- **Authorization**: Granular Role-Based Access Control (RBAC) enforced dynamically at service and middleware layers
- **Validation**: Strict schema validation via `zod`
- **Testing**: `vitest` + `supertest` automated test suite (unit, integration, multi-tenant isolation, RBAC)
- **Documentation**: OpenAPI 3.0 specification (`openapi.json` served at `/api/v1/docs/openapi.json`)

---

## Folder Structure

```
Backend-Product Management/
├── openapi.json                 # OpenAPI 3.0 machine-readable API specification
├── vitest.config.mjs            # Vitest test runner configuration
├── package.json                 # Project dependencies and operational scripts
├── tsconfig.json                # Strict TypeScript configuration
├── .env.example                 # Documented template of environment variables
├── .env                         # Local development environment configuration
├── .env.test                    # Isolated test database environment configuration
├── src/
│   ├── app.ts                   # Express app setup, CORS, Helmet, rate limiting, v1 routing
│   ├── server.ts                # HTTP server startup with graceful shutdown handler
│   ├── config/
│   │   └── env.ts               # Type-safe Zod parsed environment configuration
│   ├── db/
│   │   ├── pool.ts              # PostgreSQL connection pool with connection timeout & error handling
│   │   ├── schema.sql           # Schema definition with tables, foreign keys, and indexes
│   │   ├── migrate.ts           # Schema migration runner (CLI and programmatic)
│   │   └── seed.ts              # Idempotent permission catalogue and initial role seeding
│   ├── middleware/
│   │   ├── auth.ts              # JWT verification, RBAC permissions check, module gating
│   │   ├── errorHandler.ts      # Centralized error handler with safe Postgres error mapping
│   │   └── validate.ts          # Request body validation middleware
│   ├── routes/
│   │   ├── auth.ts              # Register, login, logout, password forgot/reset, me
│   │   ├── shops.ts             # Current shop retrieval and configuration updates
│   │   ├── users.ts             # User CRUD, status toggle, role assignment, owner safeguards
│   │   ├── roles.ts             # Roles listing, details, creation, permissions update, deletion
│   │   ├── permissions.ts       # Centralized permissions catalogue retrieval
│   │   ├── modules.ts           # Shop-specific module activation/deactivation
│   │   ├── employees.ts         # Employee profiles with sensitive salary masking
│   │   ├── auditLogs.ts         # Append-only audit logs with pagination and action filtering
│   │   ├── products.ts          # Tenant-isolated product inventory (Phase 2 preview)
│   │   └── categories.ts        # Tenant-isolated categories (Phase 2 preview)
│   ├── services/
│   │   └── authService.ts       # Shop onboarding, auth, password reset tokens, owner protection
│   ├── types/
│   │   ├── index.ts             # Core domain TypeScript interfaces
│   │   └── express.d.ts         # Express request augmentation for req.auth
│   └── utils/
│       ├── http.ts              # Consistent JSON success response and HttpError class
│       └── audit.ts             # Audit logger with secret redaction and transaction support
└── tests/
    ├── helpers.ts               # Test helpers, database truncation, and pool export
    ├── 01_auth_and_registration.test.ts # Shop setup, auth, JWT, password reset, logout
    ├── 02_rbac_and_roles.test.ts        # RBAC permissions, role CRUD, system role protection
    ├── 03_tenant_isolation.test.ts     # Cross-shop read, update, delete, and role assignment isolation
    ├── 04_modules_and_employees.test.ts # Module activation gating, salary masking, owner safeguards
    └── 05_audit_and_transactions.test.ts# Audit trail, secret redaction, transactional rollback, idempotency
```

---

## Database Entities & Relationships (Phase 1)

1. **`shops`**: Core tenant record (`id` UUID PK, `name`, `shop_type`, `gstin`, `currency`, `created_at`).
2. **`roles`**: Tenant-scoped roles (`id` UUID PK, `shop_id` FK, `name`, `description`, `is_system`, `created_at`). System roles (`Owner`, `Manager`, `Cashier/Staff`, `Accountant`) are protected against deletion.
3. **`users`**: Tenant-scoped accounts (`id` UUID PK, `shop_id` FK, `name`, `phone`, `email`, `password_hash`, `role_id` FK, `is_active`, `last_login`, `created_at`). Unique per shop on `(shop_id, email)`.
4. **`permissions`**: Centralized global permission catalogue (`id` UUID PK, `code` UNIQUE, `module`, `description`).
5. **`role_permissions`**: Composite PK `(role_id, permission_id)` mapping roles to granular permission codes.
6. **`shop_modules`**: Composite PK `(shop_id, module_name)` maintaining active/disabled toggle state (`employee`, `inventory`, `billing`).
7. **`employee_profiles`**: `user_id` (PK, FK `users`), `shop_id` FK, `designation`, `joining_date`, `salary` (`NUMERIC(12,2)`), `address`, `emergency_contact`, `updated_at`.
8. **`audit_logs`**: Append-only log of security and configuration mutations (`id` UUID PK, `shop_id` FK, `user_id` FK, `action`, `entity`, `entity_id`, `old_value` JSONB, `new_value` JSONB, `created_at`). Passwords and token hashes are sanitized.
9. **`password_reset_tokens`**: Secure expiring reset tokens (`id` UUID PK, `user_id` FK, `token_hash` VARCHAR, `expires_at`, `used_at`, `created_at`).
10. **`categories` & `products`**: Preserved for seamless Phase 2 inventory progression.

---

## API Endpoints Under `/api/v1`

| Method | Endpoint | Required Permission / Access | Description |
|---|---|---|---|
| `GET` | `/health` / `/api/v1/health` | Public | Health check and PostgreSQL readiness |
| `GET` | `/api/v1/docs/openapi.json` | Public | OpenAPI 3.0 specification |
| `POST` | `/api/v1/auth/register` | Public | Register new shop and initialize Owner |
| `POST` | `/api/v1/auth/register-shop` | Public | Backward-compatible alias for shop registration |
| `POST` | `/api/v1/auth/login` | Public (Rate-limited) | Authenticate user and issue JWT |
| `POST` | `/api/v1/auth/logout` | Authenticated | User logout with audit log entry |
| `POST` | `/api/v1/auth/password/forgot` | Public (Rate-limited) | Generate expiring password reset token |
| `POST` | `/api/v1/auth/password/reset` | Public (Rate-limited) | Reset password with token |
| `GET` | `/api/v1/auth/me` | Authenticated | Retrieve authenticated user profile |
| `GET` | `/api/v1/shops/current` | `shop.view` | Get current shop configuration |
| `PATCH` | `/api/v1/shops/current` | `shop.settings.manage` | Update shop details |
| `GET` | `/api/v1/users` | `users.view` | List users with pagination and search |
| `GET` | `/api/v1/users/:id` | `users.view` | Get user details |
| `POST` | `/api/v1/users` | `users.manage` | Create new user with role |
| `PATCH` | `/api/v1/users/:id` | `users.manage` | Update user personal details |
| `PATCH` | `/api/v1/users/:id/status` | `users.manage` | Activate/deactivate user (last owner protected) |
| `PATCH` | `/api/v1/users/:id/role` | `users.manage` | Reassign user role (owner protected) |
| `GET` | `/api/v1/roles` | `roles.view` | List shop roles with permissions |
| `GET` | `/api/v1/roles/:id` | `roles.view` | Get role details |
| `POST` | `/api/v1/roles` | `roles.manage` | Create custom role |
| `PATCH` | `/api/v1/roles/:id` | `roles.manage` | Update custom role |
| `DELETE` | `/api/v1/roles/:id` | `roles.manage` | Delete unassigned custom role |
| `PUT` | `/api/v1/roles/:id/permissions` | `roles.manage` | Update role permissions (Owner immutable) |
| `GET` | `/api/v1/permissions` | `roles.view` | Get system permission catalogue |
| `GET` | `/api/v1/modules` | `shop.view` | List all module toggle states |
| `GET` | `/api/v1/modules/enabled` | `shop.view` | List active modules |
| `PUT` | `/api/v1/modules/:moduleName` | `modules.manage` | Enable or disable module |
| `GET` | `/api/v1/employees` | `employee.view` + `employee` module | List employees (salary masked for unauthorized) |
| `GET` | `/api/v1/employees/:userId` | `employee.view` + `employee` module | Get employee profile (salary masked for non-owner/manager unless self) |
| `POST` | `/api/v1/employees` | `employee.manage` + `employee` module | Create employee profile and account |
| `PUT` | `/api/v1/employees/:userId` | `employee.manage` + `employee` module | Update employee profile details |
| `GET` | `/api/v1/audit-logs` | `audit.view` | Paginated audit logs with action/entity filters |
| `GET` | `/api/v1/audit-logs/:id` | `audit.view` | Get individual audit log entry |

*Note: All endpoints are also mirrored under `/api/*` for backwards compatibility with existing frontend code.*

---

## Setup & Running Instructions

### 1. Prerequisites
- Node.js >= 20.x installed
- PostgreSQL database running locally or in Docker

### 2. Environment Configuration
Create `.env` based on `.env.example`:
```env
NODE_ENV=development
PORT=8000
DATABASE_URL=postgresql://postgres:root@localhost:5432/product_management
JWT_SECRET=super_secret_jwt_key_that_is_at_least_32_characters_long_for_security_compliance
JWT_EXPIRES_IN=1d
CORS_ORIGIN=http://localhost:3000
BCRYPT_ROUNDS=12
```

For test execution, configure `.env.test`:
```env
NODE_ENV=test
PORT=8001
DATABASE_URL=postgresql://postgres:root@localhost:5432/product_management_test
JWT_SECRET=super_secret_jwt_key_that_is_at_least_32_characters_long_for_security_compliance
JWT_EXPIRES_IN=1d
CORS_ORIGIN=http://localhost:3000
BCRYPT_ROUNDS=10
```

### 3. Installation
```powershell
npm install
```

### 4. Database Initialization & Seeds
```powershell
npm run db:migrate
npm run db:seed
```

### 5. Running the Backend
Development mode with hot reload:
```powershell
npm run dev
```

Production build & start:
```powershell
npm run build
npm start
```

### 6. Running Automated Tests
```powershell
npm test
```
To run type checking:
```powershell
npm run typecheck
```

---

## Frontend Integration
In `Frontend-Product Management/frontend-product-management`, set `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```
Because the backend exposes both `/api/v1/*` and `/api/*`, the existing Next.js frontend connects without requiring any breaking changes.
