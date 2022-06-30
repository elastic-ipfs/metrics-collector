# 3. Add IndexerNotified Event

Date: 2022-06-30

## Status

2022-06-30 proposed

## Context

["Elastic Provider Events"](https://hackmd.io/7FHjMKZ2TgGycAvapvBqqw) discusses how the MVP should have two events. One is:

> CAR file received: S3 URL, size, timestamp

In the case of elastic ipfs, we are considering emitting this event approximately [here](https://github.com/ipfs-elastic-provider/ipfs-elastic-provider-bucket-to-indexer/blob/main/src/index.js#L22), when the data has been uploaded to s3, and the ObjectCreated event triggers that lambda.

So we need to define the syntax of this event, and write a test that the collector is able to receive/distinguish/validate them.

It begs the question of what to call this event. I considered:
* Upload - this seems like more the realm of whatever object storage gets the raw bytes, which is just before this event. 'upload' also has some client-to-server semantic baggage. What's up and what's down?
* Load
* Receive - generic. object would clarify 'receive CarFile'. Maybe too generic
  * I think this is a good event name corresponding to handling aws s3 "ObjectCreated". But for measuring indexing we might something more related to the beginning of that.
* IndexStart - maybe this is a bit after the point we're talking about
* IndexerNotified - this seems most semantically accurate to the place we're discussing emitting the event in eIPFS.
  * This is explicit that there may be some lag before the indexer receives the notification and begins indexing. In AWS, this would be due to any delay between the publish via sqs and the indexer lambda being triggered by that sqs notfiication
  * Insofar as the point of the Elastic IPFS Events project is ostensibly to monitor how long indexing takes, this seems like a worthwhile specific event to throw 

## Decision

We will define an event similar to 'CAR File Received' which is named "IndexerNotified". This is probably the event we expect to see 'first' of all indexing-related events. Eventing on it will allow us to measure the duration/delta between in and downstream indexing (or after) events.

Once there is an MVP of using metrics-collector for indexing metrics, we may decide to reconsider the semantics and syntax of the events and their names.

## Consequences

* I can read a description of what an IndexerNotified event should look like
* I can determine whether an incoming string of JSON is an IndexerNotified event
* I can create new IndexerNotified events using js
