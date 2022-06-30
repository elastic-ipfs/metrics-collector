import Ajv from "ajv/dist/ajv.js";
import ajvFormats from "ajv-formats";

/**
 * @typedef {import('ajv').JSONSchemaType<Type>} JSONSchemaType
 * @template Type
 */

/**
 * @typedef TypeTagged
 * @property {TypeName} type
 * @template TypeName
 */

/**
 * @typedef IndexerNotifiedType
 * @property {number} byteLength - length in bytes of item to be indexed
 * @property {"IndexerNotified"} type
 * @property {string} uri - uri of item to be indexed
 * @property {string} startTime - time at which indexer was notified
 */

/** Common ajv instance for schema validation */
const ajv = ajvFormats(new Ajv());

/**
 * Determine whether the provided object is a valid instance of an event type
 * @param {{schema: JSONSchemaType<Type>}} typeDefinition
 * @param {unknown} instance
 * @template Type
 */
export function isValid(typeDefinition, instance) {
  const validate = ajv.compile(typeDefinition.schema);
  return validate(instance);
}

/**
 * Event that represents the ipfs indexer being notified of a new file to index.
 * It's usually expected that the ipfs system will then retrieve the file,
 * start indexing it, and eventually emit an event when indexing is complete.
 */
export class IndexerNotified {
  type = /** @type {const} */ ("IndexerNotified")
  /**
   * @param {number} byteLength
   * @param {string} uri
   * @param {Date} startTime 
   */
  constructor(
    uri,
    byteLength,
    startTime
  ) {
    this.uri = uri
    this.byteLength = byteLength
    this.startTime = startTime.toISOString()
    // assert this @implements IndexerNotifiedType
    void (/** @type {IndexerNotifiedType} */ (this))
  }
  /**
   * @type {JSONSchemaType<IndexerNotified>}
   * @template Type
   */
  static schema = {
    type: "object",
    properties: {
      byteLength: { type: "number" },
      startTime: { type: "string", format: "date-time" },
      type: { type: "string", const: /** @type {const} */ ("IndexerNotified") },
      uri: { type: "string", format: "uri" },
    },
    required: ["startTime", "type", "uri", "byteLength"],
  };
}
