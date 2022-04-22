import * as fs from 'fs'
import logger from '../logger/winston'
import store from './store'
import { Schema } from './types/schema'

const ALLOWED_METHODS = [
    "POST",
    "PUT",
    "DELETE"
]

const SUPPORTED_STRING_OPERATIONS = [
    "equals",
    "equals_ignore_casing",
    "regex",
    "includes",
    "starts_with",
    "ends_with"
]

export default () => {
    readDirectory('schemas')
}

function readDirectory(path: string) {
    const entries = fs.readdirSync(path, {
        withFileTypes: true
    }).filter(file => file.isDirectory() || file.isFile())

    const schemas = entries.filter(file => file.isFile() && file.name.toLowerCase() === 'schema.json')
    const nests = entries.filter(file => file.isDirectory())

    if (schemas.length === 0 && nests.length === 0) {
        logger.error({
            errors: [
                `No schema could be found on ${path}, please create one first.`
            ]
        })
        return
    }

    if (schemas.length === 0 && nests.length > 0) {
        for (const nest of nests) {
            readDirectory(path + "/" + nest.name)
        }

        return
    }

    if (schemas.length > 0 && nests.length === 0) {
        for (const schema of schemas) {
            const schemaObject = readSchema(path, entries)
            store.add(schemaObject.options, schemaObject.schema)
        }
        return
    }

    for (const schema of schemas) {
        const schemaObject = readSchema(path, entries)
        store.add(schemaObject.options, schemaObject.schema)
    }

    for (const nest of nests) {
        readDirectory(path + "/" + nest.name)
    }
}

function readSchema(path: string, entries: fs.Dirent[]): Schema {
    const schema = JSON.parse(fs.readFileSync(path + "/schema.json", { encoding: 'utf8' }))
    const route = path.substring('schemas'.length)
    const options = entries.filter(file => file.isFile() && file.name.toLowerCase() === 'options.json')

    logger.info('A schema was found.', {
        route: route,
        schema: schema
    })

    if (options.length === 0) {
        return {
            schema: schema,
            options: {
                route: route,
                method: "get"
            }
        }
    }

    const option = JSON.parse(fs.readFileSync(path + "/options.json", { encoding: 'utf8' }))

    if (!option.method || !ALLOWED_METHODS.includes(option.method.toUpperCase())) {
        throw {
            errors: [
                {
                    message: `Falsey property on ${path + "/options.json"}`,
                    field: 'method',
                    suggestions: ALLOWED_METHODS.join(' | ')
                }
            ]
        }
    }

    if (option.forward) {
        if (typeof option.forward !== 'object') {
            throw {
                errors: [
                    {
                        message: `Invalid type on ${path + "/options.json"}`,
                        field: 'forward',
                        suggestions: "SchemaForward object"
                    }
                ]
            }
        }

        if (!(option.forward.address && option.forward.method)) {
            throw {
                errors: [
                    {
                        message: `Invalid type on ${path + "/options.json"}`,
                        field: 'forward',
                        suggestions: "SchemaForward object"
                    }
                ]
            }
        }

        if (typeof option.forward.address !== 'string') {
            throw {
                errors: [
                    {
                        message: `Invalid type on ${path + "/options.json"}`,
                        field: 'forward.address',
                        suggestions: "string"
                    }
                ]
            }
        }

        if (typeof option.forward.method !== 'string') {
            throw {
                errors: [
                    {
                        message: `Invalid type on ${path + "/options.json"}`,
                        field: 'forward.address',
                        suggestions: "string"
                    }
                ]
            }
        }

        if (!["POST", "PUT"].includes(option.forward.method.toUpperCase())) {
            throw {
                errors: [
                    {
                        message: `Falsey property on ${path + "/options.json"}`,
                        field: 'forward.method',
                        suggestions: "POST | PUT"
                    }
                ]
            }
        }
    }

    if (option.addresses && typeof option.addresses === 'string') {
        option.addresses = [option.addresses]
    }

    if (option.addresses) {

        if (!Array.isArray(option.addresses)) {
            throw {
                errors: [
                    {
                        message: `Invalid type on ${path + "/options.json"}`,
                        field: 'addresses',
                        suggestions: "array of string"
                    }
                ]
            };
        }

        for (const address of option.addresses) {
            if (typeof address !== 'string') {
                throw {
                    errors: [
                        {
                            message: `Invalid type on ${path + "/options.json"}`,
                            field: 'addresses',
                            suggestions: "array of string"
                        }
                    ]
                }
            }
        }

    }

    if (option.headers) {
        if (!Array.isArray(option.headers)) {
            throw {
                errors: [
                    {
                        message: `Invalid type on ${path + "/options.json"}`,
                        field: 'headers',
                        suggestions: "array of SchemaHeaders"
                    }
                ]
            }
        }


        let index = 0
        for (const header of option.headers) {
            if (typeof header === 'string') {
                throw {
                    errors: [
                        {
                            message: `Invalid type on ${path + "/options.json"}`,
                            field: `headers[${index}]`,
                            suggestions: `${JSON.stringify({ header: null, comparison: "equals", value: "header" })}`
                        }
                    ]
                }
            }

            if (typeof header !== 'object') {
                throw {
                    errors: [
                        {
                            message: `Invalid type on ${path + "/options.json"}`,
                            field: `headers[${index}]`,
                            suggestions: 'SchemaHeader object'
                        }
                    ]
                }
            }

            if (!(header.value && header.comparison && header.header)) {
                throw {
                    errors: [
                        {
                            message: `Invalid type on ${path + "/options.json"}`,
                            object: `headers[${index}]`,
                            suggestions: 'SchemaHeader object'
                        }
                    ]
                }
            }

            if (!(typeof header.value === 'string' && typeof header.comparison === 'string' && typeof header.value === 'string')) {
                throw {
                    errors: [
                        {
                            message: `Invalid type on one of the fields of the object headers[${index}] in ${path + "/options.json"}`,
                            suggestions: 'all fields typeof string'
                        }
                    ]
                }
            }

            if (!SUPPORTED_STRING_OPERATIONS.includes(header.comparison.toLowerCase())) {
                throw {
                    errors: [
                        {
                            message: `Unsupported value on one of the fields of the object headers[${index}] in ${path + "/options.json"}`,
                            field: `headers[${index}].comparison`,
                            suggestions: SUPPORTED_STRING_OPERATIONS.join(' | ')
                        }
                    ]
                }
            }
            index++
        }

    }

    if (option.agent) {
        if (!Array.isArray(option.agent)) {
            throw {
                errors: [
                    {
                        message: `Invalid type on ${path + "/options.json"}`,
                        field: 'agent',
                        suggestions: "array of SchemaAgent"
                    }
                ]
            }
        }

        let index = 0
        for (const agent of option.agent) {
            if (typeof agent === 'string') {
                throw {
                    errors: [
                        {
                            message: `Invalid type on ${path + "/options.json"}`,
                            field: `agent[${index}]`,
                            suggestions: `${JSON.stringify({ comparison: "equals", value: agent })}`
                        }
                    ]
                }
            }

            if (typeof agent !== 'object') {
                throw {
                    errors: [
                        {
                            message: `Invalid type on ${path + "/options.json"}`,
                            field: `agent[${index}]`,
                            suggestions: 'SchemaAgent object'
                        }
                    ]
                }
            }

            if (!(agent.value && agent.comparison)) {
                throw {
                    errors: [
                        {
                            message: `Invalid type on ${path + "/options.json"}`,
                            object: `agent[${index}]`,
                            suggestions: 'SchemaAgent object'
                        }
                    ]
                }
            }

            if (!(typeof agent.comparison === 'string' && typeof agent.value === 'string')) {
                throw {
                    errors: [
                        {
                            message: `Invalid type on one of the fields of the object headers[${index}] in ${path + "/options.json"}`,
                            suggestions: 'all fields typeof string'
                        }
                    ]
                }
            }

            if (!SUPPORTED_STRING_OPERATIONS.includes(agent.comparison.toLowerCase())) {
                throw {
                    errors: [
                        {
                            message: `Unsupported value on one of the fields of the object headers[${index}] in ${path + "/options.json"}`,
                            field: `headers[${index}].comparison`,
                            suggestions: SUPPORTED_STRING_OPERATIONS.join(' | ')
                        }
                    ]
                }
            }
            index++
        }

    }

    return {
        schema: schema,
        options: {
            route: route,
            forward: option.forward,
            method: option.method.toUpperCase(),
            addresses: option.addresses,
            agent: option.agent,
            headers: option.headers
        }
    }
}