# Rate limits

Each client can make 100 requests per minute. Requests over the limit are rejected with a `retryAfter` value, in seconds.

See `src/limits` for the implementation.
