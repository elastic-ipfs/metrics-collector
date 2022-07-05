import { Histogram, Registry } from "prom-client";
import { test } from "../testing.js";
import {
  countHistogramEntries,
  HistogramSerializer,
} from "./prom-client-serializer.js";

test("can serialize/deserialize a prom-client histogram", async (t) => {
  const registry1 = new Registry();
  const histogram = new Histogram({
    name: "test_metric",
    help: "its a metric",
    registers: [registry1],
    labelNames: ["testValue1", "testValue2"],
  });
  const sampleSize = 5;
  const samples = new Array(sampleSize).fill(0).map((e, i) => i);
  for (const sample of samples) {
    histogram.observe({ testValue1: sample, testValue2: sample }, sample);
  }
  t.is(/** @type {any} */ (histogram).name, "test_metric");
  // test that we can serialize | deserialize and get the same metrics
  const serialized = await HistogramSerializer.serialize(histogram);
  const registry2 = new Registry();
  const deserialized = HistogramSerializer.deserialize(serialized, [registry2]);
  t.is(await registry1.metrics(), await registry2.metrics());
  t.is(countHistogramEntries(deserialized), sampleSize);
});
