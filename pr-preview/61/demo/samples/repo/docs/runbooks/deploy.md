# Deploying the service

1. Check that the review queue is drained. The queue is described in the [architecture overview](../architecture/overview.md#receiving-changes).
2. Deploy the webhook receiver first, then the workers.
3. Watch the error rate for ten minutes.

If anything looks wrong, roll back with the previous release tag.
