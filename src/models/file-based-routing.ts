import {
    RouteGroupEntryConfig,
    FileBasedRoutingOptions,
    RouteEntryConfig,
    RouteMappingOptions,
    RouteEndpoint,
    RouteEndpoints,
    RouteHandlersMap,
    Plugin,
    RouteMiddleware,
    ExpressMethod,
    RoutePlugins
} from "../types";

import { Express, RequestHandler } from "express";
import fs from "fs";
import path from "path";

import {
    extractDirContext,
    extractEndpointName,
    extractFileContext
} from "../helpers/extractors";

import {
    buildRoutePattern,
    buildRouteWithOneLeadingSlash
} from "../helpers/builders";

import {
    filenameIsJSorTS,
    isDefined,
    isErrorHandler,
    isFunction,
    isNotDefined,
    isRequestHandler,
    methodIsExpressMethod
} from "../helpers/validators";

import { pathToFileURL } from "url";
import { errorGuardMiddleware } from "../guards/exception";
import { InvalidPluginError, InvalidRouteHandler, RoutesRootNotFound, UnknownPluginError } from "../types/exceptions";
import { tracingMiddleware } from "../guards/tracing";
import { logger } from "../helpers/logging";

class FileBasedRouting {
    public readonly base: string;
    public readonly endpoints: RouteEndpoints;

    private readonly endpointsQueue: RouteEndpoints;

    private _app: Express;
    private readonly errorGuard: typeof errorGuardMiddleware | undefined;
    private readonly plugins: Map<string, Plugin> = new Map();
    private readonly collectEndpoints: boolean = false;

    constructor({ app, target, errorGuard, plugins, collectEndpoints }: FileBasedRoutingOptions) {
        this.base = target || path.resolve(process.cwd(), "src", "routes");
        this.endpoints = [];
        this.endpointsQueue = [];
        this.plugins = this.buildPluginMap(plugins ?? []);
        this.collectEndpoints = collectEndpoints ?? false;

        this._app = app;

        if (isFunction(errorGuard)) {
            this.errorGuard = errorGuard;
        } else if (errorGuard === true) {
            this.errorGuard = errorGuardMiddleware;
        }
    }

    public async createRoutes() {
        await this.mapRoutes({
            target: this.base,
            route: "/",
            parentGroup: undefined
        });
    }

    private async mapRoutes({ target, route, parentGroup }: RouteMappingOptions) {
        if (!fs.existsSync(target)) throw new RoutesRootNotFound(target);

        let parent = parentGroup?.route?.trim() || "/";

        const targetStat = fs.statSync(target);
        const basename = path.basename(target.replace(this.base, ""));
        const { name, isParam } = extractEndpointName(path.parse(basename).name);

        route = buildRouteWithOneLeadingSlash(route);

        if (targetStat.isDirectory()) {
            return this.handleDir({
                route,
                parent,
                name,
                basename,
                target,
                isParam,
            });
        }

        if (targetStat.isFile()) {
            return this.handleFile({
                route,
                name,
                basename,
                target,
                isParam,
            });
        }
    }

    private async handleDir({ route, parent, name, basename, target, isParam }: RouteGroupEntryConfig) {
        parent = path.join(parent, basename);

        const routes = fs.readdirSync(target);
        const { config, middlewares, errorHandler } = extractDirContext(target);

        const endpoint = buildRoutePattern(
            route,
            name,
            isParam,
            typeof config?.pattern === "string" || config.pattern instanceof RegExp
                ? config.pattern
                : undefined
        );

        middlewares.forEach(middleware => this._app.use(endpoint, middleware));

        if(this.collectEndpoints) {
            const routeEndpoint: RouteEndpoint = {
                depth: this.endpointsQueue.length,
                name,
                endpoint,
                method: "-",
                middlewares: middlewares.map(item => item.name),
                errorHandler: errorHandler?.name || "-",
                plugins: [],
                children: []
            };

            const parent = this.endpointsQueue.at(this.endpointsQueue.length - 1)?.children ?? this.endpoints;
            parent.push(routeEndpoint);
            this.endpointsQueue.push(routeEndpoint);
        }

        for(const item of routes) {
            if (item.startsWith("_")) return;

            const newTarget = path.join(target, item);
            if (!fs.existsSync(newTarget)) return;

            await this.mapRoutes({
                target: newTarget,
                route: endpoint,
                parentGroup: {
                    route: parent,
                }
            });
        }

        if(this.collectEndpoints) {
            this.endpointsQueue.pop();
        }

        if (errorHandler) this._app.use(endpoint, errorHandler);
    }

    private async handleFile({ route, name, basename, target, isParam }: RouteEntryConfig) {
        if (!filenameIsJSorTS(basename)) return;

        const targetAbsolutePath = pathToFileURL(path.resolve(target)).href;
        const module = await import(targetAbsolutePath);

        if (!module) return;

        const handlers: RouteHandlersMap = {
            get: module._get ?? module.default?._get,
            post: module._post ?? module.default?._post,
            delete: module._delete ?? module.default?._delete,
            put: module._put ?? module.default?._put,
            patch: module._patch ?? module.default?._patch,
            all: module._all ?? module.default?._all
        };

        let { config, middlewares, errorHandler } = extractFileContext(target);

        for (const [method, handler] of Object.entries(handlers)) {
            if (!methodIsExpressMethod(method) || isNotDefined(handler)) continue;

            this.isRequestHandlerOrThrow(handler, method)
            const endpoint = buildRoutePattern(
                route,
                name,
                isParam,
                config.pattern instanceof RegExp || typeof config.pattern === "string"
                    ? config.pattern
                    : config.pattern?.[method] || config.pattern?.all,
                true
            );

            const routeMiddlewares = this.pushMiddlewares(middlewares, method);
            const methodPlugins = config.plugins?.[method] ?? config.plugins?.all ?? {};

            const wrappedHandler = this.bindPlugins(handler, route, methodPlugins);
            this._app[method](
                endpoint, 
                tracingMiddleware, 
                ...routeMiddlewares, 
                this.errorGuard?.(wrappedHandler) ?? wrappedHandler
            );
  
            let routerEndpoint: RouteEndpoint | undefined;
            if(this.collectEndpoints) {
                routerEndpoint = {
                    depth: this.endpointsQueue.length,
                    name,
                    endpoint,
                    method,
                    middlewares: [],
                    errorHandler: "-",
                    plugins: Object.keys(methodPlugins),
                    children: []
                };
    
                routerEndpoint.middlewares.push(...routeMiddlewares.map(middleware => middleware.name));
            }

            if (errorHandler) {
                let resolvedError = errorHandler as typeof errorHandler | undefined;

                if (typeof resolvedError !== "function") {
                    resolvedError = resolvedError?.[method] || resolvedError?.all;
                }

                if (isErrorHandler(resolvedError)) {
                    this._app.use(endpoint, resolvedError);
                    if(isDefined(routerEndpoint)) routerEndpoint.errorHandler = resolvedError.name;
                }
            }

            if(isDefined(routerEndpoint)){
                const parent = this.endpointsQueue.at(this.endpointsQueue.length - 1)?.children ?? this.endpoints;
                parent.push(routerEndpoint);
            };
        }
    }

    private pushMiddlewares(middlewares: RouteMiddleware, method: ExpressMethod): RequestHandler[] {
        const routeMiddlewares: RequestHandler[] = [];

        if (Array.isArray(middlewares)) {
            middlewares.forEach(middleware => {
                this.isRequestHandlerOrThrow(middleware, method);
                routeMiddlewares.push(this.errorGuard?.(middleware) ?? middleware);
            });
        } else if (middlewares && typeof middlewares === "object") {
            const methodMiddlewares = middlewares[method] || middlewares.all;

            if (Array.isArray(methodMiddlewares)) {
                methodMiddlewares.forEach(middleware => {
                    this.isRequestHandlerOrThrow(middleware, method);
                    routeMiddlewares.push(this.errorGuard?.(middleware) ?? middleware);
                });
            } else if (methodMiddlewares) {
                this.isRequestHandlerOrThrow(methodMiddlewares, method);
                routeMiddlewares.push(this.errorGuard?.(methodMiddlewares) ?? methodMiddlewares);
            }
        } else if (middlewares) {
            this.isRequestHandlerOrThrow(middlewares, method);
            routeMiddlewares.push(this.errorGuard?.(middlewares) ?? middlewares);
        }

        return routeMiddlewares;
    }

    private bindPlugins(
        handler: RequestHandler,
        route: string,
        routePlugins: RoutePlugins | undefined
    ): RequestHandler {
        if (isNotDefined(routePlugins)) return handler;
        
        const active: {
            plugin: Plugin<any>;
            config: any;
        }[] = [];
        
        for (const [name, value] of Object.entries(routePlugins)) {
            const plugin = this.plugins.get(name);

            if (isNotDefined(plugin)) {
                if (this.collectEndpoints) {
                    logger.warn(`Unknown plugin "${name}" in route "${route}"`);
                    continue;
                }

                throw new UnknownPluginError(
                    name,
                    route,
                    [...this.plugins.keys()]
                );
            }
    
            let enabled = true;
            let config: any = undefined;
    
            if (typeof value === "boolean") {
                enabled = value;
            } else {
                enabled = value.enabled ?? true;
                config = value.config;
            }
    
            if (!enabled) continue;
    
            plugin.validateConfig?.(config);
            active.push({ plugin, config });
        }

        let wrapped = handler;
        for (const { plugin, config } of active) {
            wrapped = plugin.wrap?.(wrapped, config) ?? wrapped;
        }

        return async (req, res, next)=> {
            const ctx = {
                req,
                res,
                state: {},
                config: undefined as any
            };

            const executed: typeof active = [];
            const delegate = async (i: number)=> {
                if(i >= active.length) {
                    await wrapped(req, res, next);
                    return;
                };

                let called = false;
                const nextFn = async ()=> {
                    if(called) return;
                    called = true;
                    await delegate(i + 1)
                }
    
                const entry = active[i];
                const { plugin, config } = entry;
    
                executed.push(entry);

                ctx.config = config;
                if(isDefined(plugin.onRequest)) {
                    await plugin.onRequest(ctx, nextFn);
                } else {
                    await delegate(i + 1);
                }

            }

            try {
                await delegate(0);
        
                while(executed.length > 0) {
                    const { config, plugin } = executed[executed.length - 1];

                    ctx.config = config;
            
                    if (isDefined(plugin.onResponse)) {
                        await plugin.onResponse(ctx);
                    }
                    executed.pop();
                }
            } catch (err) {
                while(executed.length > 0) {
                    const { config, plugin } = executed.pop()!;

                    ctx.config = config;
            
                    if (isDefined(plugin.onError)) {
                        await plugin.onError(err, ctx);
                    }
                }
            
                throw err;
            }
        }
    }

    private isRequestHandlerOrThrow(handler: RequestHandler, method: ExpressMethod): void {
        if(!isRequestHandler(handler)) throw new InvalidRouteHandler(method, handler);
    }

    private buildPluginMap(plugins: Plugin[]): Map<string, Plugin> {
        const map = new Map<string, Plugin>();

        for (const plugin of plugins) {
            if (!plugin || typeof plugin !== "object") {
                throw new InvalidPluginError(`Invalid plugin: expected object`);
            }
    
            if (typeof plugin.name !== "string" || plugin.name.trim() === "") {
                throw new InvalidPluginError(`Plugin must have a valid name`);
            }
    
            if (map.has(plugin.name)) {
                throw new InvalidPluginError(`Duplicate plugin name "${plugin.name}"`);
            }
    
            if (isDefined(plugin.wrap) && !isFunction(plugin.wrap)) {
                throw new InvalidPluginError(`Plugin "${plugin.name}": wrap must be a function`);
            }
            
            if (isDefined(plugin.onRequest) && !isFunction(plugin.onRequest)) {
                throw new InvalidPluginError(`Plugin "${plugin.name}": onRequest must be a function`);
            }
            
            if (isDefined(plugin.onResponse) && !isFunction(plugin.onResponse)) {
                throw new InvalidPluginError(`Plugin "${plugin.name}": onResponse must be a function`);
            }
            
            if (isDefined(plugin.onError) && !isFunction(plugin.onError)) {
                throw new InvalidPluginError(`Plugin "${plugin.name}": onError must be a function`);
            }
            
            if (isDefined(plugin.validateConfig) && !isFunction(plugin.validateConfig)) {
                throw new InvalidPluginError(`Plugin "${plugin.name}": validateConfig must be a function`);
            }
            
            Object.freeze(plugin);
            map.set(plugin.name, plugin);
        }
    
        return map;
    }

    public static async collectRoutes(target: string) {
        const fakeApp = {
            use: () => {},
            get: () => {},
            post: () => {},
            put: () => {},
            patch: () => {},
            delete: () => {},
            all: () => {}
        } as unknown as Express;

        const instance = new FileBasedRouting({
            app: fakeApp,
            target,
            collectEndpoints: true
        });

        await instance.createRoutes();

        return instance.endpoints;
    }
}

export default FileBasedRouting;