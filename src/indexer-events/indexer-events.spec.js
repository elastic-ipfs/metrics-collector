import { test } from "../testing.js"

/**
 * Determine whether the provided object is a valid instance of an event type
 * @param {IndexerNotified} typeDefinition
 * @param {unknown} instance
 */
function isValid(
    typeDefinition,
    instance,
) {
    return false
}

/**
 * Validate a message to determine whether it is an IndexerNotified event
 * @param {unknown} event 
 * @returns {boolean}
 */
function validateIndexerNotified(event) {
    return isValid(IndexerNotified, event)
}

class IndexerNotified {
    static validate = validateIndexerNotified
}

test('can create an IndexerNotified event', async (t) => {
    t.is(isValid(IndexerNotified, {}), false)
    const sampleIndexerNotified = {
        type: "IndexerNotified",
    }
    t.is(isValid(IndexerNotified, sampleIndexerNotified), false)
})
