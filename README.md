# Proxia
A simple, for-fun mini-transformative proxy that takes in JSON body and transforms them into a schema before either forwarding them onto another API or printing them out via console.

> :red_circle: This isn't intended for any form of production-use.

## :package: How to install?

You can install Proxia simply by building the docker image and running a container with the image and also a schemas folder.
```shell
docker build -t proxia .
docker run --name proxia proxia
```

## :toolbox: Schema Artist

Schemas are what defines the routes and transformation patterns of Proxia. You can define a schema by first creating a folder called `schemas` at the root directory of a local clone of this repository. After which, you can create folders that are to be the names of the routes (e.g. `schemas/hello/world` is equals to `/hello/world` route).

A route folder must contain two items which consists of:
- `options.json`: The specifications of what this route should be, whether to limit this route to specific IP Addresses, headers, user-agents, etc.
- `schema.json`: The final schema result itself which will be getting into in a bit.

## Simple Schema

An example of a simple schema would be:
```json
{
    "hello": "$hi"
}
```

The schema declares that the value of `hello` will be equals to the value of the request's `hi`. For example, say we have a request body such as:
```json
{
    "hi": "world"
}
```

Proxia would then subsitute the value of `hello` from the `schema.json` into the request body's `hi` which would look like this:
```json
{
    "hello": "world"
}
```

### Nesting

Proxia is able to gather the results as far as nesting goes by using the `->` keyword which tells Proxia to go to the next field inside the first field. A simple example of this would be:
```json
{
    "hello": "$hi -> value"
}
```
```json
{
    "hi": {
        "value": "world"
    }
}
```

### Arrays and other types

Proxia is unable to gather specific results of arrays, not because of any technical limitations, but Proxia is able to copy any value of a field onto a field by using the standard substitutition keyword (`$fieldName`).

## Options

You can specify different options that can modify individual routes' behavior which will allow multiple providers to use their own routes of Proxia without having to run multiple instances of the application. Here are all the following available options for each route:
```typescript
interface SchemaOptions {
    forward?: SchemaForward,
    method: string,
    route: string,
    agent?: SchemaUserAgent[],
    addresses?: string[],
    headers?: SchemaHeaders[]
}

interface SchemaUserAgent {
    comparison: "equals" | "equals_ignore_casing" | "regex" | "includes" | "starts_with" | "ends_with",
    value: string
}

interface SchemaHeaders {
    header: string,
    comparison: "equals" | "equals_ignore_casing" | "regex" | "includes" | "starts_with" | "ends_with",
    value: string
}

interface SchemaForward {
    address: string,
    method: "POST" | "PUT"
}
```