import {
    RouteGroupContext,
    RouteErrorHandler,
    ExpressMethod,
    RouteDefinitionContext,
    RouteConfig,
    RouteErrorMap,
    RouteMiddleware
} from "../types";

import { ENDPOINT_FILE_NAME_REGEX } from "../constants/regex";
import { filenameToJSorTS } from "./builders";
import {
    fileExistsAndIsJSorTS,
    isErrorHandler,
    isRequestHandler
} from "./validators";

import { RequestHandler } from "express";

export function extractEndpointName(name: string) {
    const match = name.match(ENDPOINT_FILE_NAME_REGEX);
    const isParam = !!match && match.length >= 2;

    name = isParam ? `:${match![1] || name}` : name;

    return { name, isParam };
}

export function extractDirConfig(dir: string): RouteConfig {
    const file = filenameToJSorTS(dir, "_config");

    if (!file) return {};

    const module = require(file);
    return module.config ?? module.default?.config ?? module.default ?? {};
}

function extractDirMiddlewares(dir: string): RequestHandler[] {
    const file = filenameToJSorTS(dir, "_middleware");
    if (!file) return [];

    const module = require(file);

    let middlewares: RequestHandler[] =
        module.middlewares ?? module.default?.middleware ?? module.default;

    if (!Array.isArray(middlewares)) {
        middlewares = middlewares ? [middlewares] : [];
    }

    return middlewares.filter(isRequestHandler);
}

function extractDirErrorMiddleware(dir: string): RouteErrorHandler | undefined {
    const file = filenameToJSorTS(dir, "_error");
    if (!file) return undefined;

    const module = require(file);

    const errorHandler =
        module.error ?? module.default?.error ?? module.default ?? undefined;

    return isErrorHandler(errorHandler)
        ? errorHandler
        : undefined;
}

function extractFileConfig(module: any): RouteConfig {
    return module.config ?? module.default?.config ?? {};
}

function extractFileMiddlewares(module: any): RouteMiddleware {
    let middlewares: RouteMiddleware =
        module.middlewares ?? module.default?.middlewares;

    if (middlewares && typeof middlewares === "object" && !Array.isArray(middlewares)) {
        const result: Partial<Record<ExpressMethod, RequestHandler[]>> = {};

        for (const [method, middleware] of Object.entries(middlewares)) {
            const expressMethod = method as ExpressMethod;

            const list = Array.isArray(middleware)
                ? middleware
                : middleware
                ? [middleware]
                : [];

            result[expressMethod] = list.filter(isRequestHandler);
        }

        return result;
    }

    if (!Array.isArray(middlewares)) {
        middlewares = middlewares ? [middlewares] : [];
    }

    return middlewares.filter(isRequestHandler);
}

function extractFileErrorMiddleware(module: any): RouteErrorMap {
    const raw =
        module.error ?? module.default?.error ?? undefined;

    if (isErrorHandler(raw)) {
        return raw;
    }

    if (raw && typeof raw === "object") {
        const result: Partial<Record<ExpressMethod, RouteErrorHandler | undefined>> = {};

        for (const [method, handler] of Object.entries(raw)) {
            const expressMethod = method as ExpressMethod;

            result[expressMethod] = isErrorHandler(handler)
                ? handler
                : undefined;
        }

        return result;
    }

    return undefined;
}

export function extractDirContext(target: string): RouteGroupContext {
    const config = extractDirConfig(target);
    const middlewares = extractDirMiddlewares(target);
    const errorHandler = extractDirErrorMiddleware(target);

    return {
        config,
        middlewares,
        errorHandler
    };
}

export function extractFileContext(target: string): RouteDefinitionContext {
    if (!fileExistsAndIsJSorTS(target)) {
        return {
            config: {},
            middlewares: [],
            errorHandler: undefined
        };
    }

    const module = require(target);

    const config = extractFileConfig(module);
    const middlewares = extractFileMiddlewares(module);
    const errorHandler = extractFileErrorMiddleware(module);

    return {
        config,
        middlewares,
        errorHandler
    };
}