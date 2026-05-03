import { Express } from "express";
import { errorGuardMiddleware } from "../guards/exception";
import { Plugin } from "./plugins";

export * from "./routing";
export * from "./plugins";
export * from "./exceptions";

export type FileBasedRoutingOptions = {
    app: Express,
    target?: string;
    errorGuard?: boolean | typeof errorGuardMiddleware;
    plugins?: Plugin[];
    collectEndpoints?: boolean;
};