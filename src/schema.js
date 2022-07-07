import jsf from "json-schema-faker";
import { Validator } from "@cfworker/json-schema";

/**
 * @typedef {import('ajv').JSONSchemaType<Type>} JSONSchemaType
 * @template Type
 */

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
  if (!isValid({ schema }, instance)) {
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
  const validator = new Validator(
    /** @type {import("@cfworker/json-schema").Schema} */ (
      typeDefinition.schema
    )
  );
  const result = validator.validate(instance);
  return result.valid;
}
