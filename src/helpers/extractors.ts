import { DirRouteContext, ErrorHandler, ExpressMethod, FileRouteContext, RouteConfig, RouterFileError, RouterFileMiddleware } from "../../types";
import { ENDPOINT_NAME_REGEX } from "../constants/regex";
import { filenameToJSorTS } from "./builders";
import { fileExistsAndIsJSorTS, functionIsExceptionHandler, functionIsRequestHandler } from "./validators";
import { RequestHandler } from "express";

export function extractEndpointName(name: string) {
    const regex = ENDPOINT_NAME_REGEX;
    const match = name.match(regex);
    const isParam = !!match && match.length === 2;
    name = isParam ? `:${match.at(1) || name}` : name;

    return { name, isParam };
}

export function extractDirConfig(dir: string): RouteConfig {
    const file = filenameToJSorTS(dir, "_config");

    if (!file) {
        return {};
    }

    const module = require(file);
    return  module.config || module.default || {};
}

function extractDirMiddlewares(dir: string): RequestHandler[] {
    const file = filenameToJSorTS(dir, "_middleware");
    if (!file) {
        return [];
    }

    const module = require(file);
    let middlewares: RequestHandler[] = module.middlewares || module.default;

    if (!Array.isArray(middlewares)) {
        middlewares = middlewares ? [middlewares] : [];
    }

    return middlewares.filter(functionIsRequestHandler);
}


function extractDirErrorMiddleware(dir: string): ErrorHandler | undefined {
    const file = filenameToJSorTS(dir, "_error");

    if (!file) {
        return undefined;
    }

    const module = require(file);
    const errorHandler: any = module.error || module.default || undefined;
    return functionIsExceptionHandler(errorHandler) ? errorHandler : undefined;
}

function extractFileConfig(module: any): RouteConfig {
    return  module.config || {};
}

function extractFileMiddlewares(module: any): RouterFileMiddleware{
    let middlewares: RouterFileMiddleware = module.middlewares;
    
    if (!Array.isArray(middlewares)) {
        if(typeof middlewares === "object") {
            const entries = Object.entries(middlewares);

            for(let [method, middleware] of entries) {
                const expressMethod = method as ExpressMethod;

                if(!Array.isArray(middleware)) {
                    middleware = middleware ? [middleware] : []
                }

                middlewares[expressMethod] = middleware.filter(functionIsRequestHandler);
            }

            return middlewares;
        }

        middlewares = middlewares ? [middlewares] : [];
    }

    return middlewares.filter(functionIsRequestHandler);
}

function extractFileErrorMiddleware(module: any): RouterFileError {
    const errorHandler: RouterFileError = module.error || undefined;

    if(functionIsExceptionHandler(errorHandler)) return errorHandler;

    if(typeof errorHandler === "object") {
        const entries = Object.entries(errorHandler);

        for(let [method, nestedErrorHandler] of entries) {
            const expressMethod = method as ExpressMethod;

            errorHandler[expressMethod] = functionIsExceptionHandler(nestedErrorHandler) ? nestedErrorHandler : undefined;
        }

        return errorHandler;
    }
    
    return undefined;
}

export function extractDirContext(target: string): DirRouteContext {
    const config = extractDirConfig(target);
    const middlewares = extractDirMiddlewares(target);
    const errorHandler = extractDirErrorMiddleware(target);

    return {
        config,
        middlewares,
        errorHandler
    };
}

export function extractFileContext(target: string): FileRouteContext {
    if(!fileExistsAndIsJSorTS(target)) {
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