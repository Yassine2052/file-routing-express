import { withTimeout } from "../helpers/async";
import { isNotDefined } from "../helpers/validators";
import { Plugin, TimeoutConfig } from "../types";
import { TimeoutError } from "../types/exceptions";

const timeoutPlugin: Plugin<TimeoutConfig> = {
    name: "timeout",

    validateConfig(config) {
        if (!config || typeof config.ms !== "number" || config.ms <= 0) { 
            throw new Error(`[timeout] "ms" must be > 0`); 
        }
    },

    wrap(handler, config) {
        return async (req, res, next) => {
            if (isNotDefined(config)) {
                return handler(req, res, next);
            }

            const exec = async () => handler(req, res, next);
            const abortController = new AbortController();
            req.signal = abortController.signal;

            try {
                await withTimeout(exec(), config.ms, abortController);
            } catch (err) {
                if (err instanceof TimeoutError) {
                    if (!res.headersSent) {
                        res.status(504).send("Request timeout");
                    }
                    return;
                }

                throw err;
            } finally {
                delete req.signal;
            }
        };
    }
};

export default timeoutPlugin;