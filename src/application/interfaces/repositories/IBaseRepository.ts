/**
 * Base Repository Interface
 *
 * Generic interface that all repositories should extend.
 * Provides common CRUD operations.
 */
export interface IBaseRepository<T, CreateDTO, UpdateDTO> {
  /**
   * Find entity by ID
   */
  findById(id: string): Promise<T | null>;

  /**
   * Find all entities with optional filtering
   */
  findMany(filters?: any): Promise<T[]>;

  /**
   * Count entities with optional filtering
   */
  count(filters?: any): Promise<number>;

  /**
   * Create new entity
   */
  create(data: CreateDTO): Promise<T>;

  /**
   * Update existing entity
   */
  update(id: string, data: UpdateDTO): Promise<T>;

  /**
   * Delete entity
   */
  delete(id: string): Promise<void>;

  /**
   * Check if entity exists
   */
  exists(id: string): Promise<boolean>;
}
