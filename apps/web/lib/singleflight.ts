/**
 * Single-flight utility to de-duplicate concurrent promises by key
 * Prevents multiple parallel requests for the same resource
 */

type PromiseResolver<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
};

class SingleFlight {
  private flights: Map<string, PromiseResolver<any>> = new Map();

  /**
   * Execute a function with de-duplication by key
   * If a request with the same key is already in flight, returns the existing promise
   */
  async do<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Check if request is already in flight
    const existing = this.flights.get(key);
    if (existing) {
      console.log(`[SingleFlight] Request for "${key}" already in flight, waiting...`);
      return existing.promise;
    }

    // Create new promise
    let resolve: (value: T) => void;
    let reject: (error: any) => void;

    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    const flight = { promise, resolve: resolve!, reject: reject! };
    this.flights.set(key, flight);

    try {
      console.log(`[SingleFlight] Starting request for "${key}"`);
      const result = await fn();
      flight.resolve(result);
      return result;
    } catch (error) {
      flight.reject(error);
      throw error;
    } finally {
      this.flights.delete(key);
      console.log(`[SingleFlight] Request for "${key}" completed`);
    }
  }

  /**
   * Clear all in-flight requests
   */
  clear() {
    this.flights.clear();
  }
}

// Global instance
const singleflight = new SingleFlight();

export default singleflight;
