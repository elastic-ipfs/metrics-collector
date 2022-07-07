import { isValid } from "../schema.js";
import { test } from "../testing.js";
import { IndexerCompleted, IndexerNotified } from "./indexer-events.js";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import * as fs from "fs/promises";
import { hasOwnProperty } from "../object.js";
import * as assert from "assert";
import * as events from "./indexer-events.js";
const __dirname = dirname(fileURLToPath(import.meta.url));

const exampleImageUri =
  "https://bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy.ipfs.nftstorage.link/";

test("can create an IndexerNotified event", (t) => {
  const sampleIndexerNotified = new IndexerNotified(
    exampleImageUri,
    1,
    new Date()
  );
  t.assert(typeof sampleIndexerNotified.startTime, "string");
  t.assert(typeof sampleIndexerNotified.uri, "string");
  t.is(sampleIndexerNotified.type, "IndexerNotified");
});

test("can validate an IndexerNotified event", (t) => {
  t.is(isValid(IndexerNotified, { type: "IndexerNotified" }), false);

  t.is(
    isValid(IndexerNotified, {
      byteLength: 1,
      startTime: new Date().toISOString(),
      type: "IndexerNotified",
      uri: exampleImageUri,
    }),
    true
  );

  t.is(
    isValid(
      IndexerNotified,
      new IndexerNotified(exampleImageUri, 1, new Date())
    ),
    true
  );
});

test("can validate an IndexerCompleted event", (t) => {
  t.is(isValid(IndexerCompleted, { type: "IndexerCompleted" }), false);

  t.is(
    isValid(IndexerCompleted, {
      byteLength: 1,
      indexing: {
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
      },
      type: "IndexerCompleted",
      uri: exampleImageUri,
    }),
    true
  );

  t.is(
    isValid(
      IndexerCompleted,
      new IndexerCompleted(exampleImageUri, 1, {
        startTime: new Date(),
        endTime: new Date(),
      })
    ),
    true
  );
});

test("indexer-events examples are all valid", async (t) => {
  const examplesDir = join(__dirname, "examples");
  for (const file of await fs.readdir(examplesDir)) {
    const json = /** @type {unknown } */ (
      await fs.readFile(join(examplesDir, file), { encoding: "utf-8" })
    );
    const parsed = /** @type {unknown} */ (JSON.parse(String(json)));
    assert.ok(hasOwnProperty(parsed, "type"));
    const typ = /** @type {keyof typeof events} */ (parsed.type);
    /**
     * @template T
     * @type {{ schema: import("ajv").JSONSchemaType<T> }}
     */
    const typeDef = events[typ];
    t.assert(isValid(typeDef, parsed));
  }
});
