# 4. add IndexerComplete event

Date: 2022-07-05

## Status

2022-07-05 proposed

## Context

["Elastic Provider Events"](https://hackmd.io/7FHjMKZ2TgGycAvapvBqqw?both) MVP wants an event `CAR file fully indexed into EP: S3 URL, timestamp` emitted [here](https://github.com/ipfs-elastic-provider/ipfs-elastic-provider-indexer-lambda/blob/dev/src/index.js#L202).

Semantically, this event can be thought of as "Indexer Completed". This event indicates completion of an indexing process.

## Decision

We will define an event type named "IndexerCompleted" with the following fields:
* type - `"IndexerCompleted"`
* uri - `string` - URI from which the indexed CAR file can be fetched. probably an s3 url
* byteLength - `integer` - length of indexed CAR file in bytes
* indexing
  * startTime - `rfc3339 date-time string` - date-time at which indexing started
  * endTime - `rfc3339 date-time string` - date-time at which indexing ended

## Consequences

We can parse incoming IndexerCompleted events.

We can keep track of metrics about how long the indexing process took.
