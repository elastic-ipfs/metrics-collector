import { test } from "../testing.js";
import { IndexerMetricsCollector } from "./indexer-metrics-collector.js";
import {
  IndexerCompleted,
  IndexerNotified,
} from "../indexer-events/indexer-events.js";
import { Request } from "@web-std/fetch";
import { generate } from "../schema.js";
import parsePrometheus from "parse-prometheus-text-format";
import assert from "node:assert";
import { DurableObjectStorage } from "@miniflare/durable-objects";
import { MemoryStorage } from "@miniflare/storage-memory";

const exampleImageUri =
  "https://bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy.ipfs.nftstorage.link/";

test("can send IndexerCompleted event to IndexerMetricsCollector", async (t) => {
  const storage = new DurableObjectStorage(new MemoryStorage());
  const collector = new IndexerMetricsCollector(storage);
  const event1 = generate(IndexerCompleted.schema);
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
});

test("can send event IndexerNotified events to IndexerMetricsCollector and then request file_size_bytes metrics", async (t) => {
  const storage = new DurableObjectStorage(new MemoryStorage());
  const collector = new IndexerMetricsCollector(storage);
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
});

test("can send event multiple IndexerNotified events to multiple IndexerMetricsCollector and then request file_size_bytes metrics", async (t) => {
  const storage = new DurableObjectStorage(new MemoryStorage());
  const collector1 = new IndexerMetricsCollector(storage);
  // submit an event1
  const eventSubmissionResponse1 = await collector1.fetch(
    new Request("https://example.com/events", {
      method: "post",
      body: JSON.stringify(generate(IndexerNotified.schema)),
      headers: {
        "content-type": "application/json",
      },
    })
  );
  t.is(eventSubmissionResponse1.status, 202);

  // submit an event2
  const collector2 = new IndexerMetricsCollector(storage);
  const eventSubmissionResponse2 = await collector2.fetch(
    new Request("https://example.com/events", {
      method: "post",
      body: JSON.stringify(generate(IndexerNotified.schema)),
      headers: {
        "content-type": "application/json",
      },
    })
  );
  t.is(eventSubmissionResponse2.status, 202);

  // fetch metrics
  const collector3 = new IndexerMetricsCollector(storage);
  const metricsResponse = await collector3.fetch(
    new Request("https://example.com/metrics")
  );
  t.is(metricsResponse.status, 200);
  const metricsResponseText = await metricsResponse.text();
  t.assert(
    metricsResponseText.toLowerCase().includes("histogram"),
    "expected metrics response text to contain histogram"
  );
  const parsedMetrics = parsePrometheus(metricsResponseText);
  const ipfsIndexerNotified = parsedMetrics.find(
    (m) => m.name === "file_size_bytes"
  );
  t.assert(ipfsIndexerNotified);
  assert.ok(ipfsIndexerNotified?.type === "HISTOGRAM");
  t.is(ipfsIndexerNotified?.metrics.length, 1);
  t.is(ipfsIndexerNotified?.metrics[0].count, "2");
});

test("can send event multiple IndexerCompleted events to multiple IndexerMetricsCollector and then request indexing_duration_seconds metrics", async (t) => {
  const storage = new DurableObjectStorage(new MemoryStorage());
  const collector1 = new IndexerMetricsCollector(storage);
  const now = new Date();
  const oneMinuteFromNow = new Date(Number(now) + 60 * 1000);
  /** @type {IndexerCompleted} */
  const indexerCompletedEvent = new IndexerCompleted(exampleImageUri, 1e6, {
    startTime: now,
    endTime: oneMinuteFromNow,
  });
  // submit an event1
  const eventSubmissionResponse1 = await collector1.fetch(
    new Request("https://example.com/events", {
      method: "post",
      body: JSON.stringify(indexerCompletedEvent),
      headers: {
        "content-type": "application/json",
      },
    })
  );
  t.is(eventSubmissionResponse1.status, 202);

  // fetch metrics
  const collector2 = new IndexerMetricsCollector(storage);
  const metricsResponse = await collector2.fetch(
    new Request("https://example.com/metrics")
  );
  t.is(metricsResponse.status, 200);
  const metricsResponseText = await metricsResponse.text();
  t.assert(
    metricsResponseText.toLowerCase().includes("histogram"),
    "expected metrics response text to contain histogram"
  );
  const parsedMetrics = parsePrometheus(metricsResponseText);
  const indexingDuration = parsedMetrics.find(
    (m) => m.name === "indexing_duration_seconds"
  );
  t.assert(indexingDuration);
  assert.ok(indexingDuration?.type === "HISTOGRAM");
  t.is(indexingDuration?.metrics.length, 1);
  t.is(indexingDuration?.metrics[0].count, "1");
});
