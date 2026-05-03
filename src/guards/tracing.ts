import { RequestHandler } from "express";
import { REQUEST_ID } from "../constants/keys";

export const tracingMiddleware: RequestHandler = (req, _, next)=> {
    const id = crypto.randomUUID();
    req[REQUEST_ID] = id;
    req.id = id;

    next();
}