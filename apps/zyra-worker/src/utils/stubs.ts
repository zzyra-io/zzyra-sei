export class CircuitBreaker {
  constructor(options?: any) {}
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return fn();
  }
}
