import { test } from "../testing.js";
import { IndexerMetricsCollector } from "./indexer-metrics-collector.js";
import jsf from "json-schema-faker";
import { IndexerNotified } from "../indexer-events/indexer-events.js";
import { Request } from "@web-std/fetch";

test("can send event requests to IndexerMetricsCollector and then request metrics", async (t) => {
  const collector = new IndexerMetricsCollector();
  const event1 = jsf.generate(
    /** @type {import('json-schema-faker').Schema} */ (IndexerNotified.schema)
  );
  const request = new Request('https://example.com/events/', {
    method: 'post',
    body: JSON.stringify(event1),
    headers: {
        'content-type': 'application/json',
    },
  })
  const response = await collector.fetch(request)
  t.is(response.status, 202)
});
