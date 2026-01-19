import { User } from "@prisma/client";
import { IBaseRepository } from "./IBaseRepository";

/**
 * User-specific data for creation
 */
export interface CreateUserData {
  email: string;
  password: string;
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
}

/**
 * User-specific data for updates
 */
export interface UpdateUserData {
  email?: string;
  password?: string;
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  status?: string;
}

/**
 * User query filters
 */
export interface UserFilters {
  email?: string;
  role?: string;
  status?: string;
  skip?: number;
  take?: number;
}

/**
 * User Repository Interface
 * 
 * Defines all data access operations for User entities.
 * Following Repository Pattern to abstract Prisma implementation.
 */
export interface IUserRepository
  extends IBaseRepository<User, CreateUserData, UpdateUserData> {
  /**
   * Find user by email (common operation for authentication)
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Find user by phone number
   */
  findByPhoneNumber(phoneNumber: string): Promise<User | null>;

  /**
   * Find many users with pagination and filtering
   */
  findMany(filters: UserFilters): Promise<User[]>;

  /**
   * Update user password
   */
  updatePassword(id: string, hashedPassword: string): Promise<void>;

  /**
   * Check if email exists (for validation)
   */
  emailExists(email: string): Promise<boolean>;
}
