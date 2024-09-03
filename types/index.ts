import { RequestHandler } from "express";

export type ExpressMethods = "get" | "post" | "delete" | "put" | "all";

export type RouteConfig = Partial<{
    pattern: RegExp | string | Partial<Record<ExpressMethods, RegExp | string>>
}>;

export type DirRouteConfig = Partial<{
    pattern: RegExp | string
}>;

export type MapRoutesParams = {
    target: string, 
    route: string, 
    parentConfig?: {
        route: string,
        isParam?: boolean
    }
}

export type RouterRequestHandler = Record<"get" | "post" | "put" | "delete" | "all", RequestHandler | undefined>;