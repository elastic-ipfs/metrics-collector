/**
 * @typedef {import('ajv').JSONSchemaType<Type>} JSONSchemaType
 * @template Type
 */

/**
 * @typedef IndexerNotifiedType
 * @property {number} byteLength - length in bytes of item to be indexed
 * @property {"IndexerNotified"} type
 * @property {string} uri - uri of item to be indexed
 * @property {string} startTime - time at which indexer was notified
 */

/**
 * Event that represents the ipfs indexer being notified of a new file to index.
 * It's usually expected that the ipfs system will then retrieve the file,
 * start indexing it, and eventually emit an event when indexing is complete.
 */
export class IndexerNotified {
  type = /** @type {const} */ ("IndexerNotified");
  /**
   * @param {number} byteLength
   * @param {string} uri
   * @param {Date} startTime
   */
  constructor(uri, byteLength, startTime) {
    this.uri = uri;
    this.byteLength = byteLength;
    this.startTime = startTime.toISOString();
    // assert this @implements IndexerNotifiedType
    // eslint-disable-next-line no-void
    void (/** @type {IndexerNotifiedType} */ (this));
  }

  /**
   * @type {JSONSchemaType<IndexerNotified>}
   * @template Type
   */
  static schema = {
    type: "object",
    properties: {
      byteLength: { type: "integer", minimum: 0 },
      startTime: { type: "string", format: "date-time" },
      type: { type: "string", const: /** @type {const} */ ("IndexerNotified") },
      uri: { type: "string", format: "uri" },
    },
    required: ["startTime", "type", "uri", "byteLength"],
  };
}
