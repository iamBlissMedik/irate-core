import { User, Prisma } from "@prisma/client";
import { prisma } from "@core/config/prisma";
import {
  IUserRepository,
  CreateUserData,
  UpdateUserData,
  UserFilters,
} from "@application/interfaces/repositories/IUserRepository";

/**
 * Prisma Implementation of User Repository
 * 
 * Implements IUserRepository interface using Prisma ORM.
 * Can be replaced with MongoDB, PostgreSQL raw queries, etc.
 * without changing business logic.
 */
export class PrismaUserRepository implements IUserRepository {
  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find user by phone number
   */
  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { phoneNumber },
    });
  }

  /**
   * Find many users with filters
   */
  async findMany(filters: UserFilters = {}): Promise<User[]> {
    const where = this.buildWhereClause(filters);

    return prisma.user.findMany({
      where,
      skip: filters.skip,
      take: filters.take,
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Count users with filters
   */
  async count(filters: UserFilters = {}): Promise<number> {
    const where = this.buildWhereClause(filters);
    return prisma.user.count({ where });
  }

  /**
   * Create new user
   */
  async create(data: CreateUserData): Promise<User> {
    return prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        phoneNumber: data.phoneNumber,
        firstName: data.firstName,
        lastName: data.lastName,
      },
    });
  }

  /**
   * Update existing user
   */
  async update(id: string, data: UpdateUserData): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        ...(data.email && { email: data.email }),
        ...(data.password && { password: data.password }),
        ...(data.phoneNumber && { phoneNumber: data.phoneNumber }),
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.role && { role: data.role }),
        ...(data.status && { status: data.status }),
      },
    });
  }

  /**
   * Delete user
   */
  async delete(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id },
    });
  }

  /**
   * Check if user exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await prisma.user.count({
      where: { id },
    });
    return count > 0;
  }

  /**
   * Update user password
   */
  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const count = await prisma.user.count({
      where: { email },
    });
    return count > 0;
  }

  /**
   * Build Prisma where clause from filters
   */
  private buildWhereClause(filters: UserFilters): Prisma.UserWhereInput {
    return {
      ...(filters.email && {
        email: { contains: filters.email, mode: "insensitive" },
      }),
      ...(filters.role && { role: filters.role }),
      ...(filters.status && { status: filters.status }),
    };
  }
}
