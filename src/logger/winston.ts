import winston from "winston";

export default winston.createLogger({
    format: winston.format.json(),
    transports: [
        new winston.transports.Console()
    ]
})
