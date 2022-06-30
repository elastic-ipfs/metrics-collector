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
 * @property {"IndexerNotified"} type
 * @property {string} uri
 * @property {string} startTime
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
 * @property {string} uri - uri of file for which indexing is being requested
 * @property {string} startTime - datetime at which the indexer was notified
 */
export class IndexerNotified {
  type = /** @type {const} */ ("IndexerNotified")
  /**
   * @param {string} uri
   * @param {Date} startTime 
   */
  constructor(
    uri,
    startTime
  ) {
    this.uri = uri
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
      startTime: { type: "string", format: "date-time" },
      type: { type: "string", const: /** @type {const} */ ("IndexerNotified") },
      uri: { type: "string", format: "uri" },
    },
    required: ["startTime", "type", "uri"],
  };
}
