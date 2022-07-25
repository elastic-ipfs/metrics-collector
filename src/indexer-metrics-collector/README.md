# indexer-metrics-collector

Request handler that handles event submissions from elastic-ipfs, reduces them into some metrics, and makes the metrics available to a prometheus scraper.

## Environment Variables

### `PROMETHEUS_DEFAULT_LABELS`

key/value pairs to include as labels on all prometheus metrics (these will not be stored)

Example:
```json
{ "job": "foo", "instance": "production" }   
```

### `CLIENTS`

Description of clients of this service, how to authenticate them, and what capabilities they have. Keys correspond to HTTP Basic Authentication usernames.

```json
{
    "userA": {
        "capabilities": ["postEvent", "getMetrics"],
        "passwords": ["passwordA"]
    }
}
```
