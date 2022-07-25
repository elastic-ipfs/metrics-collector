import { Router } from "itty-router";
import {
  IndexerCompleted,
  IndexerNotified,
} from "../indexer-events/indexer-events.js";
import { isValid } from "../schema.js";
import { Response } from "@web-std/fetch";
import { HistogramSerializer } from "../prom-client-serializer/prom-client-serializer.js";
import { Histogram, linearBuckets, Registry } from "./prometheus.js";
import assert from "assert";
import { hasOwnProperty } from "../object.js";
import { basicAuthentication } from "./basic-auth.js";

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
 * @typedef {"postEvent"|"getMetrics"} IndexerMetricsCollectorCapability
 */

/**
 * @typedef {Record<string, { passwords: string[], capabilities: IndexerMetricsCollectorCapability[]}>} ClientsPolicy
 */

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
   * @param {Record<string,string>} defaultPrometheusLabels - object with key/values that should be on all prometheus metrics (e.g. 'instance', 'jobName)
   * @param {ClientsPolicy} clients
   */
  constructor(
    state,
    env,
    clients = IndexerMetricsCollector.envTo.clients(env),
    fileSizeHistogramStorageKey = "fileSize/histogram",
    indexingDurationSecondsStorageKey = "indexingDurationSeconds/histogram",
    defaultPrometheusLabels = IndexerMetricsCollector.envTo.defaultPrometheusLabels(
      env
    )
  ) {
    const storage = state.storage;
    this.storage = storage;
    this.indexingDurationSecondsStorageKey = indexingDurationSecondsStorageKey;
    this.fileSizeHistogramStorageKey = fileSizeHistogramStorageKey;
    const metrics = this.createMetricsFromStorage(
      storage,
      defaultPrometheusLabels
    );
    this.router = this.createRouter(metrics, clients);
  }

  /**
   * Methods for parsing things out of the env vars passed to the constructor
   */
  static envTo = {
    /**
     * @param {unknown} env
     * @returns {ClientsPolicy}
     */
    clients(env) {
      /** @type import('ajv').JSONSchemaType<ClientsPolicy> */
      const clientsSchema = {
        type: "object",
        required: [],
        additionalProperties: {
          type: "object",
          required: ["capabilities", "passwords"],
          capabilities: {
            type: "array",
            items: {
              enum: ["postEvent", "getMetrics"],
            },
          },
          passwords: {
            type: "array",
            items: {
              type: "string",
            },
          },
        },
      };
      if (env && hasOwnProperty(env, "CLIENTS")) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const parsed = JSON.parse(String(env.CLIENTS));
        if (!isValid({ schema: clientsSchema }, parsed)) {
          throw new Error("unable to parse env.CLIENTS as ClientsPolicy");
        }
        return parsed;
      }
      return {};
    },
    /**
     * @param {unknown} env
     * @returns {Record<string,string>}
     */
    defaultPrometheusLabels(env) {
      if (env && hasOwnProperty(env, "PROMETHEUS_DEFAULT_LABELS")) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const envValue = env.PROMETHEUS_DEFAULT_LABELS;
        assert.ok(typeof envValue === "string");
        if (envValue) {
          /** @type {Record<string,string>} */
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const parsed = JSON.parse(envValue);
          return parsed;
        }
      }
      return {};
    },
  };

  /**
   * @param {DurableObjectStorage} storage
   * @param {Record<string,string>} defaultPrometheusLabels - object with key/values that should be on all prometheus metrics (e.g. 'instance', 'jobName)
   * @returns {Promise<IndexerMetricsPrometheusContext>}
   */
  async createMetricsFromStorage(storage, defaultPrometheusLabels) {
    const registry = new Registry();
    registry.setDefaultLabels(defaultPrometheusLabels);
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
   * @param {ClientsPolicy} clients
   * @returns {Router}
   */
  createRouter(metrics, clients) {
    const router = Router();
    router.get("/", () => {
      return new Response("indexer-metrics-collector", { status: 200 });
    });
    router.post(
      "/events",
      this.createAuthorizationMiddleware(
        "postEvent",
        this.hasCapability.bind(this, clients)
      ),
      PostEventsRoute(metrics, (m) => this.storeMetrics(this.storage, m))
    );
    router.get(
      "/metrics",
      this.createAuthorizationMiddleware(
        "getMetrics",
        this.hasCapability.bind(this, clients)
      ),
      GetMetricsRoute(metrics)
    );
    return router;
  }

  /**
   * Check whether the provided authorization string implies having a capability
   * @param {ClientsPolicy} clients
   * @param {string} authorization
   * @param {IndexerMetricsCollectorCapability} capability
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async hasCapability(clients, authorization, capability) {
    let parsedBasicAuth;
    try {
      parsedBasicAuth = basicAuthentication(authorization);
    } catch (error) {
      console.debug("error parsing authorization as basic auth", error);
      return false;
    }
    const { user, password } = parsedBasicAuth;
    if (!(user in clients)) {
      console.debug("unknown user", user);
      return false;
    }
    if (!clients[user].passwords.includes(password)) {
      console.debug("wrong password for user", user);
      return false;
    }
    return clients[user].capabilities.includes(capability);
  }

  /**
   *
   * @param {IndexerMetricsCollectorCapability} requiredCapability
   * @param {(authorization: string, capability: IndexerMetricsCollectorCapability) => Promise<boolean>} hasCapability
   */
  createAuthorizationMiddleware(requiredCapability, hasCapability) {
    /**
     * @param {Request} request
     */
    const authorizationMiddleware = async (request) => {
      const authorization = request.headers.get("authorization");
      if (!authorization) {
        return new Response(
          "please provide authorization via Authorization request header",
          {
            status: 401,
          }
        );
      }
      if (!(await hasCapability(authorization, requiredCapability))) {
        return new Response(
          "provided authorization does not allow required capability",
          {
            status: 403,
          }
        );
      }
    };
    return authorizationMiddleware;
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
