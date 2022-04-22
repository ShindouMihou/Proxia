import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { SchemaForward } from "../schema/types/schema";
import * as fs from 'fs'
import logger from '../logger/winston'
import { v4 as uuidv4 } from 'uuid'

export default async (forward: SchemaForward, transformed: any) => {
    pass(forward, transformed, 1)
}

async function pass(forward: SchemaForward, transformed: any, retries: number) {
    if (retries > 1) {
        const unique = uuidv4();
        logger.error({
            retries: retries,
            forward: forward,
            data: transformed,
            related: {
                file: "fails/" + unique + ".json"
            }
        })

        if (!fs.existsSync('fails/')) {
            fs.mkdirSync('fails/');
        }

        fs.writeFileSync(`fails/${unique}.json`, JSON.stringify({
            retries: retries,
            forward: forward,
            data: transformed
        }))
        return
    }

    try {
        const method = forward.method.toUpperCase();

        const configuration: AxiosRequestConfig = {
            headers: {
                'content-type': 'application/json'
            }
        }
    
        let result: AxiosResponse;
        
        switch (method) {
            case "POST": {
                result = (await axios.post(forward.address, configuration, transformed))
            };
            case "PUT": {
                result = (await axios.put(forward.address, configuration, transformed))
            }
        }
    } catch (error: any) {
        logger.error("An error occurred while trying to forward message, retrying in a bit...", {
            retries: retries,
            forward: forward,
            data: transformed,
            error: error.message
        })

        setTimeout(() => pass(forward, transformed, retries + 1), retries * 5000)
    }
}

