import { isValid } from "../schema.js";
import { test } from "../testing.js";
import { IndexerCompleted, IndexerNotified } from "./indexer-events.js";

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
