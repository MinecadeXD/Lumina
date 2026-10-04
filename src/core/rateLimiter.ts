export interface RateLimitSettings {
  userRequests: number;
  providerRequests: number;
  windowMs: number;
}

type Bucket = { timestamps: number[] };

export class RateLimiter {
  private readonly users = new Map<string, Bucket>();
  private readonly providers = new Map<string, Bucket>();

  public constructor(private readonly defaults: RateLimitSettings) {}

  public checkUser(id: string, limit = this.defaults.userRequests, windowMs = this.defaults.windowMs): boolean {
    return this.check(this.users, id, limit, windowMs);
  }

  public checkProvider(id: string, limit = this.defaults.providerRequests, windowMs = this.defaults.windowMs): boolean {
    return this.check(this.providers, id, limit, windowMs);
  }

  public recordUser(id: string, windowMs = this.defaults.windowMs): void {
    this.record(this.users, id, windowMs);
  }

  public recordProvider(id: string, windowMs = this.defaults.windowMs): void {
    this.record(this.providers, id, windowMs);
  }

  private check(map: Map<string, Bucket>, key: string, limit: number, windowMs: number): boolean {
    if (limit <= 0) return false;
    const bucket = this.getBucket(map, key);
    this.prune(bucket, windowMs);
    return bucket.timestamps.length < limit;
  }

  private record(map: Map<string, Bucket>, key: string, windowMs: number): void {
    const bucket = this.getBucket(map, key);
    this.prune(bucket, windowMs);
    bucket.timestamps.push(Date.now());
  }

  private getBucket(map: Map<string, Bucket>, key: string): Bucket {
    let bucket = map.get(key);
    if (!bucket) {
      bucket = { timestamps: [] };
      map.set(key, bucket);
    }
    return bucket;
  }

  private prune(bucket: Bucket, windowMs: number): void {
    const cutoff = Date.now() - windowMs;
    while (bucket.timestamps.length > 0 && bucket.timestamps[0]! <= cutoff) {
      bucket.timestamps.shift();
    }
  }
}
