export class RoutesRootNotFound extends Error {
    constructor(root: string) {
        super(`Routes root not found: ${root}`);
        this.name = "RoutesRootNotFound";
    }
}

export class InvalidRouteHandler extends Error {
    constructor(method: string, file: string) {
        super(`Invalid handler for method "${method}" in "${file}". Expected a function.`);
        this.name = "InvalidRouteHandler";
    }
}

export class UnknownPluginError extends Error {
    constructor(pluginName: string, route: string, available: string[]) {
        super(
            `Unknown plugin "${pluginName}" in route "${route}"` +
            (available.length
                ? `Available plugins: ${available.join(", ")}.`
                : `No plugins are registered.`)
        );
        this.name = "UnknownPluginError";
    }
}

export class InvalidPluginError extends Error {
    constructor(message: string) {
        super(`[plugin] ${message}`);
        this.name = "InvalidPluginError";
    }
}

export class TimeoutError extends Error {
    readonly ms: number;

    constructor(ms: number, message = "Request timed out") {
        super(message);
        this.name = "TimeoutPluginError";
        this.ms = ms;
    }
}
