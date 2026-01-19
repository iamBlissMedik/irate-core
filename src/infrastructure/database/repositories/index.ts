/**
 * Repository Index
 * 
 * Central export point for all repository interfaces and implementations.
 * Makes imports cleaner throughout the application.
 */

// Interfaces
export * from "../../application/interfaces/repositories/IBaseRepository";
export * from "../../application/interfaces/repositories/IUserRepository";
export * from "../../application/interfaces/repositories/IWalletRepository";
export * from "../../application/interfaces/repositories/ITransactionRepository";

// Implementations
export * from "./PrismaUserRepository";
export * from "./PrismaWalletRepository";
export * from "./PrismaTransactionRepository";
