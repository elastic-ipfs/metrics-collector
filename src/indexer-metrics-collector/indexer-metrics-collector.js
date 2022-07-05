import { Router } from "itty-router";
import { IndexerNotified } from "../indexer-events/indexer-events.js";
import { isValid } from "../schema.js";
import { Response } from "@web-std/fetch";
import { Histogram, Registry } from "prom-client";
import { HistogramSerializer } from "../prom-client-serializer/prom-client-serializer.js";

/**
 * @typedef {import('@miniflare/durable-objects').DurableObjectStorage} DurableObjectStorage
 */

export class IndexerMetricsCollector {
  /**
   * @param {DurableObjectStorage} storage
   * @param {string} fileSizeHistogramKey
   */
  constructor(storage, fileSizeHistogramKey = "fileSize/histogram") {
    this.fileSizeHistogramKey = fileSizeHistogramKey;
    const metrics = this.createMetricsFromStorage(storage);
    this.storage = storage;
    this.router = this.createRouter(metrics);
  }

  /**
   * @param {DurableObjectStorage} storage
   * @returns {Promise<IndexerMetricsPrometheusContext>}
   */
  async createMetricsFromStorage(storage) {
    const registry = new Registry();
    const fileSizeHistogramSerialized = await storage.get(
      this.fileSizeHistogramKey
    );
    const sizeHistogramFromStorage = fileSizeHistogramSerialized
      ? HistogramSerializer.deserialize(
          /** @type {import("../prom-client-serializer/prom-client-serializer.js").SerializedHistogram} */ (
            fileSizeHistogramSerialized
          ),
          [registry]
        )
      : undefined;
    return new IndexerMetricsPrometheusContext(
      registry,
      sizeHistogramFromStorage
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
    await storage.put(
      this.fileSizeHistogramKey,
      await HistogramSerializer.serialize(metrics.fileSize)
    );
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
    if (!isValid(IndexerNotified, requestBody)) {
      return new Response("request body is not a valid event type", {
        status: 400,
      });
    }
    const event = requestBody;
    switch (event.type) {
      case "IndexerNotified":
        metrics.fileSize.observe(event.byteLength);
        break;
      default:
        /** @type {never} */
        // eslint-disable-next-line no-case-declarations, no-unused-vars, @typescript-eslint/no-unused-vars
        const exhaustiveCheck = event.type;
        throw new Error(`unexpected event type: ${String(event.type)}`);
    }
    await storeMetrics(metrics);
    return new Response("got event", { status: 202 });
  };
}

class IndexerMetricsPrometheusContext {
  /**
   * @param {import('prom-client').Histogram<string>} fileSize
   */
  constructor(
    registry = new Registry(),
    fileSize = new Histogram({
      name: "file_size_bytes",
      help: "file seen with certain size",
      registers: [registry],
    })
  ) {
    this.registry = registry;
    this.fileSize = fileSize;
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
