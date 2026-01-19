# iRate Backend Migration Guide

## 🎯 Migrating to Clean Architecture

This guide helps you refactor existing code to follow the new production-grade architecture with SOLID principles, Repository Pattern, and Dependency Injection.

---

## 📋 Migration Steps

### Step 1: Understand the New Structure

```
src/
├── presentation/          # NEW: HTTP layer
│   └── (controllers, routes, middleware)
├── application/          # NEW: Use cases
│   ├── interfaces/
│   │   └── repositories/ # Repository interfaces
│   ├── services/
│   ├── dtos/
│   └── mappers/
├── domain/               # Business logic (framework-agnostic)
│   ├── entities/
│   ├── value-objects/
│   └── events/
└── infrastructure/       # NEW: External dependencies
    ├── database/
    │   └── repositories/ # Repository implementations
    └── di/               # Dependency injection
```

### Step 2: Create Repository Interface

**Before (Direct Prisma access):**

```typescript
// auth.service.ts
export class AuthService {
  async register(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    // ...
  }
}
```

**After (Repository Pattern):**

```typescript
// 1. Create interface: application/interfaces/repositories/IUserRepository.ts
export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
  // ... other methods
}

// 2. Create implementation: infrastructure/database/repositories/PrismaUserRepository.ts
export class PrismaUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async create(data: CreateUserData): Promise<User> {
    return prisma.user.create({ data });
  }
}

// 3. Update service to use interface
export class AuthService {
  constructor(private userRepository: IUserRepository) {}

  async register(email: string, password: string) {
    const user = await this.userRepository.findByEmail(email);
    // ...
  }
}
```

### Step 3: Register Services in DI Container

```typescript
// infrastructure/di/serviceContainer.ts
import { container } from "./container";
import { PrismaUserRepository } from "../database/repositories";
import { AuthService } from "../../modules/auth/auth.service";

export function initializeContainer() {
  // Register repositories
  container.register("IUserRepository", () => new PrismaUserRepository());

  // Register services with dependencies
  container.register(
    "AuthService",
    () => new AuthService(container.resolve("IUserRepository")),
  );
}
```

### Step 4: Update Controllers to Use DI

**Before:**

```typescript
// auth.controller.ts
const authService = new AuthService(); // ❌ Hard-coded dependency

export class AuthController {
  register = async (req: Request, res: Response) => {
    await authService.register(req.body.email, req.body.password);
  };
}
```

**After:**

```typescript
// auth.controller.ts
import { getService } from "@infrastructure/di/serviceContainer";

export class AuthController {
  register = async (req: Request, res: Response) => {
    const authService = getService<AuthService>("AuthService");
    await authService.register(req.body.email, req.body.password);
  };
}
```

### Step 5: Initialize Container on Startup

```typescript
// core/app.ts
import { initializeContainer } from "@infrastructure/di/serviceContainer";

export const createApp = async () => {
  const app = express();

  // Initialize DI container first
  initializeContainer();

  // ... rest of app setup
};
```

---

## 🔄 Module Migration Checklist

Use this checklist for each module (auth, wallet, transaction, etc.):

### For Each Module:

- [ ] **Step 1:** Create repository interface in `application/interfaces/repositories/`
  - [ ] Define all data access methods
  - [ ] Create DTOs for create/update operations
  - [ ] Add type definitions for filters

- [ ] **Step 2:** Implement repository in `infrastructure/database/repositories/`
  - [ ] Implement all interface methods
  - [ ] Use Prisma for database operations
  - [ ] Add error handling
  - [ ] Export from `index.ts`

- [ ] **Step 3:** Refactor service
  - [ ] Add repository dependency in constructor
  - [ ] Replace direct Prisma calls with repository methods
  - [ ] Keep business logic in service
  - [ ] Move database queries to repository

- [ ] **Step 4:** Update controller
  - [ ] Remove direct service instantiation
  - [ ] Use `getService()` to resolve service
  - [ ] Keep only HTTP concerns in controller

- [ ] **Step 5:** Register in DI container
  - [ ] Add repository registration
  - [ ] Add service registration with dependencies
  - [ ] Test dependency resolution

---

## 📚 Common Patterns

### Pattern 1: Query with Filters

```typescript
// Interface
export interface UserFilters {
  email?: string;
  role?: string;
  status?: string;
  skip?: number;
  take?: number;
}

export interface IUserRepository {
  findMany(filters: UserFilters): Promise<User[]>;
}

// Implementation
export class PrismaUserRepository implements IUserRepository {
  async findMany(filters: UserFilters): Promise<User[]> {
    return prisma.user.findMany({
      where: this.buildWhereClause(filters),
      skip: filters.skip,
      take: filters.take,
    });
  }

  private buildWhereClause(filters: UserFilters): Prisma.UserWhereInput {
    return {
      ...(filters.email && { email: { contains: filters.email } }),
      ...(filters.role && { role: filters.role }),
      ...(filters.status && { status: filters.status }),
    };
  }
}
```

### Pattern 2: Transactions Across Repositories

```typescript
// Use Prisma $transaction
async transfer(fromWalletId: string, toWalletId: string, amount: number) {
  await prisma.$transaction(async (tx) => {
    // All operations use same transaction
    await tx.wallet.update({
      where: { id: fromWalletId },
      data: { balance: { decrement: amount } },
    });

    await tx.wallet.update({
      where: { id: toWalletId },
      data: { balance: { increment: amount } },
    });

    await tx.transaction.create({
      data: { fromWalletId, toWalletId, amount },
    });
  });
}
```

### Pattern 3: Rich Domain Entities (Optional Advanced)

```typescript
// domain/entities/Wallet.ts
export class Wallet {
  private constructor(
    public readonly id: string,
    private _balance: number,
    public readonly currency: string,
  ) {}

  get balance(): number {
    return this._balance;
  }

  // Business logic in entity
  withdraw(amount: number): void {
    if (amount > this._balance) {
      throw new InsufficientFundsError(this._balance, amount);
    }
    this._balance -= amount;
  }

  deposit(amount: number): void {
    if (amount <= 0) {
      throw new DomainError("Amount must be positive");
    }
    this._balance += amount;
  }

  // Factory method
  static create(userId: string, currency: string): Wallet {
    return new Wallet(generateId(), 0, currency);
  }
}
```

---

## 🧪 Testing with New Architecture

### Unit Test (Service with Mock Repository)

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

## 🎯 Benefits of New Architecture

### 1. Testability

**Before:** Hard to test - must mock Prisma globally

```typescript
jest.mock("@prisma/client");
// Complex setup
```

**After:** Easy to test - inject mock repository

```typescript
const mockRepo = { findById: jest.fn() };
const service = new UserService(mockRepo);
```

### 2. Flexibility

**Before:** Tightly coupled to Prisma

```typescript
// Switching to MongoDB requires rewriting all services
```

**After:** Database-agnostic

```typescript
// Just create MongoUserRepository implementing IUserRepository
container.register("IUserRepository", () => new MongoUserRepository());
```

### 3. Maintainability

**Before:** Business logic mixed with data access

```typescript
async transfer() {
  // Validation logic
  // Prisma queries
  // More validation
  // More Prisma queries
  // Business rules
}
```

**After:** Clear separation

```typescript
// Service: Business logic only
async transfer() {
  const wallet = await this.walletRepo.findById(id);
  wallet.withdraw(amount); // Domain logic
  await this.walletRepo.update(wallet);
}

// Repository: Data access only
async update(wallet: Wallet) {
  return prisma.wallet.update({ ... });
}
```

---

## 🚨 Common Mistakes to Avoid

### ❌ Don't Access Prisma in Services

```typescript
// BAD
export class UserService {
  async getUser(id: string) {
    return prisma.user.findUnique({ where: { id } }); // ❌
  }
}
```

### ✅ Use Repository

```typescript
// GOOD
export class UserService {
  constructor(private userRepo: IUserRepository) {}

  async getUser(id: string) {
    return this.userRepo.findById(id); // ✅
  }
}
```

### ❌ Don't Put Business Logic in Repositories

```typescript
// BAD
export class PrismaUserRepository {
  async createUser(email: string) {
    // Business validation ❌
    if (!email.includes("@")) throw new Error("Invalid email");

    return prisma.user.create({ data: { email } });
  }
}
```

### ✅ Keep Repositories for Data Access Only

```typescript
// GOOD - Validation in service
export class UserService {
  async createUser(email: string) {
    // Business validation ✅
    if (!email.includes("@")) throw new ValidationError("Invalid email");

    return this.userRepo.create({ email });
  }
}

// Repository: Just data access
export class PrismaUserRepository {
  async create(data: CreateUserData) {
    return prisma.user.create({ data });
  }
}
```

---

## 📈 Migration Progress Tracker

### Phase 1: Foundation ✅

- [x] Create DI container
- [x] Set up folder structure
- [x] Document architecture

### Phase 2: Core Modules

- [x] Auth module
  - [x] IUserRepository
  - [x] PrismaUserRepository
  - [x] Refactor AuthService
  - [x] Update AuthController
- [ ] Wallet module
  - [x] IWalletRepository
  - [x] PrismaWalletRepository
  - [ ] Refactor WalletService
  - [ ] Update WalletController
- [ ] Transaction module
  - [x] ITransactionRepository
  - [x] PrismaTransactionRepository
  - [ ] Refactor TransactionService
  - [ ] Update TransactionController

### Phase 3: Advanced Features

- [ ] Domain entities with behavior
- [ ] Domain events
- [ ] CQRS pattern (optional)
- [ ] Event sourcing (optional)

---

## 🎤 Interview Talking Points

**Q: "Why did you refactor to use repositories?"**

> "I implemented the Repository Pattern to abstract data access from business logic. Now my AuthService depends on IUserRepository interface, not Prisma directly. This makes the code testable—I can inject mock repositories—and portable—I can switch to MongoDB by creating MongoUserRepository without touching business logic."

**Q: "What is dependency injection and why use it?"**

> "Dependency Injection inverts control of object creation. Instead of `new AuthService()`, I register services in a container and resolve them. This loose coupling makes code testable (inject mocks), configurable (swap implementations), and maintainable (single source for dependencies)."

**Q: "How does this help with scalability?"**

> "The layered architecture allows teams to work in parallel. Frontend team uses DTOs, backend team works on services, database team optimizes repositories. Each layer has clear contracts (interfaces), so changes are isolated. We can also scale horizontally since services are stateless."

---

**Remember:** Migration is iterative. Start with one module, validate the approach, then scale to others. Don't try to refactor everything at once!
