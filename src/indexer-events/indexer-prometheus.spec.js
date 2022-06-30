import { test } from "../testing.js";
import { IndexerNotified } from "./indexer-events.js";
import { collect, map, pipeline, take } from "streaming-iterables";
import { Histogram, exponentialBuckets } from "prom-client"
import produce from "immer"
import { generate } from "../schema.js";

test('can create a byteLength histogram from stream of IndexerNotified events', async t => {
    const histogram = new Histogram({
        name: 'sample_histogram_bytes',
        help: 'histogram used just for this test',
        buckets: exponentialBuckets(1000,2,20),
    })
    const eventsFive = await pipeline(
        () => createIndexerNotifiedStream(1e7),
        map(event => {
            histogram.observe(event.byteLength)
            return event
        }),
        take(5),
        collect
    )
    t.is(eventsFive.length, 5)
})

function * createIndexerNotifiedStream (byteLengthMax=Infinity) {
    const modifiedSchema = produce(IndexerNotified.schema, (schema) => {
        schema.properties.byteLength.maximum = byteLengthMax
        return schema
    })
    while (true) {
        yield generate(modifiedSchema)
    }
}
