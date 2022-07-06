import { Router } from "itty-router";
import {
  IndexerCompleted,
  IndexerNotified,
} from "../indexer-events/indexer-events.js";
import { isValid } from "../schema.js";
import { Response } from "@web-std/fetch";
import { HistogramSerializer } from "../prom-client-serializer/prom-client-serializer.js";
import { Histogram, linearBuckets, Registry } from "./prometheus.js";

/**
 * buckets for bytes to use for fileSize histogram.
 * This will only be used the first time the histogram is created, i.e. when storage is empty.
 * After the initial run, storage will not be empty, and the histogram will be deserialized according to the buckets from storage.
 * So you probably don't want to change this constant.
 * If you want to change the buckets, you may also want to change the fileSizeHistogramKey
 */
const DEFAULT_FILESIZE_BYTES_BUCKETS = [
  1 * 1e6,
  ...linearBuckets(10 * 1e6, 10 * 1e6, 10),
];

/**
 * @typedef {import('@miniflare/durable-objects').DurableObjectStorage} DurableObjectStorage
 */

export class IndexerMetricsCollector {
  /**
   * @param {object} state
   * @param {DurableObjectStorage} state.storage
   * @param {unknown} [env]
   * @param {string} fileSizeHistogramStorageKey - storage key at which to store fileSize histogram
   * @param {string} indexingDurationSecondsStorageKey - storage key at which to store indexingDurationSeconds histogram
   */
  constructor(
    state,
    env,
    fileSizeHistogramStorageKey = "fileSize/histogram",
    indexingDurationSecondsStorageKey = "indexingDurationSeconds/histogram"
  ) {
    const storage = state.storage;
    this.storage = storage;
    this.indexingDurationSecondsStorageKey = indexingDurationSecondsStorageKey;
    this.fileSizeHistogramStorageKey = fileSizeHistogramStorageKey;
    const metrics = this.createMetricsFromStorage(storage);
    this.router = this.createRouter(metrics);
  }

  /**
   * @param {DurableObjectStorage} storage
   * @returns {Promise<IndexerMetricsPrometheusContext>}
   */
  async createMetricsFromStorage(storage) {
    const registry = new Registry();
    const fileSizeHistogramSerialized = await storage.get(
      this.fileSizeHistogramStorageKey
    );
    const fileSizeHistogram = fileSizeHistogramSerialized
      ? HistogramSerializer.deserialize(
          /** @type {import("../prom-client-serializer/prom-client-serializer.js").SerializedHistogram} */ (
            fileSizeHistogramSerialized
          ),
          [registry]
        )
      : new Histogram({
          name: "file_size_bytes",
          help: "file seen with certain size",
          registers: [registry],
          buckets: DEFAULT_FILESIZE_BYTES_BUCKETS,
        });
    const indexingDurationSecondsStored = await storage.get(
      this.indexingDurationSecondsStorageKey
    );
    const indexingDurationSecondsHistogram = indexingDurationSecondsStored
      ? HistogramSerializer.deserialize(
          /** @type {import("../prom-client-serializer/prom-client-serializer.js").SerializedHistogram} */ (
            indexingDurationSecondsStored
          ),
          [registry]
        )
      : new Histogram({
          name: "indexing_duration_seconds",
          help: "how long did ipfs indexing take from start to completion",
          registers: [registry],
        });
    return new IndexerMetricsPrometheusContext(
      registry,
      fileSizeHistogram,
      indexingDurationSecondsHistogram
    );
  }

  /**
   * @param {Promise<IndexerMetricsPrometheusContext>} metrics
   * @returns {Router}
   */
  createRouter(metrics) {
    const router = Router();
    router.post(
      "/events",
      PostEventsRoute(metrics, (m) => this.storeMetrics(this.storage, m))
    );
    router.get("/metrics", GetMetricsRoute(metrics));
    return router;
  }

  /**
   * @param {DurableObjectStorage} storage
   * @param {IndexerMetricsPrometheusContext} metrics
   * @returns {Promise<void>}
   */
  async storeMetrics(storage, metrics) {
    await Promise.all([
      storage.put(
        this.fileSizeHistogramStorageKey,
        await HistogramSerializer.serialize(metrics.fileSize)
      ),
      storage.put(
        this.indexingDurationSecondsStorageKey,
        await HistogramSerializer.serialize(metrics.indexingDurationSeconds)
      ),
    ]);
  }

  /**
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async fetch(request) {
    /** @type {Response|undefined} */
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const response = await this.router.handle(request);
    return response || new Response("route not found", { status: 404 });
  }
}

/**
 * Route to handle POST /events/
 * Which should have requests
 * @param {Promise<IndexerMetricsPrometheusContext>} metricsPromise
 * @param {(metrics: IndexerMetricsPrometheusContext) => Promise<void>} storeMetrics
 */
function PostEventsRoute(metricsPromise, storeMetrics) {
  /**
   * @param {Request} request
   */
  return async (request) => {
    const metrics = await metricsPromise;
    /** @type {unknown} */
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      return new Response("unable to parse request body as json", {
        status: 400,
      });
    }
    /**  @type {import("ajv").JSONSchemaType<IndexerNotified|IndexerCompleted>} */
    const eventSubmission = {
      oneOf: [IndexerNotified.schema, IndexerCompleted.schema],
    };
    if (!isValid({ schema: eventSubmission }, requestBody)) {
      return new Response("request body is not a valid event type", {
        status: 400,
      });
    }
    const event = requestBody;
    switch (event.type) {
      case "IndexerNotified":
        metrics.fileSize.observe(event.byteLength);
        break;
      case "IndexerCompleted":
        {
          const startTimeMilliseconds = Date.parse(event.indexing.startTime);
          const endTimeMilliseconds = Date.parse(event.indexing.endTime);
          const durationSeconds =
            (endTimeMilliseconds - startTimeMilliseconds) / 1000;
          metrics.indexingDurationSeconds.observe(durationSeconds);
        }
        break;
      default:
        /** @type {never} */
        // eslint-disable-next-line no-case-declarations, no-unused-vars, @typescript-eslint/no-unused-vars
        const exhaustiveCheck = event;
        throw new Error(`unexpected event type: ${String(event)}`);
    }
    await storeMetrics(metrics);
    return new Response("got event", { status: 202 });
  };
}

class IndexerMetricsPrometheusContext {
  /**
   * @param {import('prom-client').Registry} registry
   * @param {import('prom-client').Histogram<string>} fileSize
   * @param {import('prom-client').Histogram<string>} indexingDurationSeconds
   */
  constructor(registry = new Registry(), fileSize, indexingDurationSeconds) {
    this.registry = registry;
    this.fileSize = fileSize;
    this.indexingDurationSeconds = indexingDurationSeconds;
  }
}

/**
 * @param {Promise<IndexerMetricsPrometheusContext>} metricsPromise
 */
function GetMetricsRoute(metricsPromise) {
  /**
   * @param {Request} _request
   * @returns {Promise<Response>}
   */
  return async (_request) => {
    const metrics = await metricsPromise;
    return new Response(await metrics.registry.metrics(), { status: 200 });
  };
}
