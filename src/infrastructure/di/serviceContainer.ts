/**
 * Service Container Configuration
 *
 * Register all services, repositories, and utilities here.
 * This is the single source of truth for dependency injection.
 */

import { container } from "./container";

// Repositories
import {
  PrismaUserRepository,
  PrismaWalletRepository,
  PrismaTransactionRepository,
} from "../database/repositories";

// Services
import { AuthService } from "../../modules/auth/auth.service";
import { WalletService } from "../../modules/wallet/wallet.service";
import { TransactionService } from "../../modules/transaction/transaction.service";

/**
 * Initialize all service registrations
 * Call this once during application startup
 */
export function initializeContainer(): void {
  // ============================================
  // REPOSITORIES (Singleton)
  // ============================================
  container.register(
    "IUserRepository",
    () => new PrismaUserRepository(),
    "singleton",
  );

  container.register(
    "IWalletRepository",
    () => new PrismaWalletRepository(),
    "singleton",
  );

  container.register(
    "ITransactionRepository",
    () => new PrismaTransactionRepository(),
    "singleton",
  );

  // ============================================
  // SERVICES (Transient - new instance per request)
  // ============================================
  container.register(
    "AuthService",
    () =>
      new AuthService(
        container.resolve("IUserRepository"),
        container.resolve("IWalletRepository"),
      ),
    "transient",
  );

  container.register(
    "WalletService",
    () => new WalletService(container.resolve("IWalletRepository")),
    "transient",
  );

  container.register(
    "TransactionService",
    () =>
      new TransactionService(
        container.resolve("ITransactionRepository"),
        container.resolve("IWalletRepository"),
      ),
    "transient",
  );

  console.log(
    "✅ DI Container initialized with services:",
    container.getRegisteredServices(),
  );
}

/**
 * Helper function to get a service (with type safety)
 */
export function getService<T>(name: string): T {
  return container.resolve<T>(name);
}

export { container };
