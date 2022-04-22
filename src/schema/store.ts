import { Schema, SchemaOptions } from "./types/schema"

const schemas: Map<string, Schema> = new Map()

export default {
    add: (options: SchemaOptions, schema: any) => {
        schemas.set(options.route, {
            options: options,
            schema: schema
        })
    },
    get: (route: string) => {
        return schemas.get(route)
    },
    map: () => { return schemas }
}