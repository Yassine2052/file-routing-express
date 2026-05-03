import { Plugin, RetryConfig } from "../types";

const retryPlugin: Plugin<RetryConfig> = {
    name: "retry",

    validateConfig(config) {
        if (!config || config.attempts <= 0) {
            throw new Error(`[retry] "attempts" must be > 0`);
        }
    },

    wrap(handler, config) {
        return async (req, res, next) => {
            const attempts = config?.attempts ?? 1;
            const delay = config?.delay ?? 0;

            let lastError: any;

            for (let i = 0; i < attempts; i++) {
                try {
                    return await handler(req, res, next);
                } catch (err) {
                    lastError = err;

                    const shouldRetry = config?.shouldRetry
                        ? config.shouldRetry(err)
                        : true;

                    if (!shouldRetry || i === attempts - 1) {
                        throw err;
                    }

                    if (delay > 0) {
                        await new Promise(r => setTimeout(r, delay));
                    }
                }
            }

            throw lastError;
        };
    }
};

export default retryPlugin;