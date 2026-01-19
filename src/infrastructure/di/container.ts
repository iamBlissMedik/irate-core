/**
 * Simple Dependency Injection Container
 *
 * Lightweight DI implementation without external dependencies.
 * For production, consider using InversifyJS or TSyringe.
 *
 * Usage:
 * ```ts
 * container.register('IUserRepository', () => new PrismaUserRepository());
 * const userRepo = container.resolve<IUserRepository>('IUserRepository');
 * ```
 */

type Factory<T> = () => T;
type Scope = "singleton" | "transient";

interface ServiceRegistration<T> {
  factory: Factory<T>;
  scope: Scope;
  instance?: T;
}

export class DIContainer {
  private services = new Map<string, ServiceRegistration<any>>();

  /**
   * Register a service with the container
   *
   * @param name - Service identifier (usually interface name)
   * @param factory - Function that creates the service instance
   * @param scope - 'singleton' (one instance) or 'transient' (new instance each time)
   */
  register<T>(
    name: string,
    factory: Factory<T>,
    scope: Scope = "singleton",
  ): void {
    this.services.set(name, { factory, scope });
  }

  /**
   * Resolve a service from the container
   *
   * @param name - Service identifier
   * @returns Service instance
   */
  resolve<T>(name: string): T {
    const registration = this.services.get(name);

    if (!registration) {
      throw new Error(
        `Service "${name}" not registered in DI container. ` +
          `Available services: ${Array.from(this.services.keys()).join(", ")}`,
      );
    }

    // Singleton: return cached instance or create and cache
    if (registration.scope === "singleton") {
      if (!registration.instance) {
        registration.instance = registration.factory();
      }
      return registration.instance as T;
    }

    // Transient: always create new instance
    return registration.factory() as T;
  }

  /**
   * Check if a service is registered
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Clear all registrations (useful for testing)
   */
  clear(): void {
    this.services.clear();
  }

  /**
   * Get list of registered service names
   */
  getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }
}

// Create singleton container instance
export const container = new DIContainer();
