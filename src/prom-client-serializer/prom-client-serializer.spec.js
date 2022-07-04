import assert from "node:assert";
import { Histogram } from "prom-client";
import { test } from "../testing.js";

/**
 * @typedef SerializedHistogram
 * @property {"histogram"} type
 * @property {string} name
 * @property {string} help
 * @property {string[]} labelNames
 * @property {number[]} buckets
 * @property {Array<{ metricName: string, value: number, labels: Record<string,string> }>} values
 */

class PromClientSerializer {
  /**
   * @param {Histogram<string>} metric
   * @returns {Promise<SerializedHistogram>}
   */
  static async serialize(metric) {
    console.log("serializing", metric);
    const got = await metric.get();
    const labelNames = metric.labelNames;
    const buckets = metric.buckets;
    const { name, help, type, values, aggregator } = got;
    console.log("got", { name, help, type, values, aggregator });
    const stringified = {
      labelNames,
      buckets,
      name,
      help,
      type,
      values,
      aggregator,
    };
    return stringified;
  }

  /**
   * @param {SerializedHistogram} serialized
   * @returns {Histogram<string>}
   */
  static deserialize(serialized) {
    assert.ok(serialized.type === "histogram");
    const histogram = new Histogram({
      name: serialized.name,
      help: serialized.help,
      buckets: serialized.buckets,
    });
    return histogram;
  }
}

test("can serialize/deserialize a prom-client histogram", async (t) => {
  const histogram = new Histogram({
    name: "test_metric",
    help: "its a metric",
  });
  const sampleSize = 5;
  const samples = new Array(sampleSize).fill(0).map((e, i) => i);
  for (const sample of samples) {
    histogram.observe(sample);
  }
  t.is(/** @type {any} */ (histogram).name, "test_metric");

  const serialized = await PromClientSerializer.serialize(histogram);
  console.log("serialized", JSON.stringify(serialized, null, 2));
  const deserialized = PromClientSerializer.deserialize(serialized);
  t.is(countHistogramEntries(deserialized), sampleSize);
});

/**
 * @param {Histogram<string>} histogram
 * @returns {number}
 */
function countHistogramEntries(histogram) {}
