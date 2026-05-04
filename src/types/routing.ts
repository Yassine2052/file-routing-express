import { ErrorRequestHandler, RequestHandler } from "express";


export type ExpressMethod = "get" | "post" | "delete" | "put" | "patch" | "all";
export type PartialExpressMethodRecord<T> = Partial<Record<ExpressMethod, T>>;

/**
 * Route configuration (applies to both groups and endpoints)
 */
export type RoutePlugins = Record<
    string,
    boolean | {
        enabled?: boolean;
        config?: any;
    }
>;
export type RouteConfig = Partial<{
    pattern: RegExp | string | PartialExpressMethodRecord<RegExp | string>;
    plugins?: PartialExpressMethodRecord<RoutePlugins>;
}>;

/**
 * Group-level configuration (applies to nested routes)
 */
export type RouteGroupConfig = Partial<{
    pattern: RegExp | string;
}>;

/**
 * Base route entry (shared structure)
 */
export type RouteEntryConfig = {
    route: string;
    name: string;
    basename: string;
    target: string;
    isParam: boolean;
};

/**
 * Group entry (represents a route group / folder)
 */
export type RouteGroupEntryConfig = RouteEntryConfig & {
    parent: string;
};

/**
 * Route mapping input
 */
export type RouteMappingOptions = {
    target: string;
    route: string;
    parentGroup?: {
        route: string;
    };
};

/**
 * Express handlers map per method
 */
export type RouteHandlersMap = Record<ExpressMethod, RequestHandler | undefined>;

/**
 * Error handler types
 */
export type RouteErrorHandler = ErrorRequestHandler;

export type RouteErrorMap =
    | RouteErrorHandler
    | PartialExpressMethodRecord<RouteErrorHandler | undefined>
    | undefined;

/**
 * Middleware types
 */
export type RouteGroupMiddleware = RequestHandler | RequestHandler[];

export type RouteMiddleware =
    | RouteGroupMiddleware
    | PartialExpressMethodRecord<RouteGroupMiddleware>;

/**
 * Context for a route group (folder-level)
 */
export type RouteGroupContext = {
    config: RouteConfig;
    middlewares: RequestHandler[];
    errorHandler?: RouteErrorHandler;
};

/**
 * Context for a route definition (endpoint-level)
 */
export type RouteDefinitionContext = {
    config: RouteConfig;
    middlewares: RouteMiddleware;
    errorHandler?: RouteErrorMap;
};

/**
 * Debug / introspection types
 */
export type RouteEndpoint = {
    depth: number;
    name: string;
    endpoint: string;
    method: string;
    middlewares: string[];
    errorHandler: string;
    plugins: string[];
    children: RouteEndpoint[]
};

export type RouteEndpoints = RouteEndpoint[];