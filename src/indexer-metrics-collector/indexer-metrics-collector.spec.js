import { test } from "../testing.js";
import { IndexerMetricsCollector } from "./indexer-metrics-collector.js";
import { IndexerNotified } from "../indexer-events/indexer-events.js";
import { Request } from "@web-std/fetch";
import { generate } from "../schema.js";

test("can send event requests to IndexerMetricsCollector and then request metrics", async (t) => {
  const collector = new IndexerMetricsCollector();
  const event1 = generate(IndexerNotified.schema)
  // submit an event
  const eventSubmissionRequest = new Request('https://example.com/events', {
    method: 'post',
    body: JSON.stringify(event1),
    headers: {
        'content-type': 'application/json',
    },
  })
  const eventSubmissionResponse = await collector.fetch(eventSubmissionRequest)
  t.is(eventSubmissionResponse.status, 202)

  // fetch metrics
  const metricsResponse = await collector.fetch(new Request('https://example.com/metrics'))
  t.is(metricsResponse.status, 200)
  // todo - ensure this has serialized prometheus metrics like we'd expect
});
