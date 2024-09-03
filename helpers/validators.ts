import { RequestHandler } from "express";

export function functionIsRequestHandler(handler: any): handler is RequestHandler {
    return typeof handler === 'function' && [2, 3].includes(handler.length);
}