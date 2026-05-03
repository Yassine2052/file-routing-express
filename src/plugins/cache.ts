import { CacheConfig, CacheEntry, Plugin } from "../types";
import { RequestHandler } from "express";

const store = new Map<string, CacheEntry>();

const CACHE_KEY = Symbol("cache-key");
const CACHE_BODY = Symbol("cache-body");

const cachePlugin: Plugin<CacheConfig> = {
    name: "cache",

    validateConfig(config) {
        if (!config || typeof config.ttl !== "number" || config.ttl <= 0) {
            throw new Error(`[cache] "ttl" must be a positive number`);
        }

        if (config.max !== undefined && (typeof config.max !== "number" || config.max <= 0)) {
            throw new Error(`[cache] "max" must be a positive number`);
        }
    },

    async onRequest(ctx, next) {
        const key = `${ctx.req.method}:${ctx.req.originalUrl}`;
        const entry = store.get(key);

        if (entry && entry.expires > Date.now()) {
            store.delete(key);
            store.set(key, entry);

            ctx.res.status(entry.status);
            ctx.res.send(entry.body);
            return;
        }

        ctx.state[CACHE_KEY] = key;
        return next();
    },

    async onResponse(ctx) {
        const key = ctx.state[CACHE_KEY];
        if (!key) return;

        const ttl = ctx.config?.ttl ?? 0;
        if (!ttl) return;

        const body = (ctx.req as any)[CACHE_BODY];
        if (body === undefined) return;

        const entry: CacheEntry = {
            expires: Date.now() + ttl,
            status: ctx.res.statusCode,
            body
        };

        if (store.has(key)) {
            store.delete(key);
        }

        store.set(key, entry);

        const max = ctx.config?.max ?? 500;
        if (max && store.size > max) {
            const oldestKey = store.keys().next().value;
            if (oldestKey) store.delete(oldestKey);
        }
    },

    wrap(handler: RequestHandler): RequestHandler {
        return async (req, res, next) => {
            let body: any;

            const originalSend = res.send.bind(res);

            res.send = (data: any) => {
                body = data;
                return originalSend(data);
            };

            try {
                await handler(req, res, next);
            } finally {
                (req as any)[CACHE_BODY] = body;
            }
        };
    }
};

export default cachePlugin;