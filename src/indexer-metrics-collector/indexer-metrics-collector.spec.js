import { test } from "../testing.js";
import { IndexerMetricsCollector } from "./indexer-metrics-collector.js";
import { IndexerNotified } from "../indexer-events/indexer-events.js";
import { Request } from "@web-std/fetch";
import { generate } from "../schema.js";
import parsePrometheus from "parse-prometheus-text-format";
import assert from "node:assert";

test("can send event IndexerNotified events to IndexerMetricsCollector and then request file_size_bytes metrics", async (t) => {
  const collector = new IndexerMetricsCollector();
  const event1 = generate(IndexerNotified.schema);
  // submit an event
  const eventSubmissionRequest = new Request("https://example.com/events", {
    method: "post",
    body: JSON.stringify(event1),
    headers: {
      "content-type": "application/json",
    },
  });
  const eventSubmissionResponse = await collector.fetch(eventSubmissionRequest);
  t.is(eventSubmissionResponse.status, 202);

  // fetch metrics
  const metricsResponse = await collector.fetch(
    new Request("https://example.com/metrics")
  );
  t.is(metricsResponse.status, 200);
  const metricsResponseText = await metricsResponse.text();
  t.assert(
    metricsResponseText.toLowerCase().includes("histogram"),
    "expected metrics response text to contain histogram"
  );
  // todo - ensure this has serialized prometheus metrics like we'd expect
  const parsedMetrics = parsePrometheus(metricsResponseText);
  const ipfsIndexerNotified = parsedMetrics.find(
    (m) => m.name === "file_size_bytes"
  );
  t.assert(ipfsIndexerNotified);
  assert.ok(ipfsIndexerNotified?.type === "HISTOGRAM");
  t.is(ipfsIndexerNotified?.metrics.length, 1);
  t.is(ipfsIndexerNotified?.metrics[0].count, "1");
  //   console.log({ metricsResponseText, parsedMetrics }, parsedMetrics[0].metrics)
});
