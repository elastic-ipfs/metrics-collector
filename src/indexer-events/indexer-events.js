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
 * start indexing it, and eventually emit an IndexerCompleted event when indexing is complete.
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

/**
 * @typedef IndexerCompletedType
 * @property {number} byteLength - length in bytes of item to be indexed
 * @property {"IndexerCompleted"} type
 * @property {string} uri - uri of item to be indexed
 * @property {object} indexing - describes the indexing process that is now complete
 * @property {string} indexing.startTime - when indexing started
 * @property {string} indexing.endTime - when indexing completed
 */

/**
 * Event that represents the ipfs indexer successfully completing an indexing process
 */
export class IndexerCompleted {
  type = /** @type {const} */ ("IndexerCompleted");
  /**
   * @param {number} byteLength
   * @param {string} uri
   * @param {object} indexing - describes the indexing process that is now complete
   * @param {Date} indexing.startTime - when indexing started
   * @param {Date} indexing.endTime - when indexing completed
   */
  constructor(uri, byteLength, indexing) {
    this.uri = uri;
    this.byteLength = byteLength;
    this.indexing = {
      startTime: indexing.startTime.toISOString(),
      endTime: indexing.endTime.toISOString(),
    };
    // assert this @implements IndexerCompletedType
    // eslint-disable-next-line no-void
    void (/** @type {IndexerCompletedType} */ (this));
  }

  /**
   * @type {JSONSchemaType<IndexerCompleted>}
   * @template Type
   */
  static schema = {
    type: "object",
    properties: {
      byteLength: { type: "integer", minimum: 0 },
      type: {
        type: "string",
        const: /** @type {const} */ ("IndexerCompleted"),
      },
      uri: { type: "string", format: "uri" },
      indexing: {
        type: "object",
        properties: {
          startTime: { type: "string", format: "date-time" },
          endTime: { type: "string", format: "date-time" },
        },
        required: ["startTime", "endTime"],
      },
    },
    required: ["type", "uri", "byteLength", "indexing"],
  };
}
