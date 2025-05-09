import { DirsHandlerConfig, FileBasedRoutingOptions, FilesHandlerConfig, MapRoutesParams, RouterEndpoint, RouterEndpoints, RouterRequestHandlersMap } from "../types";
import { Express, RequestHandler } from "express";
import fs from "fs";
import path from "path";
import { extractDirContext, extractEndpointName, extractFileContext } from "../helpers/extractors";
import { buildRoutePattern, buildRouteWithOneLeadingSlash } from "../helpers/builders";
import { filenameIsJSorTS, functionIsExceptionHandler, functionIsRequestHandler, methodIsExpressMethod } from "../helpers/validators";

class FileBasedRouting {
    public readonly base: string;
    public readonly endpoints: RouterEndpoints;
    private _app: Express; 
    private _currentDepth: number;
    
    constructor({app, target}: FileBasedRoutingOptions){
        this.base = target || path.resolve(__dirname, "src", "routes");
        this._app = app;
        this.endpoints = [];
        this._currentDepth = 0;
    }

    public async createRoutes() {
        this.mapRoutes({
            target: this.base,
            route: "/",
            parentConfig: undefined
        });
    }

    private async mapRoutes({target, route, parentConfig}: MapRoutesParams) {
        if(!fs.existsSync(target)){
            return;
        }
    
        let parent = parentConfig?.route?.trim() || "/";

        const targetStat = fs.statSync(target);
        const basename = path.basename(target.replace(this.base, ""));
        const { name, isParam } = extractEndpointName(path.parse(basename).name);

        route = buildRouteWithOneLeadingSlash(route);

        if(targetStat.isDirectory()){
            return this.handleDir({route, parent, name, basename, target, isParam});
        }
    
        if(targetStat.isFile()){
            return this.handleFile({route, name, basename, target, isParam});
        }
    }

    private handleDir({route, parent, name, basename, target, isParam}: DirsHandlerConfig) {
        parent = path.join(parent, basename);
    
        const routes = fs.readdirSync(target);
        const { config, middlewares, errorHandler } = extractDirContext(target);
        const endpoint = buildRoutePattern(route, name, isParam, typeof config?.pattern === "string" || config.pattern instanceof RegExp ? config.pattern : undefined);

        middlewares.forEach(middleware => this._app.use(endpoint, middleware));

        this.endpoints.push({
            depth: this._currentDepth++,
            name,
            endpoint,
            method: "-", 
            middlewares: middlewares.map(item => item.name),
            errorHandler: errorHandler?.name || "-"
        });

        routes
            .forEach(item => {
                if(item.startsWith("_")) return;

                const newTarget = path.join(target, item);

                if(!fs.existsSync(newTarget)) return;
                
                this.mapRoutes({
                    target: newTarget, 
                    route: endpoint, 
                    parentConfig: {
                        route: parent,
                    }
                });
            });
        
        this._currentDepth--;

        if(errorHandler) this._app.use(endpoint, errorHandler);
    }

    private async handleFile({route, name, basename, target, isParam}: FilesHandlerConfig) {
        if(!filenameIsJSorTS(basename)) return;
            
        const module = await import(target);
        
        if(!module) return;

        const handlers : RouterRequestHandlersMap = {
            get: module._get,
            post: module._post,
            delete: module._delete,
            put: module._put,
            patch: module._patch,
            all: module._all
        }

        let { config, middlewares, errorHandler } = extractFileContext(target);

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

            const routerEndpoint: RouterEndpoint = {
                depth: this._currentDepth,
                name,
                endpoint,
                method,
                middlewares: [],
                errorHandler: "-"
            };

            const routeMiddlewares: RequestHandler[] = [];
   
            if(Array.isArray(middlewares)) {
                middlewares.forEach(middleware => {
                    routeMiddlewares.push(middleware);
                    routerEndpoint.middlewares.push(middleware.name);
                });
            } else if(typeof middlewares === "object") {
                const methodMiddlwares = middlewares[method] || middlewares.all;
                
                if(!Array.isArray(methodMiddlwares)) {
                    if(methodMiddlwares) {
                        routeMiddlewares.push(methodMiddlwares)
                        routerEndpoint.middlewares.push(methodMiddlwares.name);
                    }
                } else {
                    methodMiddlwares?.forEach(middleware => {
                        routeMiddlewares.push(middleware)
                        routerEndpoint.middlewares.push(middleware.name);
                    });
                }
            } else {
                routeMiddlewares.push(middlewares);
                routerEndpoint.middlewares.push(middlewares.name);
            }

            this._app[method](endpoint, ...routeMiddlewares, handler);

            if(errorHandler) {
                if(typeof errorHandler !== "function" ) {
                    errorHandler = errorHandler[method] && errorHandler.all;
                }

                if(functionIsExceptionHandler(errorHandler)) {
                    this._app.use(endpoint, errorHandler);
                    routerEndpoint.errorHandler = errorHandler.name;
                }
            }

            this.endpoints.push(routerEndpoint);
        }
    }
}

export default FileBasedRouting;