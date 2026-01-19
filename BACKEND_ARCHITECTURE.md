# iRate Backend - Production-Grade Architecture

> **Enterprise Node.js/Express API with Clean Architecture, SOLID Principles & Domain-Driven Design**

This document serves as both a comprehensive guide to the backend architecture and your preparation material for technical interviews at Nigerian fintech companies.

---

## 📚 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [SOLID Principles in Node.js](#solid-principles-in-nodejs)
3. [Clean Architecture Layers](#clean-architecture-layers)
4. [Design Patterns](#design-patterns)
5. [Dependency Injection](#dependency-injection)
6. [Repository Pattern](#repository-pattern)
7. [Domain-Driven Design](#domain-driven-design)
8. [Error Handling Strategy](#error-handling-strategy)
9. [Security Best Practices](#security-best-practices)
10. [Performance & Scalability](#performance--scalability)
11. [Testing Strategy](#testing-strategy)
12. [Interview Talking Points](#interview-talking-points)

---

## 🏗️ Architecture Overview

### The Big Picture

```
┌─────────────────────────────────────────────────────────────┐
│                     API Layer (REST)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Controllers│  │Middleware│  │Validators│  │   DTOs   │   │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘  └─────┬────┘   │
└────────┼─────────────┼─────────────┼─────────────┼─────────┘
         │             │             │             │
┌────────┼─────────────┼─────────────┼─────────────┼─────────┐
│        │    Application Layer (Use Cases)        │         │
│  ┌─────▼────┐  ┌──────────┐  ┌──────────┐  ┌────▼─────┐  │
│  │ Services │  │  Events  │  │Interfaces│  │  Mappers │  │
│  └─────┬────┘  └────┬─────┘  └─────┬────┘  └──────────┘  │
└────────┼────────────┼──────────────┼─────────────────────┘
         │            │              │
┌────────┼────────────┼──────────────┼─────────────────────┐
│        │       Domain Layer         │                     │
│  ┌─────▼────┐  ┌───▼──────┐  ┌─────▼────┐  ┌──────────┐ │
│  │Entities  │  │Value Objs│  │Domain Svc│  │  Events  │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
└───────────────────────────────────────────────────────────┘
         │
┌────────┼───────────────────────────────────────────────────┐
│        │    Infrastructure Layer                           │
│  ┌─────▼────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │Repositry │  │  Prisma  │  │  Redis   │  │ External │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└───────────────────────────────────────────────────────────┘
```

### Why This Architecture?

**For Interviews, Emphasize:**

- **Separation of Concerns**: Each layer has a single responsibility
- **Dependency Inversion**: High-level modules don't depend on low-level modules
- **Testability**: Each layer can be tested in isolation
- **Scalability**: Easy to add features without modifying existing code
- **Maintainability**: Clear structure makes onboarding and debugging faster

---

## 🎯 SOLID Principles in Node.js

### 1. Single Responsibility Principle (SRP)

**❌ Before (Violates SRP):**

```typescript
// auth.service.ts - Does TOO MUCH
export class AuthService {
  async register(email: string, password: string) {
    // Validation logic
    if (!email || !password) throw new Error("Required");

    // Database access
    const user = await prisma.user.create({...});

    // Email sending
    await sendWelcomeEmail(user.email);

    // Logging
    logger.info("User registered");

    // Token generation
    const token = jwt.sign({...}, SECRET);

    return { user, token };
  }
}
```

**✅ After (Follows SRP):**

```typescript
// auth.service.ts - Orchestrates use case
export class AuthService {
  constructor(
    private userRepository: IUserRepository,
    private tokenService: ITokenService,
    private emailService: IEmailService,
    private auditLogger: IAuditLogger,
  ) {}

  async register(dto: RegisterUserDto): Promise<RegisterResponseDto> {
    // Validate (separate validator)
    const validatedData = RegisterSchema.parse(dto);

    // Check existence (repository)
    const exists = await this.userRepository.findByEmail(validatedData.email);
    if (exists) throw new ConflictError("User exists");

    // Create user (repository)
    const user = await this.userRepository.create(validatedData);

    // Send email (email service)
    await this.emailService.sendWelcome(user.email);

    // Log audit (audit service)
    await this.auditLogger.log("USER_REGISTERED", user.id);

    // Generate tokens (token service)
    const tokens = this.tokenService.generateTokenPair(user);

    return { user: UserMapper.toDto(user), tokens };
  }
}
```

**Interview Talking Point:**

> "I refactored the monolithic service into smaller, focused services. Each class has one reason to change: UserRepository changes if database logic changes, TokenService changes if JWT strategy changes. This makes the code more maintainable and testable."

---

### 2. Open/Closed Principle (OCP)

**❌ Before (Violates OCP):**

```typescript
export class NotificationService {
  async send(type: string, message: string) {
    if (type === "email") {
      // Email logic
      await sendEmail(message);
    } else if (type === "sms") {
      // SMS logic
      await sendSMS(message);
    } else if (type === "push") {
      // Push notification logic
      await sendPush(message);
    }
    // Need to modify this class for each new notification type!
  }
}
```

**✅ After (Follows OCP):**

```typescript
// Core interface
export interface INotificationChannel {
  send(recipient: string, message: string): Promise<void>;
}

// Implementations (extensions, not modifications)
export class EmailChannel implements INotificationChannel {
  async send(recipient: string, message: string): Promise<void> {
    // Email-specific logic
  }
}

export class SmsChannel implements INotificationChannel {
  async send(recipient: string, message: string): Promise<void> {
    // SMS-specific logic
  }
}

export class PushChannel implements INotificationChannel {
  async send(recipient: string, message: string): Promise<void> {
    // Push notification logic
  }
}

// Service orchestrates without modification
export class NotificationService {
  constructor(private channels: Map<string, INotificationChannel>) {}

  async send(channelType: string, recipient: string, message: string) {
    const channel = this.channels.get(channelType);
    if (!channel) throw new Error("Unknown channel");

    await channel.send(recipient, message);
  }
}

// Adding new channel doesn't modify existing code
const notificationService = new NotificationService(
  new Map([
    ["email", new EmailChannel()],
    ["sms", new SmsChannel()],
    ["push", new PushChannel()],
    // Easy to add: ["whatsapp", new WhatsAppChannel()]
  ]),
);
```

**Interview Talking Point:**

> "To add WhatsApp notifications, I don't touch existing code—I just create a WhatsAppChannel class implementing INotificationChannel. The service is open for extension but closed for modification."

---

### 3. Liskov Substitution Principle (LSP)

**❌ Before (Violates LSP):**

```typescript
class PaymentProcessor {
  async process(amount: number): Promise<void> {
    // Base implementation
  }
}

class CardPaymentProcessor extends PaymentProcessor {
  async process(amount: number): Promise<void> {
    if (amount > 1000000) {
      throw new Error("Card payments limited to ₦1M");
    }
    // Process card payment
  }
}

// Violates LSP: Can't substitute CardPaymentProcessor for PaymentProcessor
// without unexpected exceptions
```

**✅ After (Follows LSP):**

```typescript
interface IPaymentProcessor {
  getMaxAmount(): number;
  canProcess(amount: number): boolean;
  process(amount: number): Promise<PaymentResult>;
}

class CardPaymentProcessor implements IPaymentProcessor {
  getMaxAmount(): number {
    return 1_000_000; // ₦1M
  }

  canProcess(amount: number): boolean {
    return amount <= this.getMaxAmount();
  }

  async process(amount: number): Promise<PaymentResult> {
    if (!this.canProcess(amount)) {
      return { success: false, error: "Amount exceeds limit" };
    }
    // Process payment
    return { success: true };
  }
}

class BankTransferProcessor implements IPaymentProcessor {
  getMaxAmount(): number {
    return 10_000_000; // ₦10M
  }

  canProcess(amount: number): boolean {
    return amount <= this.getMaxAmount();
  }

  async process(amount: number): Promise<PaymentResult> {
    // Process bank transfer
    return { success: true };
  }
}

// Client code works with any processor without surprises
function executePayment(processor: IPaymentProcessor, amount: number) {
  if (!processor.canProcess(amount)) {
    console.log(`Choose different method. Max: ₦${processor.getMaxAmount()}`);
    return;
  }

  return processor.process(amount);
}
```

**Interview Talking Point:**

> "Any payment processor can be substituted without breaking client code. Each processor exposes its constraints upfront (getMaxAmount, canProcess), so there are no surprises."

---

### 4. Interface Segregation Principle (ISP)

**❌ Before (Violates ISP):**

```typescript
// Fat interface forces clients to implement unused methods
interface IUser {
  // Authentication
  authenticate(password: string): Promise<boolean>;
  changePassword(newPassword: string): Promise<void>;

  // Profile
  updateProfile(data: any): Promise<void>;
  uploadAvatar(file: File): Promise<string>;

  // KYC
  submitKYC(data: any): Promise<void>;
  verifyBVN(bvn: string): Promise<boolean>;

  // Transactions
  getTransactionHistory(): Promise<Transaction[]>;
  initiateTransfer(data: any): Promise<Transaction>;
}

// Guest user doesn't need most of these methods
class GuestUser implements IUser {
  // Forced to implement methods that don't make sense
  async uploadAvatar() {
    throw new Error("Not allowed");
  }
  async submitKYC() {
    throw new Error("Not allowed");
  }
  async getTransactionHistory() {
    throw new Error("Not allowed");
  }
  // ...many more
}
```

**✅ After (Follows ISP):**

```typescript
// Segregated interfaces
interface IAuthenticatable {
  authenticate(password: string): Promise<boolean>;
  changePassword(newPassword: string): Promise<void>;
}

interface IProfileManageable {
  updateProfile(data: ProfileData): Promise<void>;
  uploadAvatar(file: File): Promise<string>;
}

interface IKYCVerifiable {
  submitKYC(data: KYCData): Promise<void>;
  verifyBVN(bvn: string): Promise<boolean>;
  getKYCStatus(): Promise<KYCStatus>;
}

interface ITransactable {
  getTransactionHistory(filters?: TransactionFilters): Promise<Transaction[]>;
  initiateTransfer(data: TransferData): Promise<Transaction>;
}

// Full user implements all interfaces
class RegisteredUser implements
  IAuthenticatable,
  IProfileManageable,
  IKYCVerifiable,
  ITransactable {
  // Implement all methods
}

// Guest only implements what it needs
class GuestUser implements IAuthenticatable {
  async authenticate(password: string) {
    // Only this method
  }

  async changePassword(newPassword: string) {
    throw new UnauthorizedError("Register to change password");
  }
}

// KYC service only depends on what it needs
class KYCService {
  constructor(private user: IKYCVerifiable) {}

  async verifyUser() {
    await this.user.submitKYC({...});
    await this.user.verifyBVN("12345678901");
  }
}
```

**Interview Talking Point:**

> "Instead of one fat IUser interface, I created role-specific interfaces. A KYC service only depends on IKYCVerifiable, not the entire user interface. This prevents unnecessary coupling."

---

### 5. Dependency Inversion Principle (DIP)

**❌ Before (Violates DIP):**

```typescript
// High-level module depends on low-level module
export class TransactionService {
  async transfer(from: string, to: string, amount: number) {
    // Directly depends on Prisma (low-level module)
    const sender = await prisma.wallet.findUnique({ where: { id: from } });
    const receiver = await prisma.wallet.findUnique({ where: { id: to } });

    // Business logic tightly coupled to database
    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: from },
        data: { balance: sender.balance - amount },
      }),
      prisma.wallet.update({
        where: { id: to },
        data: { balance: receiver.balance + amount },
      }),
    ]);
  }
}
```

**✅ After (Follows DIP):**

```typescript
// Abstract interface (high-level)
export interface IWalletRepository {
  findById(id: string): Promise<Wallet | null>;
  updateBalance(id: string, newBalance: number): Promise<void>;
  executeTransaction(operations: WalletOperation[]): Promise<void>;
}

// High-level module depends on abstraction
export class TransactionService {
  constructor(private walletRepository: IWalletRepository) {}

  async transfer(from: string, to: string, amount: number): Promise<void> {
    const sender = await this.walletRepository.findById(from);
    const receiver = await this.walletRepository.findById(to);

    if (!sender || !receiver) throw new NotFoundError("Wallet not found");
    if (sender.balance < amount)
      throw new ValidationError("Insufficient funds");

    await this.walletRepository.executeTransaction([
      { walletId: from, amount: -amount },
      { walletId: to, amount: +amount },
    ]);
  }
}

// Low-level module implements abstraction
export class PrismaWalletRepository implements IWalletRepository {
  async findById(id: string): Promise<Wallet | null> {
    const data = await prisma.wallet.findUnique({ where: { id } });
    return data ? WalletMapper.toDomain(data) : null;
  }

  async updateBalance(id: string, newBalance: number): Promise<void> {
    await prisma.wallet.update({
      where: { id },
      data: { balance: newBalance },
    });
  }

  async executeTransaction(operations: WalletOperation[]): Promise<void> {
    await prisma.$transaction(
      operations.map((op) =>
        prisma.wallet.update({
          where: { id: op.walletId },
          data: { balance: { increment: op.amount } },
        }),
      ),
    );
  }
}

// Easy to swap implementations for testing or different databases
export class InMemoryWalletRepository implements IWalletRepository {
  private wallets = new Map<string, Wallet>();

  async findById(id: string): Promise<Wallet | null> {
    return this.wallets.get(id) || null;
  }

  // ... implement other methods with in-memory storage
}
```

**Interview Talking Point:**

> "TransactionService depends on IWalletRepository abstraction, not Prisma. I can swap Prisma for MongoDB, or use InMemoryWalletRepository for testing, without changing TransactionService. High-level business logic is decoupled from low-level database details."

---

## 🏛️ Clean Architecture Layers

### Layer Structure

```
src/
├── presentation/          # API Layer (Controllers, Routes, Middleware)
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   └── validators/
│
├── application/          # Use Cases & Application Services
│   ├── services/
│   ├── interfaces/       # Repository & Service interfaces
│   ├── dtos/             # Data Transfer Objects
│   └── mappers/          # Domain <-> DTO mapping
│
├── domain/               # Business Logic (Framework-agnostic)
│   ├── entities/         # Rich domain models
│   ├── value-objects/    # Immutable value types
│   ├── events/           # Domain events
│   ├── services/         # Domain services
│   └── exceptions/       # Domain-specific errors
│
└── infrastructure/       # External Concerns
    ├── database/
    │   ├── prisma/       # Prisma client
    │   └── repositories/ # Repository implementations
    ├── cache/            # Redis
    ├── messaging/        # Event bus, queues
    ├── external/         # Third-party APIs
    └── di/               # Dependency injection container
```

### Dependency Rules

```
┌─────────────────────────────────────────────┐
│         Presentation Layer                   │
│  (Controllers, Routes, Middleware)          │
│         depends on ↓                         │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│        Application Layer                     │
│  (Services, DTOs, Interfaces)               │
│         depends on ↓                         │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│          Domain Layer                        │
│  (Entities, Value Objects, Events)          │
│         depends on → NOTHING!               │
└─────────────────────────────────────────────┘
                  ↑
┌─────────────────────────────────────────────┐
│      Infrastructure Layer                    │
│  (Database, Cache, External APIs)           │
│    implements interfaces from ↑             │
└─────────────────────────────────────────────┘
```

**Key Principle:** Dependencies point INWARD. Domain layer knows nothing about databases, HTTP, or frameworks.

---

## 🎨 Design Patterns

### 1. Repository Pattern

**Purpose:** Abstract data access logic from business logic

```typescript
// application/interfaces/repositories/IUserRepository.ts
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
  update(id: string, data: UpdateUserData): Promise<User>;
  delete(id: string): Promise<void>;
}

// infrastructure/database/repositories/PrismaUserRepository.ts
export class PrismaUserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const data = await prisma.user.findUnique({ where: { id } });
    return data ? UserMapper.toDomain(data) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const data = await prisma.user.findUnique({ where: { email } });
    return data ? UserMapper.toDomain(data) : null;
  }

  async create(data: CreateUserData): Promise<User> {
    const created = await prisma.user.create({
      data: UserMapper.toPersistence(data),
    });
    return UserMapper.toDomain(created);
  }

  // ... other methods
}
```

**Benefits:**

- Business logic doesn't know about Prisma
- Easy to switch databases
- Simple to mock for testing
- Centralized query logic

---

### 2. Dependency Injection (DI)

**Purpose:** Invert control and improve testability

```typescript
// infrastructure/di/container.ts
import { Container } from "inversify";

const container = new Container();

// Bind interfaces to implementations
container.bind<IUserRepository>("IUserRepository").to(PrismaUserRepository);
container
  .bind<IWalletRepository>("IWalletRepository")
  .to(PrismaWalletRepository);
container.bind<ITokenService>("ITokenService").to(JwtTokenService);
container.bind<AuthService>("AuthService").to(AuthService);

export { container };

// application/services/AuthService.ts
import { inject, injectable } from "inversify";

@injectable()
export class AuthService {
  constructor(
    @inject("IUserRepository") private userRepository: IUserRepository,
    @inject("ITokenService") private tokenService: ITokenService,
  ) {}

  async register(dto: RegisterDto): Promise<RegisterResponse> {
    // Use injected dependencies
    const user = await this.userRepository.create(dto);
    const tokens = this.tokenService.generateTokenPair(user);
    return { user, tokens };
  }
}

// presentation/controllers/AuthController.ts
export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = container.get<AuthService>("AuthService");
  }

  register = async (req: Request, res: Response) => {
    const result = await this.authService.register(req.body);
    res.status(201).json(result);
  };
}
```

**Benefits:**

- Loose coupling
- Easy testing (inject mocks)
- Single source of truth for dependencies
- Swappable implementations

---

### 3. Unit of Work Pattern

**Purpose:** Manage transactions across multiple repositories

```typescript
// application/interfaces/IUnitOfWork.ts
export interface IUnitOfWork {
  userRepository: IUserRepository;
  walletRepository: IWalletRepository;
  transactionRepository: ITransactionRepository;

  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

// infrastructure/database/PrismaUnitOfWork.ts
export class PrismaUnitOfWork implements IUnitOfWork {
  private transaction?: PrismaTransaction;

  userRepository: IUserRepository;
  walletRepository: IWalletRepository;
  transactionRepository: ITransactionRepository;

  constructor() {
    // Initialize repositories (will use transaction when started)
    this.userRepository = new PrismaUserRepository(() => this.transaction || prisma);
    this.walletRepository = new PrismaWalletRepository(() => this.transaction || prisma);
    this.transactionRepository = new PrismaTransactionRepository(() => this.transaction || prisma);
  }

  async begin(): Promise<void> {
    // Start Prisma transaction
    this.transaction = await prisma.$transaction(async (tx) => tx);
  }

  async commit(): Promise<void> {
    // Prisma auto-commits when transaction callback completes
    this.transaction = undefined;
  }

  async rollback(): Promise<void> {
    // Prisma auto-rolls back on error
    this.transaction = undefined;
  }
}

// Usage in service
async transfer(fromId: string, toId: string, amount: number) {
  const uow = new PrismaUnitOfWork();

  try {
    await uow.begin();

    // All operations in same transaction
    const sender = await uow.walletRepository.findById(fromId);
    const receiver = await uow.walletRepository.findById(toId);

    await uow.walletRepository.updateBalance(fromId, sender.balance - amount);
    await uow.walletRepository.updateBalance(toId, receiver.balance + amount);
    await uow.transactionRepository.create({ fromId, toId, amount });

    await uow.commit();
  } catch (error) {
    await uow.rollback();
    throw error;
  }
}
```

---

### 4. Factory Pattern

**Purpose:** Create complex objects with various configurations

```typescript
// domain/entities/User.ts
export class User {
  private constructor(
    public id: string,
    public email: string,
    public role: UserRole,
    public status: UserStatus,
    private passwordHash: string,
    public createdAt: Date,
  ) {}

  static create(email: string, password: string): User {
    // Factory method for new users
    return new User(
      generateUUID(),
      email,
      UserRole.CUSTOMER,
      UserStatus.ACTIVE,
      hashPassword(password),
      new Date(),
    );
  }

  static createAdmin(email: string, password: string): User {
    // Factory method for admins
    return new User(
      generateUUID(),
      email,
      UserRole.ADMIN,
      UserStatus.ACTIVE,
      hashPassword(password),
      new Date(),
    );
  }

  static reconstitute(data: UserData): User {
    // Factory method for recreating from DB
    return new User(
      data.id,
      data.email,
      data.role,
      data.status,
      data.passwordHash,
      data.createdAt,
    );
  }
}
```

---

### 5. Strategy Pattern

**Purpose:** Select algorithm at runtime

```typescript
// Nigerian payment methods
interface IPaymentStrategy {
  process(amount: number, metadata: any): Promise<PaymentResult>;
  validate(metadata: any): boolean;
}

class CardPaymentStrategy implements IPaymentStrategy {
  async process(
    amount: number,
    metadata: CardMetadata,
  ): Promise<PaymentResult> {
    // Paystack/Flutterwave integration
    return paystackClient.charge({ amount, ...metadata });
  }

  validate(metadata: CardMetadata): boolean {
    return !!metadata.cardNumber && !!metadata.cvv;
  }
}

class BankTransferStrategy implements IPaymentStrategy {
  async process(
    amount: number,
    metadata: BankMetadata,
  ): Promise<PaymentResult> {
    // Nigerian bank transfer (Monnify/Paystack Transfer)
    return monnifyClient.initiate({ amount, ...metadata });
  }

  validate(metadata: BankMetadata): boolean {
    return !!metadata.accountNumber && !!metadata.bankCode;
  }
}

class USSDPaymentStrategy implements IPaymentStrategy {
  async process(
    amount: number,
    metadata: USSDMetadata,
  ): Promise<PaymentResult> {
    // Generate USSD code
    return { code: `*737*${amount}#`, status: "PENDING" };
  }

  validate(metadata: USSDMetadata): boolean {
    return !!metadata.phoneNumber;
  }
}

class PaymentService {
  private strategies = new Map<string, IPaymentStrategy>([
    ["card", new CardPaymentStrategy()],
    ["transfer", new BankTransferStrategy()],
    ["ussd", new USSDPaymentStrategy()],
  ]);

  async processPayment(method: string, amount: number, metadata: any) {
    const strategy = this.strategies.get(method);
    if (!strategy) throw new Error("Invalid payment method");

    if (!strategy.validate(metadata)) {
      throw new ValidationError("Invalid payment metadata");
    }

    return strategy.process(amount, metadata);
  }
}
```

**Interview Talking Point:**

> "To support Nigerian payment methods like USSD, bank transfer, and cards, I used the Strategy pattern. Each payment method is a separate strategy class. Adding new methods (like GTBank 737 or Zenith EazyMoney) doesn't require modifying existing code."

---

## 💉 Dependency Injection

### Manual DI (Lightweight)

```typescript
// infrastructure/di/container.ts
class DIContainer {
  private services = new Map<string, any>();

  register<T>(name: string, factory: () => T): void {
    this.services.set(name, factory);
  }

  resolve<T>(name: string): T {
    const factory = this.services.get(name);
    if (!factory) throw new Error(`Service ${name} not registered`);
    return factory();
  }
}

const container = new DIContainer();

// Register services
container.register("IUserRepository", () => new PrismaUserRepository());
container.register("ITokenService", () => new JwtTokenService());
container.register("AuthService", () => {
  return new AuthService(
    container.resolve("IUserRepository"),
    container.resolve("ITokenService"),
  );
});

export { container };
```

### With InversifyJS (Production)

```typescript
// infrastructure/di/inversify.config.ts
import { Container } from "inversify";
import "reflect-metadata";

const container = new Container();

// Bind repositories
container
  .bind<IUserRepository>("IUserRepository")
  .to(PrismaUserRepository)
  .inSingletonScope();
container
  .bind<IWalletRepository>("IWalletRepository")
  .to(PrismaWalletRepository)
  .inSingletonScope();

// Bind services
container.bind<AuthService>("AuthService").to(AuthService).inRequestScope();
container
  .bind<WalletService>("WalletService")
  .to(WalletService)
  .inRequestScope();

// Bind utilities
container
  .bind<ITokenService>("ITokenService")
  .to(JwtTokenService)
  .inSingletonScope();
container
  .bind<IEmailService>("IEmailService")
  .to(SendgridEmailService)
  .inSingletonScope();

export { container };
```

**Scopes:**

- **Singleton**: One instance for entire app (e.g., repositories, caches)
- **Request**: New instance per HTTP request (e.g., services)
- **Transient**: New instance every time (e.g., DTOs)

---

## 📦 Repository Pattern

### Complete Implementation

```typescript
// application/interfaces/repositories/IUserRepository.ts
export interface IUserRepository {
  // Queries
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findMany(filters: UserFilters): Promise<User[]>;
  count(filters: UserFilters): Promise<number>;

  // Commands
  create(data: CreateUserData): Promise<User>;
  update(id: string, data: UpdateUserData): Promise<User>;
  delete(id: string): Promise<void>;

  // Bulk operations
  createMany(data: CreateUserData[]): Promise<User[]>;
  updateMany(ids: string[], data: UpdateUserData): Promise<void>;
}

// infrastructure/database/repositories/PrismaUserRepository.ts
export class PrismaUserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const data = await prisma.user.findUnique({
      where: { id },
      include: { wallet: true, kyc: true },
    });

    return data ? UserMapper.toDomain(data) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const data = await prisma.user.findUnique({
      where: { email },
    });

    return data ? UserMapper.toDomain(data) : null;
  }

  async findMany(filters: UserFilters): Promise<User[]> {
    const data = await prisma.user.findMany({
      where: this.buildWhereClause(filters),
      skip: filters.skip,
      take: filters.take,
      orderBy: { createdAt: "desc" },
    });

    return data.map(UserMapper.toDomain);
  }

  async count(filters: UserFilters): Promise<number> {
    return prisma.user.count({
      where: this.buildWhereClause(filters),
    });
  }

  async create(data: CreateUserData): Promise<User> {
    const created = await prisma.user.create({
      data: UserMapper.toPersistence(data),
    });

    return UserMapper.toDomain(created);
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    const updated = await prisma.user.update({
      where: { id },
      data: UserMapper.toPersistence(data),
    });

    return UserMapper.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } });
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

**Benefits:**

- Centralized query logic
- Easy to optimize queries
- Simple to add caching layer
- Database-agnostic business logic

---

## 🧬 Domain-Driven Design

### Rich Domain Entities

**❌ Anemic Domain Model (Anti-pattern):**

```typescript
// Just data, no behavior
export class User {
  id: string;
  email: string;
  password: string;
  balance: number;
}

// Logic scattered in services
export class UserService {
  async withdraw(userId: string, amount: number) {
    const user = await this.userRepo.findById(userId);

    // Business logic in service layer
    if (user.balance < amount) {
      throw new Error("Insufficient funds");
    }

    user.balance -= amount;
    await this.userRepo.update(user.id, user);
  }
}
```

**✅ Rich Domain Model:**

```typescript
// domain/entities/Wallet.ts
export class Wallet {
  private constructor(
    public readonly id: string,
    private _balance: number,
    public readonly currency: Currency,
    public readonly userId: string,
    private _status: WalletStatus,
  ) {}

  // Encapsulated balance
  get balance(): number {
    return this._balance;
  }

  // Business logic in entity
  withdraw(amount: Money): void {
    if (amount.currency !== this.currency) {
      throw new DomainException("Currency mismatch");
    }

    if (this._balance < amount.value) {
      throw new InsufficientFundsException(this._balance, amount.value);
    }

    if (this._status !== WalletStatus.ACTIVE) {
      throw new DomainException("Wallet is not active");
    }

    this._balance -= amount.value;
  }

  deposit(amount: Money): void {
    if (amount.currency !== this.currency) {
      throw new DomainException("Currency mismatch");
    }

    if (amount.value <= 0) {
      throw new DomainException("Amount must be positive");
    }

    if (this._status !== WalletStatus.ACTIVE) {
      throw new DomainException("Wallet is not active");
    }

    this._balance += amount.value;
  }

  freeze(): void {
    if (this._status === WalletStatus.FROZEN) {
      throw new DomainException("Wallet already frozen");
    }
    this._status = WalletStatus.FROZEN;
  }

  unfreeze(): void {
    if (this._status !== WalletStatus.FROZEN) {
      throw new DomainException("Wallet is not frozen");
    }
    this._status = WalletStatus.ACTIVE;
  }
}

// Service orchestrates, entity enforces rules
export class TransferService {
  async transfer(fromWalletId: string, toWalletId: string, amount: Money) {
    const sender = await this.walletRepo.findById(fromWalletId);
    const receiver = await this.walletRepo.findById(toWalletId);

    // Business logic in domain entities
    sender.withdraw(amount); // Validates internally
    receiver.deposit(amount); // Validates internally

    // Save changes
    await this.walletRepo.update(sender);
    await this.walletRepo.update(receiver);
  }
}
```

---

### Value Objects

**Purpose:** Represent concepts with no identity (e.g., Money, Email, PhoneNumber)

```typescript
// domain/value-objects/Money.ts
export class Money {
  private constructor(
    public readonly value: number,
    public readonly currency: Currency,
  ) {
    if (value < 0) throw new Error("Money cannot be negative");
  }

  static naira(value: number): Money {
    return new Money(value, Currency.NGN);
  }

  static fromKobo(kobo: number): Money {
    return new Money(kobo / 100, Currency.NGN);
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error("Cannot add different currencies");
    }
    return new Money(this.value + other.value, this.currency);
  }

  subtract(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error("Cannot subtract different currencies");
    }
    return new Money(this.value - other.value, this.currency);
  }

  toKobo(): number {
    return Math.round(this.value * 100);
  }

  format(): string {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(this.value);
  }
}

// domain/value-objects/BVN.ts (Nigerian Bank Verification Number)
export class BVN {
  private constructor(public readonly value: string) {}

  static create(value: string): BVN {
    const cleaned = value.replace(/\D/g, "");

    if (cleaned.length !== 11) {
      throw new ValidationError("BVN must be 11 digits");
    }

    return new BVN(cleaned);
  }

  mask(): string {
    return "*".repeat(7) + this.value.slice(-4);
  }

  equals(other: BVN): boolean {
    return this.value === other.value;
  }
}
```

**Interview Talking Point:**

> "Value objects encapsulate validation and behavior. Money ensures you can't have negative amounts or add different currencies. BVN validates the 11-digit format and provides a mask() method for display. These objects are immutable and compared by value, not identity."

---

### Domain Events

```typescript
// domain/events/UserRegisteredEvent.ts
export class UserRegisteredEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly occurredAt: Date,
  ) {}
}

// domain/entities/User.ts
export class User {
  private domainEvents: DomainEvent[] = [];

  static create(email: string, password: string): User {
    const user = new User(/*...*/);

    // Record domain event
    user.addDomainEvent(
      new UserRegisteredEvent(user.id, user.email, new Date()),
    );

    return user;
  }

  private addDomainEvent(event: DomainEvent): void {
    this.domainEvents.push(event);
  }

  getDomainEvents(): DomainEvent[] {
    return [...this.domainEvents];
  }

  clearDomainEvents(): void {
    this.domainEvents = [];
  }
}

// infrastructure/messaging/EventDispatcher.ts
export class EventDispatcher {
  private handlers = new Map<string, EventHandler[]>();

  register(eventName: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventName) || [];
    handlers.push(handler);
    this.handlers.set(eventName, handlers);
  }

  async dispatch(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.constructor.name) || [];
    await Promise.all(handlers.map((h) => h.handle(event)));
  }
}

// Event handlers
class SendWelcomeEmailHandler implements EventHandler {
  async handle(event: UserRegisteredEvent): Promise<void> {
    await emailService.sendWelcome(event.email);
  }
}

class CreateWalletHandler implements EventHandler {
  async handle(event: UserRegisteredEvent): Promise<void> {
    await walletService.createForUser(event.userId);
  }
}
```

---

## ⚠️ Error Handling Strategy

### Custom Error Hierarchy

```typescript
// core/errors/BaseError.ts
export abstract class BaseError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code: string,
    public isOperational: boolean = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// core/errors/AppError.ts
export class AppError extends BaseError {
  constructor(message: string, statusCode: number = 500) {
    super(message, statusCode, "APP_ERROR", true);
  }
}

// core/errors/ValidationError.ts
export class ValidationError extends BaseError {
  constructor(
    message: string,
    public fields?: Record<string, string[]>,
  ) {
    super(message, 400, "VALIDATION_ERROR", true);
  }
}

// core/errors/AuthError.ts
export class AuthError extends BaseError {
  constructor(message: string = "Unauthorized") {
    super(message, 401, "AUTH_ERROR", true);
  }
}

// core/errors/NotFoundError.ts
export class NotFoundError extends BaseError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND", true);
  }
}

// core/errors/ConflictError.ts
export class ConflictError extends BaseError {
  constructor(message: string) {
    super(message, 409, "CONFLICT", true);
  }
}

// Domain-specific errors
export class InsufficientFundsError extends BaseError {
  constructor(available: number, requested: number) {
    super(
      `Insufficient funds. Available: ${available}, Requested: ${requested}`,
      400,
      "INSUFFICIENT_FUNDS",
      true,
    );
  }
}
```

### Global Error Handler

```typescript
// core/middleware/errorHandler.ts
export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Handle known errors
  if (err instanceof BaseError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      ...(err instanceof ValidationError && { fields: err.fields }),
    });
  }

  // Handle Prisma errors
  if (err.name === "PrismaClientKnownRequestError") {
    const prismaError = err as any;

    if (prismaError.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Duplicate entry",
        code: "DUPLICATE_ERROR",
      });
    }
  }

  // Handle Zod validation errors
  if (err.name === "ZodError") {
    const zodError = err as any;
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      fields: zodError.errors,
    });
  }

  // Log unexpected errors
  logger.error("Unexpected error:", {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Don't expose internal errors
  return res.status(500).json({
    success: false,
    message: "Internal server error",
    code: "INTERNAL_ERROR",
  });
};
```

---

## 🔒 Security Best Practices

### 1. Authentication & Authorization

```typescript
// Middleware with role-based access
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AuthError("Authentication required");
    }

    if (roles.length && !roles.includes(req.user.role)) {
      throw new AuthError("Insufficient permissions");
    }

    next();
  };
};

// Usage
router.get("/users", authorize(UserRole.ADMIN), userController.list);
router.get("/me", authorize(), userController.getProfile);
```

### 2. Input Validation (Zod)

```typescript
// schemas/user.schema.ts
export const RegisterSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain uppercase letter")
    .regex(/[a-z]/, "Password must contain lowercase letter")
    .regex(/[0-9]/, "Password must contain number"),
  phoneNumber: z
    .string()
    .regex(/^0[7-9][0-1]\d{8}$/, "Invalid Nigerian phone number"),
});

// Validation middleware
export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError("Validation failed", error.errors);
      }
      throw error;
    }
  };
};

// Usage
router.post("/register", validate(RegisterSchema), authController.register);
```

### 3. Rate Limiting (Nigerian Context)

```typescript
// Different limits for different endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: "Too many login attempts, please try again after 15 minutes",
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
});

const transactionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // 10 transactions per minute (prevent fraud)
});

// Apply to routes
router.post("/login", authLimiter, authController.login);
router.use("/api/v1", apiLimiter);
router.post("/transfer", transactionLimiter, transactionController.transfer);
```

### 4. SQL Injection Prevention

```typescript
// ✅ Prisma automatically prevents SQL injection
await prisma.user.findMany({
  where: {
    email: userInput, // Safely parameterized
  },
});

// ❌ Raw queries (avoid unless necessary)
await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${userInput}
`; // Still safe with Prisma's template tag
```

---

## 🚀 Performance & Scalability

### 1. Database Query Optimization

```typescript
// ❌ N+1 Query Problem
async getAllUsers() {
  const users = await prisma.user.findMany();

  // Fires N additional queries!
  for (const user of users) {
    user.wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });
  }

  return users;
}

// ✅ Eager Loading
async getAllUsers() {
  return prisma.user.findMany({
    include: {
      wallet: true,
      kyc: true,
    },
  });
}

// ✅ Select Only Needed Fields
async getUserEmails() {
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
    },
  });
}
```

### 2. Caching Strategy

```typescript
// infrastructure/cache/RedisCache.ts
export class RedisCache {
  async get<T>(key: string): Promise<T | null> {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    await redis.setex(key, ttl, JSON.stringify(value));
  }

  async del(key: string): Promise<void> {
    await redis.del(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length) await redis.del(...keys);
  }
}

// Usage in repository
export class PrismaUserRepository implements IUserRepository {
  constructor(private cache: RedisCache) {}

  async findById(id: string): Promise<User | null> {
    // Check cache first
    const cached = await this.cache.get<User>(`user:${id}`);
    if (cached) return cached;

    // Query database
    const user = await prisma.user.findUnique({ where: { id } });

    // Cache result
    if (user) {
      await this.cache.set(`user:${id}`, user, 300); // 5 minutes
    }

    return user;
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    const updated = await prisma.user.update({ where: { id }, data });

    // Invalidate cache
    await this.cache.del(`user:${id}`);

    return updated;
  }
}
```

### 3. Pagination

```typescript
// Cursor-based pagination (better for large datasets)
export interface CursorPaginationParams {
  cursor?: string;
  take: number;
}

async findManyWithCursor(params: CursorPaginationParams) {
  const { cursor, take } = params;

  const results = await prisma.transaction.findMany({
    take: take + 1, // Fetch one extra to check if there's a next page
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1, // Skip the cursor itself
    }),
    orderBy: { createdAt: 'desc' },
  });

  const hasNextPage = results.length > take;
  const items = hasNextPage ? results.slice(0, -1) : results;

  return {
    items,
    nextCursor: hasNextPage ? items[items.length - 1].id : null,
    hasNextPage,
  };
}
```

### 4. Background Jobs (BullMQ)

```typescript
// infrastructure/queues/EmailQueue.ts
import { Queue, Worker } from "bullmq";

const emailQueue = new Queue("emails", {
  connection: redis,
});

// Producer (in service)
export class UserService {
  async register(data: RegisterDto) {
    const user = await this.userRepository.create(data);

    // Add to queue instead of blocking
    await emailQueue.add("welcome", {
      email: user.email,
      name: user.name,
    });

    return user;
  }
}

// Consumer (separate worker process)
const emailWorker = new Worker(
  "emails",
  async (job) => {
    if (job.name === "welcome") {
      await emailService.sendWelcome(job.data.email, job.data.name);
    }
  },
  {
    connection: redis,
  },
);
```

---

## 🧪 Testing Strategy

### 1. Unit Tests (Services with Mocks)

```typescript
// __tests__/services/AuthService.test.ts
describe("AuthService", () => {
  let authService: AuthService;
  let mockUserRepo: jest.Mocked<IUserRepository>;
  let mockTokenService: jest.Mocked<ITokenService>;

  beforeEach(() => {
    mockUserRepo = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    } as any;

    mockTokenService = {
      generateTokenPair: jest.fn(),
    } as any;

    authService = new AuthService(mockUserRepo, mockTokenService);
  });

  describe("register", () => {
    it("should create user and return tokens", async () => {
      const dto = { email: "test@example.com", password: "Password123!" };
      const user = { id: "1", email: dto.email };
      const tokens = { accessToken: "token", refreshToken: "refresh" };

      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockUserRepo.create.mockResolvedValue(user);
      mockTokenService.generateTokenPair.mockReturnValue(tokens);

      const result = await authService.register(dto);

      expect(mockUserRepo.create).toHaveBeenCalledWith(dto);
      expect(result.user).toEqual(user);
      expect(result.tokens).toEqual(tokens);
    });

    it("should throw ConflictError if user exists", async () => {
      const dto = { email: "existing@example.com", password: "Pass123!" };

      mockUserRepo.findByEmail.mockResolvedValue({ id: "1" } as any);

      await expect(authService.register(dto)).rejects.toThrow(ConflictError);
    });
  });
});
```

### 2. Integration Tests (with Test Database)

```typescript
// __tests__/integration/auth.test.ts
describe("Auth API Integration", () => {
  beforeAll(async () => {
    // Setup test database
    await prisma.$executeRaw`TRUNCATE TABLE users CASCADE`;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("POST /api/v1/auth/register", () => {
    it("should register new user", async () => {
      const response = await request(app).post("/api/v1/auth/register").send({
        email: "newuser@example.com",
        password: "Password123!",
        phoneNumber: "08012345678",
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe("newuser@example.com");

      // Verify in database
      const user = await prisma.user.findUnique({
        where: { email: "newuser@example.com" },
      });
      expect(user).toBeTruthy();
    });
  });
});
```

---

## 🎤 Interview Talking Points

### Architecture Questions

**Q: "Explain your backend architecture."**

> "I implemented Clean Architecture with four layers: Presentation (controllers, routes), Application (services, DTOs), Domain (entities, business logic), and Infrastructure (database, cache). Dependencies point inward—the domain layer knows nothing about HTTP or databases. This separation makes the code testable, maintainable, and allows us to swap implementations (e.g., replace Prisma with MongoDB) without touching business logic."

**Q: "How did you apply SOLID principles?"**

> "**SRP**: Each class has one responsibility—UserRepository handles data access, AuthService handles authentication use cases. **OCP**: I used the Strategy pattern for payment methods; adding new payment channels doesn't require modifying existing code. **LSP**: Any payment processor can substitute another without breaking client code. **ISP**: I created role-specific interfaces like IKYCVerifiable instead of one fat IUser interface. **DIP**: Services depend on repository interfaces, not Prisma directly."

**Q: "Why use Repository Pattern?"**

> "The Repository pattern abstracts data access. My business logic depends on IUserRepository interface, not Prisma. This makes code testable (I can inject mock repositories), portable (easy to switch databases), and optimizable (I can add caching in the repository without changing services)."

**Q: "How do you handle errors?"**

> "I created a custom error hierarchy extending BaseError: ValidationError (400), AuthError (401), NotFoundError (404), etc. The global error handler catches these and returns consistent JSON responses. Unknown errors are logged and return a generic 500 response to avoid exposing internals. This approach is both user-friendly and secure."

### Nigerian Fintech Context

**Q: "How did you handle Nigerian payment methods?"**

> "I used the Strategy pattern with separate classes for card payments (Paystack), bank transfers (Monnify), and USSD. Each strategy validates metadata and processes payments differently. Adding new methods like GTBank 737 is just creating a new strategy class—no modifications to existing code."

**Q: "How do you prevent fraud?"**

> "Multiple layers: Rate limiting (10 transactions/minute), Redis-based brute force protection (5 login attempts per 5 minutes), transaction limits per user tier, and audit logging for all financial operations. I also use domain events to trigger fraud detection checks asynchronously."

**Q: "How do you ensure scalability?"**

> "Horizontal scaling: Stateless services with JWT tokens (no session storage). Caching: Redis for frequently accessed data like user profiles and balances. Background jobs: BullMQ for emails and notifications. Database optimization: Cursor-based pagination, query result caching, and selective field loading. Monitoring: Winston logging with CloudWatch integration."

### Code Quality

**Q: "How do you ensure code quality?"**

> "TypeScript for type safety, Zod for runtime validation, ESLint for code style, unit tests for services (mocked dependencies), integration tests for APIs (test database), and comprehensive error handling with custom error classes. I also use dependency injection for testability and follow Clean Architecture principles for maintainability."

---

## 📚 Recommended Reading

1. **Clean Architecture** by Robert C. Martin
2. **Domain-Driven Design** by Eric Evans
3. **Implementing Domain-Driven Design** by Vaughn Vernon
4. **Node.js Design Patterns** by Mario Casciaro

---

## 🎯 Next Steps for Production

- [ ] Implement event sourcing for audit trail
- [ ] Add API versioning strategy
- [ ] Set up distributed tracing (OpenTelemetry)
- [ ] Implement circuit breaker pattern for external APIs
- [ ] Add GraphQL layer for flexible queries
- [ ] Set up blue-green deployment
- [ ] Implement feature flags
- [ ] Add comprehensive API documentation (Swagger/OpenAPI)

---

**Built with 💚 for Nigerian Fintech Excellence**
