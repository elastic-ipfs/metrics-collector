import { Router } from "itty-router";
import { IndexerNotified } from "../indexer-events/indexer-events.js";
import { isValid } from "../schema.js";
import { Response } from "@web-std/fetch";
import { Histogram, Registry } from "prom-client";
// import assert from "node:assert";

/**
 * @typedef {import('@miniflare/durable-objects').DurableObjectStorage} DurableObjectStorage
 */

export class IndexerMetricsCollector {
  /**
   * @param {DurableObjectStorage} storage
   */
  constructor(storage) {
    const metrics = this.createMetricsFromStorage(storage);
    this.router = this.createRouter(metrics);
  }

  /**
   * @param {DurableObjectStorage} storage
   * @returns {Promise<IndexerMetricsPrometheusContext>}
   */
  async createMetricsFromStorage(storage) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
    const storedString = await storage.get("prometheusMetricsString");
    return new IndexerMetricsPrometheusContext();
  }

  /**
   * @param {Promise<IndexerMetricsPrometheusContext>} metrics
   * @returns {Promise<Router>}
   */
  async createRouter(metrics) {
    const router = Router();
    router.post("/events", PostEventsRoute(await metrics));
    router.get("/metrics", GetMetricsRoute(await metrics));
    return router;
  }

  /**
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async fetch(request) {
    /** @type {Response|undefined} */
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const response = await (await this.router).handle(request);
    return response || new Response("route not found", { status: 404 });
  }
}

/**
 * Route to handle POST /events/
 * Which should have requests
 * @param {IndexerMetricsPrometheusContext} metrics
 */
function PostEventsRoute(metrics) {
  /**
   * @param {Request} request
   */
  return async (request) => {
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
    // console.log('PostEventsRoute got event', event)
    return new Response("got event", { status: 202 });
  };
}

class IndexerMetricsPrometheusContext {
  constructor(registry = new Registry()) {
    this.registry = registry;
    /**
     * @type {Pick<import('prom-client').Histogram<never>, 'observe'>}
     */
    this.fileSize = new Histogram({
      name: "file_size_bytes",
      help: "file seen with certain size",
      registers: [this.registry],
    });
  }
}

/**
 * @param {IndexerMetricsPrometheusContext} metrics
 */
function GetMetricsRoute(metrics) {
  /**
   * @param {Request} _request
   * @returns {Promise<Response>}
   */
  return async (_request) => {
    return new Response(await metrics.registry.metrics(), { status: 200 });
  };
}
