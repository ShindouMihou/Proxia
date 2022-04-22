import Fastify, { FastifyInstance, FastifyReply, FastifyRequest, RouteHandlerMethod, RouteShorthandOptions } from 'fastify'
import { Server, IncomingMessage, ServerResponse } from 'http'
import logger from './logger/winston'
import schemaReader from './schema/reader'
import schemaStore from './schema/store'
import middie from 'middie'
import transformer from './schema/transformer'
import { Schema, SchemaHeaders, SchemaUserAgent } from './schema/types/schema'
import forward from './axios/wrapper'

const server: FastifyInstance = Fastify({})

server.register(middie, {
    hook: 'onRequest'
})

server.addHook('onRequest', async (request, response) => {
    logger.info({
        method: request.method,
        route: request.routerPath,
        body: request.body,
        ip: request.ip,
        agent: request.headers['user-agent'],
        contentType: request.headers['content-type']
    })

    if(!request.headers['content-type'] || request.headers['content-type'] !== 'application/json') {
        return response.code(400).send({
            errors: [
                {
                    message: "Invalid content-type headers.",
                    field: "headers.content-type",
                    suggestion: "application/json"
                }
            ]
        })
    }
})


const opts: RouteShorthandOptions = {}

server.get('/hello', opts, async (request, reply) => {
    return {
        "hello": "world"
    }
})

const start = async () => {
    try {
        await server.listen(6736)

        logger.info("Listening for any requests to be transformed and forwarded.", {
            port: 6736
        })
    } catch (err) {
        console.error(err)
        process.exit(1)
    }
}

schemaReader()

function test(gate: SchemaUserAgent | SchemaHeaders, value: string): boolean {
    let allowed = false;
    switch (gate.comparison) {
        case "ends_with": {
            allowed = value.endsWith(gate.value)
            break;
        };
        case "starts_with": {
            allowed = value.startsWith(gate.value)
            break;
        };
        case "equals": {
            allowed = (value === gate.value)
            break;
        };
        case "equals_ignore_casing": {
            allowed = (value.toLowerCase() === gate.value.toLowerCase())
            break;
        };
        case "includes": {
            allowed = value.includes(gate.value)
            break;
        };
        case "regex": {
            allowed = new RegExp(gate.value).test(value)
            break;
        };
    }    
    return allowed;
}

function handle(value: Schema, request: FastifyRequest, response: FastifyReply) {
    if (value.options.addresses && !value.options.addresses.includes(request.ip)) {
        return response.code(403).send()
    }

    if (value.options.agent) {
        let userAgent = request.headers['user-agent']

        if (!userAgent) {
            return response.code(403).send()
        }

        let allowed = false
        for (const agent of value.options.agent) {
            allowed = test(agent, userAgent)
        }

        if (!allowed) {
            return response.code(403).send()
        }
    }

    if (value.options.headers) {
        let allowed = false;
        for (const header of value.options.headers) {
            let headerValue = request.headers[header.header.toLowerCase()]
            if (headerValue && typeof headerValue === 'string') {
                allowed = test(header, (headerValue as string))
            }
        }

        if (!allowed) {
            return response.code(403).send()
        }
    }

    try {
        const transformed = transformer(value, request.body)

        logger.info("Transformation was completed with the following results.", transformed)

        if (value.options.forward) {
            forward(value.options.forward, transformed)
        }

        return response.code(204).send()
    } catch (error) {
        return response.code(400).send(error)
    }
}


schemaStore.map().forEach((value, key) => {
    
    switch (value.options.method) {
        case 'POST': {
            server.post(key, opts, async (request, response) => handle(value, request, response));
        }

        case "PUT": {
            server.put(key, opts, async (request, response) => handle(value, request, response));
        }

        case "DELETE": {
            server.delete(key, opts, async (request, response) => handle(value, request, response));
        }
    }

    logger.info('A route was created.', {
        method: value.options.method,
        route: value.options.route
    })
});

start()