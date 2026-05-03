import { Request, RequestHandler, Response } from "express";
import { MapIndex } from "./common";

/**
 * Plugin definition for extending the routing lifecycle.
 *
 * A plugin can:
 * - wrap route handlers (via `wrap`)
 * - hook into the request lifecycle (`onRequest`, `onResponse`, `onError`)
 *
 * Execution model:
 * - `wrap` transforms the final handler (composition phase)
 * - `onRequest` runs before middleware/handler (can control flow via `next`)
 * - `onResponse` runs after successful handler execution
 * - `onError` runs when an error is thrown in the pipeline
 *
 * Notes:
 * - All hooks support async execution
 * - `onRequest` must call `next()` to continue the pipeline
 * - `wrap` should return a new RequestHandler without mutating the original
 */

export type PluginContext<Config = any, State = Record<MapIndex, any>> = {
    req: Request,
    res: Response,
    config?: Config,
    state: State;
}
export type Plugin<Config = any, State = Record<MapIndex, any>> = {
    name: string;
    wrap?: (handler: RequestHandler, config?: Config) => RequestHandler;
    onRequest?: (ctx: PluginContext<Config, State>, next: () => Promise<void>) => Promise<void>;
    onResponse?: (ctx: PluginContext<Config, State>) => Promise<void>;
    onError?: (err: unknown, ctx: PluginContext<Config, State>) => Promise<void>;
    validateConfig?: (config: Config) => void;
};

// Built in Plugins
export type CacheConfig = {
    ttl?: number;
    max?: number;
};

export type CacheEntry = {
    expires: number;
    status: number;
    body: any;
};

export type CircutBreakerConfig = {
    threshold: number;
    cooldown: number;
    considerError?: (err: unknown) => boolean;
}

export type CircuteBreakerEntryState = {
    failures: number;
    openUntil: number;
    halfOpen: boolean;
    inFlight: boolean;
};

export type TimeoutConfig = { ms: number };

export type RetryConfig = {
    attempts: number;
    delay?: number;
    shouldRetry?: (err: any) => boolean;
};