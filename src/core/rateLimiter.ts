export interface RateLimitSettings {
  userRequests: number;
  serverRequests: number;
  providerRequests: number;
  windowMs: number;
}

type Bucket = { timestamps: number[] };

export class RateLimiter {
  private readonly users = new Map<string, Bucket>();
  private readonly servers = new Map<string, Bucket>();
  private readonly providers = new Map<string, Bucket>();

  public constructor(private readonly defaults: RateLimitSettings) {}

  public checkUser(userId: string, limit = this.defaults.userRequests): boolean {
    return this.check(this.users, userId, limit);
  }

  public checkServer(serverId: string, limit = this.defaults.serverRequests): boolean {
    return this.check(this.servers, serverId, limit);
  }

  public checkProvider(provider: string, limit = this.defaults.providerRequests): boolean {
    return this.check(this.providers, provider, limit);
  }

  public recordUser(userId: string): void { this.record(this.users, userId); }
  public recordServer(serverId: string): void { this.record(this.servers, serverId); }
  public recordProvider(provider: string): void { this.record(this.providers, provider); }

  public get windowMs(): number { return this.defaults.windowMs; }

  private check(map: Map<string, Bucket>, key: string, limit: number): boolean {
    if (limit <= 0) return false;
    const bucket = this.getBucket(map, key);
    this.prune(bucket);
    return bucket.timestamps.length < limit;
  }

  private record(map: Map<string, Bucket>, key: string): void {
    const bucket = this.getBucket(map, key);
    this.prune(bucket);
    bucket.timestamps.push(Date.now());
  }

  private getBucket(map: Map<string, Bucket>, key: string): Bucket {
    let bucket = map.get(key);
    if (!bucket) { bucket = { timestamps: [] }; map.set(key, bucket); }
    return bucket;
  }

  private prune(bucket: Bucket): void {
    const cutoff = Date.now() - this.defaults.windowMs;
    while (bucket.timestamps.length > 0 && bucket.timestamps[0]! <= cutoff) bucket.timestamps.shift();
  }
}