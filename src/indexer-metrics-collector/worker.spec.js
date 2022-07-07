import test from "ava";
import { Miniflare } from "miniflare";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { IndexerNotified } from "../indexer-events/indexer-events.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function useMiniflare() {
  return new Miniflare({
    modules: true,
    scriptPath: join(
      __dirname,
      "../../dist/indexer-metrics-collector/worker.js"
    ),
    packagePath: true,
    wranglerConfigPath: join(__dirname, "wrangler.toml"),
    buildCommand:
      "npx wrangler publish src/indexer-metrics-collector/worker.mjs --dry-run --outdir=dist/indexer-metrics-collector",
  });
}

test("can test indexer-metrics-collector with miniflare", async (t) => {
  // Get the Miniflare instance
  const mf = useMiniflare();
  // Dispatch a fetch event to our worker
  const res = await mf.dispatchFetch("http://localhost:8787");
  // Check the count is "1" as this is the first time we've been to this path
  t.is(await res.text(), "indexer-metrics-collector");

  // test sending an event
  const eventSubmissionResponse = await mf.dispatchFetch(
    "http://localhost:8787/events",
    {
      method: "post",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(
        new IndexerNotified("https://dag.house", 1, new Date())
      ),
    }
  );
  t.is(eventSubmissionResponse.status, 202);
});