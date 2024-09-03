import fs from "fs";
import path from "path";
import { Express, RequestHandler } from "express";
import { ExpressMethods, MapRoutesParams, RouteConfig, RouterRequestHandler } from "./types";
import { functionIsRequestHandler } from "./helpers/validators";
import { extractDirConfig, extractEndpointName } from "./helpers/extractors";
import { buildRoutePattern } from "./helpers/builders";

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
        const parentIsParam = parentConfig?.isParam || false;

        const targetStat = fs.statSync(target);
        const basename = path.basename(target.replace(this.base, ""));
        const { name, isParam } = extractEndpointName(path.parse(basename).name);
        
        if(targetStat.isDirectory()){
            parent = path.join(parent, basename);
    
            const routes = fs.readdirSync(target);
            const config = extractDirConfig(target) || { };
    
            routes
                .forEach(item => {
                    if(item.startsWith("_")) return;
    
                    const newTarget = path.join(target, item);
    
                    if(!fs.existsSync(newTarget)) return;
                    
                    this.mapRoutes({
                        target: newTarget, 
                        route: buildRoutePattern(route, name, isParam, parentIsParam, typeof config?.pattern === "string" || config.pattern instanceof RegExp ? config.pattern : undefined), 
                        parentConfig: {
                            route: parent,
                            isParam
                        }
                    });
                });
    
            return;
        }
    
        if(targetStat.isFile()){
            if(!basename.toLowerCase().match(/.(js|ts)$/g)) return;
            
            const module = require(target);
    
            if(!module) return;
    
            const handlers : RouterRequestHandler = {
                get: module._get,
                post: module._post,
                delete: module._delete,
                put: module._put,
                all: module._all
            }
            
            const { pattern = {} }: RouteConfig = module.config || {};
    
            const commonPattern = typeof pattern === "string" || pattern instanceof RegExp ? pattern : pattern?.all;
            
            Object.entries(handlers)
                .forEach(([ method, handler ]) => {
                    const expressMethod = method as ExpressMethods;

                    if(!functionIsRequestHandler(handler)) return;    

                    const endpoint = buildRoutePattern(
                        route,
                        name,
                        isParam,
                        parentIsParam,
                        (pattern instanceof RegExp || typeof pattern === "string" ? commonPattern : pattern[expressMethod]) || commonPattern
                    );
    
                    this.endpoints.push({
                        endpoint,
                        method
                    });
    
                    this._app[expressMethod](endpoint, handler);
                })
        }
    }
}

function mapRoutes(app: Express, target?: string) {
    const router = new FileBasedRouting(app, target);
    router.createRoutes();

    return { endpoints: router.endpoints, base: router.base }
}

export { mapRoutes }