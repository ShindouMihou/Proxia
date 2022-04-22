export interface SchemaOptions {
    forward?: SchemaForward,
    method: string,
    route: string,
    agent?: SchemaUserAgent[],
    addresses?: string[],
    headers?: SchemaHeaders[]
}

export interface SchemaUserAgent {
    comparison: "equals" | "equals_ignore_casing" | "regex" | "includes" | "starts_with" | "ends_with",
    value: string
}

export interface SchemaHeaders {
    header: string,
    comparison: "equals" | "equals_ignore_casing" | "regex" | "includes" | "starts_with" | "ends_with",
    value: string
}

export interface SchemaForward {
    address: string,
    method: "POST" | "PUT"
}

export interface Schema {
    options: SchemaOptions,
    schema: any
}