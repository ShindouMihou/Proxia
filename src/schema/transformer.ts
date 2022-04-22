import { Schema } from "./types/schema";
import logger from '../logger/winston'

export default (schema: Schema, body: any): any => {
    let response = {}

    response = scan(schema.schema, body)

    return response
}

function scan(object: any, body: any): any {
    const response = {}
    Object.entries(object).forEach((entry) => {
        const key = entry[0]
        const value = entry[1]

        if (typeof value === 'string' && value.startsWith("$")) {
            (response as any)[key] = find(value, body)
        } else if (typeof value === 'object') {
            (response as any)[key] = scan(value, body)
        } else {
            (response as any)[key] = value
        }
    })
    return response
}

function find(token: string, body: any): any {
    try {
        const keys = token.substring(1).split('->')

        if (keys.length == 1) {
            return body[keys[0].trim()]
        }

        let value = body;
        for (const key of keys) {
            value = value[key.trim()]
        }

        return value
    } catch (error: any) {
        logger.error({
            errors: [
                {
                    message: "An error occurred while trying to find the value.",
                    token: token,
                    body: body,
                    related: {
                        message: error.message,
                    }
                }
            ]
        })

        throw({
            errors: [{message: "The request does not meet the schema's requirements."}]
        })
    }
}