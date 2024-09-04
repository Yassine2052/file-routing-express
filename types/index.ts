import { NextFunction, Request, RequestHandler, Response } from "express";

export type ExpressMethod = "get" | "post" | "delete" | "put" | "all";

export type PartialExpressMethodRecord<T> = Partial<Record<ExpressMethod, T>>

export type RouteConfig = Partial<{
    pattern: RegExp | string | PartialExpressMethodRecord<RegExp | string>
}>;

export type DirRouteConfig = Partial<{
    pattern: RegExp | string
}>;

export type MapRoutesParams = {
    target: string, 
    route: string, 
    parentConfig?: {
        route: string,
    }
}

export type RouterRequestHandlersMap = Record<ExpressMethod, RequestHandler | undefined>;
export type ErrorHandler = ((err: Error, req: Request, res: Response, next: NextFunction) => any);

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