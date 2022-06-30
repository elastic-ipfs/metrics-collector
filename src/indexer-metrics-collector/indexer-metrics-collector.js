import { Router } from 'itty-router';
import { IndexerNotified } from '../indexer-events/indexer-events.js';
import { isValid } from '../schema.js';
import { Request, Response } from "@web-std/fetch";

export class IndexerMetricsCollector {
    get router() {
        const router = Router()
        router.post("/events", PostEventsRoute())
        router.get("/metrics", GetMetricsRoute())
        return router
    }
    /** 
     * @param {Request} request
     * @returns {Promise<Response>}
     */
    async fetch(request) {
        const response = await this.router.handle(request)
        return response || new Response('route not found', { status: 404 })
    }
}

/**
 * Route to handle POST /events/
 * Which should have requests 
 */
function PostEventsRoute() {
    /**
     * @param {Request} request 
     */
    return async (request) => {
        /** @type {unknown} */
        let requestBody
        try {
            requestBody = await request.json()
        } catch (error) {
            return new Response('unable to parse request body as json', { status: 400 })
        }
        if ( ! isValid(IndexerNotified, requestBody)) {
            return new Response('request body is not a valid event type', { status: 400 })
        }
        const event = requestBody
        // console.log('PostEventsRoute got event', event)
        return new Response('got event', { status: 202 })
    }
}

function GetMetricsRoute() {
    /**
     * @param {Request} request 
     * @returns {Promise<Response>}
     */
     return async (request) => {
        return new Response('todo metrics', { status: 200 })
    }
}
