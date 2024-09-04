import fs from "fs";
import path from "path";
import { Express } from "express";
import { MapRoutesParams, RouterRequestHandlersMap } from "./types";
import { filenameIsJSorTS, functionIsExceptionHandler, functionIsRequestHandler, methodIsExpressMethod } from "./helpers/validators";
import { extractDirContext, extractEndpointName, extractFileContext } from "./helpers/extractors";
import { buildRoutePattern, buildRouteWithOneLeadingSlash } from "./helpers/builders";

class FileBasedRouting {
    public readonly base: string;
    public readonly endpoints = [] as any[];
    private _app: Express; 

    constructor(app: Express, base?: string){
        this.base = base || path.resolve(__dirname, "src", "routes");
        this._app = app;
    }

    public createRoutes() {
        this.mapRoutes({
            target: this.base,
            route: "/",
            parentConfig: undefined
        })
    }

    private mapRoutes({target, route, parentConfig}: MapRoutesParams) {
        if(!fs.existsSync(target)){
            return;
        }
    
        let parent = parentConfig?.route?.trim() || "/";

        const targetStat = fs.statSync(target);
        const basename = path.basename(target.replace(this.base, ""));
        const { name, isParam } = extractEndpointName(path.parse(basename).name);

        route = buildRouteWithOneLeadingSlash(route);

        if(targetStat.isDirectory()){
            parent = path.join(parent, basename);
    
            const routes = fs.readdirSync(target);
            const { config, middlewares, errorHandler } = extractDirContext(target);

            middlewares.forEach(middleware => this._app.use(route, middleware));
    
            routes
                .forEach(item => {
                    if(item.startsWith("_")) return;
    
                    const newTarget = path.join(target, item);
    
                    if(!fs.existsSync(newTarget)) return;
                    
                    this.mapRoutes({
                        target: newTarget, 
                        route: buildRoutePattern(route, name, isParam, typeof config?.pattern === "string" || config.pattern instanceof RegExp ? config.pattern : undefined), 
                        parentConfig: {
                            route: parent,
                        }
                    });
                });
    
            if(errorHandler) {
                this._app.use(route, errorHandler);
            }

            return;
        }
    
        if(targetStat.isFile()){
            if(!filenameIsJSorTS(basename)) return;
            
            const module = require(target);
            if(!module) return;
            
    
            const handlers : RouterRequestHandlersMap = {
                get: module._get,
                post: module._post,
                delete: module._delete,
                put: module._put,
                all: module._all
            }

            let { config, middlewares, errorHandler } = extractFileContext(target);
            
            if(Array.isArray(middlewares)){
                middlewares.forEach(middleware => this._app.use(route, middleware));
            }

            const entries = Object.entries(handlers);

            for(const [ method, handler ] of entries) {
                if(!methodIsExpressMethod(method) || !functionIsRequestHandler(handler)) continue;

                const endpoint = buildRoutePattern(
                    route,
                    name,
                    isParam,
                    (config.pattern instanceof RegExp || typeof config.pattern === "string" ? config.pattern : (config.pattern?.[method]) || config.pattern?.all),
                    true
                );

                
                if(typeof middlewares === "object" && !Array.isArray(middlewares)) {
                    if(!Array.isArray(middlewares[method])) {
                        const middleware = middlewares[method] || middlewares.all;
                        middleware && this._app.use(endpoint, middleware);
                    } else {
                        middlewares[method]?.forEach(middleware => this._app.use(endpoint, middleware));
                    }
                }

                this.endpoints.push({
                    endpoint,
                    method
                });

                this._app[method](endpoint, handler);

                if(errorHandler && typeof errorHandler !== "function" && functionIsExceptionHandler(errorHandler[method])) {
                    this._app.use(endpoint, errorHandler[method]);
                }
            }
            
            if(functionIsExceptionHandler(errorHandler)) {
                this._app.use(route, errorHandler);
            }
        }
    }
}

function mapRoutes(app: Express, target?: string) {
    const router = new FileBasedRouting(app, target);
    router.createRoutes();

    return { endpoints: router.endpoints, base: router.base }
}

export { mapRoutes }