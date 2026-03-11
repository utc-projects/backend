const buckets = new Map();

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) {
      buckets.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);

const createRateLimiter = ({
  windowMs = 60_000,
  max = 30,
  message = 'Too many requests',
  keyGenerator,
  skipSuccessfulRequests = false,
} = {}) => {
  return (req, res, next) => {
    const key = keyGenerator ? keyGenerator(req) : (req.user?._id?.toString() || req.ip || 'anonymous');
    const now = Date.now();
    const currentBucket = buckets.get(key);

    if (!currentBucket || currentBucket.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });

      if (skipSuccessfulRequests) {
        const bucket = buckets.get(key);
        res.on('finish', () => {
          if (res.statusCode < 400 && bucket.count > 0) {
            bucket.count -= 1;
          }
        });
      }

      return next();
    }

    if (currentBucket.count >= max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((currentBucket.resetAt - now) / 1000));
      res.set('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        success: false,
        message,
        retryAfterSeconds,
      });
    }

    currentBucket.count += 1;
    buckets.set(key, currentBucket);

    if (skipSuccessfulRequests) {
      res.on('finish', () => {
        if (res.statusCode < 400 && currentBucket.count > 0) {
          currentBucket.count -= 1;
        }
      });
    }

    return next();
  };
};

module.exports = {
  createRateLimiter,
};
