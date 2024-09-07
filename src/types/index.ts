import { Express, ErrorRequestHandler, RequestHandler } from "express";

export type ExpressMethod = "get" | "post" | "delete" | "put" | "patch" | "all";

export type PartialExpressMethodRecord<T> = Partial<Record<ExpressMethod, T>>

export type FileBasedRoutingOptions = {
    app: Express, 
    target?: string
}

export type RouteConfig = Partial<{
    pattern: RegExp | string | PartialExpressMethodRecord<RegExp | string>
}>;

export type DirRouteConfig = Partial<{
    pattern: RegExp | string
}>;

export type FilesHandlerConfig = {
    route: string, 
    name: string, 
    basename: string, 
    target: string, 
    isParam: boolean
};

export type DirsHandlerConfig = FilesHandlerConfig & {
    parent: string
}

export type MapRoutesParams = {
    target: string, 
    route: string, 
    parentConfig?: {
        route: string,
    }
}

export type RouterRequestHandlersMap = Record<ExpressMethod, RequestHandler | undefined>;

export type ErrorHandler = ErrorRequestHandler;
export type RouterDirMiddleware = RequestHandler | RequestHandler[];

export type RouterFileMiddleware = RouterDirMiddleware | PartialExpressMethodRecord<RouterDirMiddleware>;
export type RouterFileError = ErrorHandler | PartialExpressMethodRecord<ErrorHandler | undefined> | undefined;

export type DirRouteContext = {
    config: RouteConfig,
    middlewares: RequestHandler[],
    errorHandler: ErrorHandler | undefined;
}

export type FileRouteContext = {
    config: RouteConfig,
    middlewares: RouterFileMiddleware,
    errorHandler: RouterFileError;
}

export type RouterEndpoint = {
    depth: number,
    name: string,
    endpoint: string,
    method: string,
    middlewares: string[],
    errorHandler: string
}

export type RouterEndpoints = RouterEndpoint[];