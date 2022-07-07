export { IndexerMetricsCollector } from "./indexer-metrics-collector.mjs";

export default {
  /**
   *
   * @param {import('@miniflare/core').Request} request
   * @param {object} env
   * @param {import('@miniflare/durable-objects').DurableObjectNamespace} env.IndexerMetricsCollector
   */
  fetch(request, env) {
    const { IndexerMetricsCollector } = env;
    const id = IndexerMetricsCollector.idFromName("default");
    const stub = IndexerMetricsCollector.get(id);
    return stub.fetch(request.clone());
  },
};
