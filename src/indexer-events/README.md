# indexer-events

[elastic-ipfs](https://github.com/elastic-ipfs/elastic-ipfs) event types that describe the elastic-ipfs indexing process

Each event type:
* has a constructor in `./indexer-events.js](./indexer-events.js)`
    * `constructor.schema` is a [json schema](https://json-schema.org) that can be used to validate objects against the schema
* has an example in [`./examples/{event.type}.json`](./examples)

## Example

```javascript
const { IndexerNotified } from './indexer-events.js';
const * as schema from '../schema.js';
const event1 = new IndexerNotified(
    1,
    "https://bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy.ipfs.nftstorage.link/",
    new Date(),
)
const event2 = schema.generate(IndexerNotified.schema)
for (const event of [event1, event2]) {
    if ( ! scehma.isValid(IndexerNotified, event)) {
        throw new Error('invalid event)
    }
}
```
