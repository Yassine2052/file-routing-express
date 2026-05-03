import FileBasedRouting from "./models/file-based-routing";
import {
    FileBasedRoutingOptions,
    RouteGroupConfig,
    RouteGroupMiddleware,
    RouteErrorHandler,
    RouteErrorMap,
    RouteMiddleware,
    RouteConfig,
    Plugin
} from "./types";

async function mapRoutes(options: FileBasedRoutingOptions) {
    const router = new FileBasedRouting({ ...options });
    await router.createRoutes();

    return {
        endpoints: router.endpoints,
        base: router.base
    };
}

export type * from "./types/exceptions";
export type {
    RouteGroupConfig,
    RouteGroupMiddleware,
    RouteErrorHandler,
    RouteErrorMap,
    RouteMiddleware,
    RouteConfig,
    Plugin,
};

export * from "./plugins";
export { mapRoutes }
