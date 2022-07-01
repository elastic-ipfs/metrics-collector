import jsf from "json-schema-faker";
import Ajv from "ajv/dist/ajv.js";
import ajvFormats from "ajv-formats";

/**
 * @typedef {import('ajv').JSONSchemaType<Type>} JSONSchemaType
 * @template Type
 */

const ajv = ajvFormats(new Ajv());

/**
 *
 * @param {import('ajv').JSONSchemaType<Type>} schema
 * @template Type
 * @returns Type
 */
export function generate(schema) {
  const instance = jsf.generate(
    /** @type {import('json-schema-faker').Schema} */ (schema)
  );
  if (!ajv.validate(schema, instance)) {
    throw new Error("generated value does not match schema");
  }
  return instance;
}

/**
 * Determine whether the provided object is a valid instance of an event type
 * @param {{schema: JSONSchemaType<Type>}} typeDefinition
 * @param {unknown} instance
 * @template Type
 * @returns {instance is Type}
 */
export function isValid(typeDefinition, instance) {
  const validate = ajv.compile(typeDefinition.schema);
  return validate(instance);
}
