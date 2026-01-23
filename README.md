# iRate Backend - Production-Grade Node.js API

> Enterprise-level Nigerian Fintech Backend built with Clean Architecture, SOLID Principles & Domain-Driven Design

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green)](https://nodejs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-informational)](https://www.prisma.io/)
[![Express](https://img.shields.io/badge/Express-5.x-lightgrey)](https://expressjs.com/)

**📦 [Complete Postman Collection Available](./postman/)** - Ready-to-use API documentation for your team!

---

## 🎯 Overview

iRate Backend is a production-ready REST API for fintech operations in Nigeria, featuring wallet management, transactions, KYC verification, and comprehensive authentication.

**Built for interview success** - Every architectural decision is documented with explanations suitable for technical interviews at top Nigerian fintech companies.

---

## ✨ Key Features

### Architecture & Design

- ✅ **Clean Architecture** - Layered design with clear separation of concerns
- ✅ **SOLID Principles** - Every principle demonstrated with real examples
- ✅ **Repository Pattern** - Database-agnostic data access layer
- ✅ **Dependency Injection** - Loose coupling for testability
- ✅ **Domain-Driven Design** - Rich domain models with business logic

### Security

- 🔒 JWT Authentication with refresh tokens
- 🔒 Rate limiting (Redis-backed)
- 🔒 Brute-force protection
- 🔒 Input validation (Zod)
- 🔒 CORS configuration
- 🔒 HTTP-only cookies for tokens

### Performance

- ⚡ Redis caching
- ⚡ Database query optimization
- ⚡ Connection pooling
- ⚡ Cursor-based pagination
- ⚡ Background job processing (ready)

### Nigerian Fintech Specific

- 🇳🇬 Multi-currency wallet (NGN primary)
- 🇳🇬 BVN verification
- 🇳🇬 NIN verification
- 🇳🇬 KYC tiers (Tier 1, 2, 3)
- 🇳🇬 Transaction limits per tier
- 🇳🇬 Audit logging for compliance

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  HTTP Layer (Express)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │Controller│  │Middleware│  │Validators│              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
└───────┼─────────────┼─────────────┼────────────────────┘
        │             │             │
┌───────┼─────────────┼─────────────┼────────────────────┐
│       │    Application Layer (Use Cases)     │         │
│  ┌────▼────┐  ┌──────────┐  ┌──────────┐              │
│  │Services │  │Interfaces│  │   DTOs   │              │
│  └────┬────┘  └────┬─────┘  └──────────┘              │
└───────┼────────────┼────────────────────────────────────┘
        │            │
┌───────┼────────────┼────────────────────────────────────┐
│       │    Domain Layer (Business Logic)                │
│  ┌────▼────┐  ┌──────────┐  ┌──────────┐              │
│  │Entities │  │Value Objs│  │  Events  │              │
│  └─────────┘  └──────────┘  └──────────┘              │
└───────────────────────────────────────────────────────┘
        │
┌───────┼───────────────────────────────────────────────┐
│       │    Infrastructure Layer                        │
│  ┌────▼────┐  ┌──────────┐  ┌──────────┐             │
│  │Repositry│  │  Prisma  │  │  Redis   │             │
│  └─────────┘  └──────────┘  └──────────┘             │
└───────────────────────────────────────────────────────┘
```

### Layers Explained

1. **Presentation Layer** (`src/modules/*/`)
   - Controllers handle HTTP requests/responses
   - Middleware for auth, validation, logging
   - Routes define API endpoints

2. **Application Layer** (`src/application/`)
   - Services orchestrate business logic
   - Interfaces define contracts (repositories, services)
   - DTOs transfer data between layers

3. **Domain Layer** (`src/domain/`)
   - Entities represent business objects
   - Value objects for immutable concepts
   - Domain events for business occurrences

4. **Infrastructure Layer** (`src/infrastructure/`)
   - Repository implementations (Prisma)
   - External service integrations
   - Dependency injection container

---

## 📁 Project Structure

```
irate-backend/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
│
├── src/
│   ├── application/           # Use cases & interfaces
│   │   └── interfaces/
│   │       └── repositories/  # Repository interfaces
│   │           ├── IUserRepository.ts
│   │           ├── IWalletRepository.ts
│   │           └── ITransactionRepository.ts
│   │
│   ├── core/                  # Framework configuration
│   │   ├── app.ts             # Express app setup
│   │   ├── server.ts          # Server entry point
│   │   ├── config/            # Configuration
│   │   │   ├── env.ts
│   │   │   ├── prisma.ts
│   │   │   └── redis.ts
│   │   ├── errors/            # Custom error classes
│   │   ├── middleware/        # Global middleware
│   │   └── utils/             # Utilities
│   │
│   ├── domain/                # Business logic (TODO)
│   │   ├── entities/          # Rich domain models
│   │   ├── value-objects/     # Immutable values
│   │   └── events/            # Domain events
│   │
│   ├── infrastructure/        # External dependencies
│   │   ├── database/
│   │   │   └── repositories/  # Repository implementations
│   │   │       ├── PrismaUserRepository.ts
│   │   │       ├── PrismaWalletRepository.ts
│   │   │       └── PrismaTransactionRepository.ts
│   │   └── di/                # Dependency injection
│   │       ├── container.ts
│   │       └── serviceContainer.ts
│   │
│   └── modules/               # Feature modules
│       ├── auth/
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   ├── auth.routes.ts
│       │   └── auth.schema.ts
│       ├── wallet/
│       ├── transaction/
│       ├── kyc/
│       └── admin/
│
├── BACKEND_ARCHITECTURE.md    # Architecture documentation
├── MIGRATION_GUIDE.md         # Refactoring guide
└── README.md                  # This file
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x or higher
- PostgreSQL 14.x or higher
- Redis 7.x or higher
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd irate-backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your values:

   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/irate_db"

   # Redis
   REDIS_URL="redis://localhost:6379"

   # JWT
   JWT_SECRET="your-secret-key-min-32-characters"
   JWT_REFRESH_SECRET="your-refresh-secret-min-32-characters"

   # Server
   PORT=4000
   NODE_ENV=development
   ```

4. **Run database migrations**

   ```bash
   npm run migrate
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:4000`

---

## 📚 API Documentation

### 🎯 Quick Start with Postman

**Complete Postman collection available in [`./postman/`](./postman/) folder!**

1. Import `iRate-API.postman_collection.json` into Postman
2. Import `iRate-Local.postman_environment.json` for local testing
3. All endpoints documented with examples and automatic token handling
4. See [Postman README](./postman/README.md) for detailed usage guide

### Base URL

```
http://localhost:4000/api/v1
```

### Authentication Endpoints

#### Register User

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "phoneNumber": "08012345678"
}
```

**Response:**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

#### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "USER"
  }
}
```

_Note: Refresh token is set as HTTP-only cookie_

#### Refresh Token

```http
POST /auth/refresh
Cookie: refreshToken=<refresh_token>
```

#### Logout

```http
POST /auth/logout
Authorization: Bearer <access_token>
```

### Wallet Endpoints

#### Get Wallet Balance

```http
GET /wallet/balance
Authorization: Bearer <access_token>
```

#### Fund Wallet

```http
POST /wallet/fund
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "amount": 5000,
  "paymentMethod": "card"
}
```

### Transaction Endpoints

#### Transfer Funds

```http
POST /transaction/transfer
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "toWalletId": "uuid",
  "amount": 1000,
  "description": "Payment for services"
}
```

#### Get Transaction History

```http
GET /transaction/history?page=1&limit=20
Authorization: Bearer <access_token>
```

---

## 🧪 Testing

### Run Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Test coverage
npm run test:coverage
```

### Example Unit Test (with Repository Mock)

```typescript
import { AuthService } from "../auth.service";
import { IUserRepository } from "../../application/interfaces/repositories/IUserRepository";

describe("AuthService", () => {
  let authService: AuthService;
  let mockUserRepo: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    mockUserRepo = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    } as any;

    authService = new AuthService(mockUserRepo);
  });

  it("should register new user", async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null);
    mockUserRepo.create.mockResolvedValue({
      id: "1",
      email: "test@test.com",
    } as any);

    const result = await authService.register("test@test.com", "password");

    expect(mockUserRepo.create).toHaveBeenCalled();
    expect(result.email).toBe("test@test.com");
  });
});
```

---

## 🔧 Scripts

```bash
# Development
npm run dev              # Start with nodemon (hot reload)

# Production
npm run build            # Compile TypeScript
npm start                # Start production server

# Database
npm run migrate          # Run migrations
npm run deploy:migrate   # Deploy migrations (production)

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format with Prettier
npm run type-check       # TypeScript type checking
```

---

## 📖 Documentation

- **[BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md)** - Comprehensive architecture guide with SOLID principles, design patterns, and interview talking points
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Step-by-step guide to refactor existing code to new architecture

---

## 🎯 SOLID Principles in Action

### Single Responsibility Principle

- **Controllers**: HTTP handling only
- **Services**: Business logic orchestration
- **Repositories**: Data access only

### Open/Closed Principle

- Strategy pattern for payment methods
- Repository pattern allows database swapping

### Liskov Substitution Principle

- Any repository implementation can replace another
- Mock repositories in tests

### Interface Segregation Principle

- Focused interfaces (IUserRepository, IWalletRepository)
- Clients depend only on methods they need

### Dependency Inversion Principle

- Services depend on repository interfaces
- High-level modules don't depend on low-level modules

---

## 🔒 Security Features

### Authentication

- JWT with short-lived access tokens (15 minutes)
- Long-lived refresh tokens (7 days)
- Refresh tokens stored in Redis
- HTTP-only cookies prevent XSS attacks

### Authorization

- Role-based access control (USER, ADMIN)
- Route-level protection
- Resource ownership validation

### Rate Limiting

- Global: 30 requests/minute
- Auth endpoints: 5 attempts/15 minutes
- Transaction endpoints: 10 requests/minute

### Input Validation

- Zod schemas for all endpoints
- SQL injection prevention (Prisma)
- XSS protection (sanitization)

### Brute Force Protection

- Failed login attempts tracked in Redis
- Account lockout after 5 failed attempts
- 5-minute cooldown period

---

## 🚀 Deployment

### Environment Variables (Production)

```env
NODE_ENV=production
DATABASE_URL="postgresql://user:password@prod-db:5432/irate_db"
REDIS_URL="redis://prod-redis:6379"
JWT_SECRET="<64-character-random-string>"
JWT_REFRESH_SECRET="<64-character-random-string>"
PORT=4000
```

### Docker Deployment

```bash
# Build image
docker build -t irate-backend .

# Run container
docker run -p 4000:4000 --env-file .env irate-backend
```

### Health Check

```http
GET /health
```

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2026-01-19T10:30:00.000Z"
}
```

---

## 📊 Performance Optimizations

1. **Database Query Optimization**
   - Eager loading with Prisma `include`
   - Selective field loading with `select`
   - Cursor-based pagination for large datasets
   - Database connection pooling

2. **Caching Strategy**
   - Redis for frequently accessed data
   - Cache-aside pattern
   - Cache invalidation on updates
   - 5-minute TTL for user data

3. **Background Jobs** (Ready for implementation)
   - BullMQ for email notifications
   - Async KYC verification
   - Transaction reconciliation

---

## 🎤 Interview Preparation

### Common Questions & Answers

**Q: "Explain your backend architecture."**

> "I implemented Clean Architecture with four layers: Presentation (controllers, routes), Application (services, interfaces), Domain (business logic), and Infrastructure (database, cache). Each layer has a single responsibility and dependencies point inward, making the code testable and maintainable."

**Q: "Why use Repository Pattern?"**

> "The Repository Pattern abstracts data access. My services depend on IUserRepository interface, not Prisma. This makes code testable with mock repositories, and portable—I can switch to MongoDB by creating MongoUserRepository without changing business logic."

**Q: "How do you handle security?"**

> "Multiple layers: JWT authentication with refresh tokens, rate limiting per endpoint, brute-force protection in Redis, input validation with Zod, and CORS configuration. Refresh tokens are HTTP-only cookies to prevent XSS, and failed logins are tracked to prevent brute-force attacks."

**Q: "How does your architecture support scalability?"**

> "The stateless design with JWT tokens allows horizontal scaling. Redis handles caching and session management. The layered architecture allows teams to work independently—frontend uses DTOs, backend works on services, database team optimizes repositories. Clear interfaces prevent tight coupling."

### More Questions in:

- [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md#-interview-talking-points)

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📝 License

This project is licensed under the ISC License.

---

## 👥 Team

Built with 💚 for Nigerian Fintech Excellence

---

## 🔗 Resources

- [Clean Architecture by Robert Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [Dependency Injection](https://martinfowler.com/articles/injection.html)

---

**Ready for Production | Built for Interviews | Designed for Scale**
