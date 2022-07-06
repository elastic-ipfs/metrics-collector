/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * @fileoverview re-export some things from prom-client, but without using its main entrypoint,
 * which ends up requiring a bunch of node stdlib stuff (e.g. 'v8') that doesn't work great with cloudflare/wrangler/miniflare
 */

export { linearBuckets } from "prom-client/lib/bucketGenerators.js";
export { default as Registry } from "prom-client/lib/registry.js";
export { default as Histogram } from "prom-client/lib/histogram.js";
