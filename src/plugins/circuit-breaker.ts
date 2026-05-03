import { isDefined, isFunction, isNotDefined } from "../helpers/validators";
import { CircutBreakerConfig, CircuteBreakerEntryState, Plugin } from "../types";

const STATE = new Map<string, CircuteBreakerEntryState>();
const ID_SYMBOL = Symbol("id");
const KEY_SYMBOL = Symbol("key");

const circuitBreakerPlugin: Plugin<CircutBreakerConfig> = {
    name: "circuit-breaker",

    validateConfig(config) {
        if (!config || typeof config.threshold !== "number" || config.threshold <= 0) {
            throw new Error(`[circuit-breaker] "threshold" must be > 0`);
        }

        if (typeof config.cooldown !== "number" || config.cooldown <= 0) {
            throw new Error(`[circuit-breaker] "cooldown" must be > 0`);
        }

        if(isDefined(config.considerError) && !isFunction(config.considerError)) {
            throw new Error(`[circuit-breaker] "considerError" must be a function`);
        }
    },

    async onRequest(ctx, next) {
        const config = ctx.config;
        if (isNotDefined(config)) return next();

        const key = `${ctx.req.method}:${ctx.req.route?.path || ctx.req.path}`;
        const now = Date.now();

        let state = STATE.get(key);
        if (isNotDefined(state)) {
            state = { failures: 0, openUntil: 0, halfOpen: false, inFlight: false };
            STATE.set(key, state);
        }

        ctx.state[ID_SYMBOL] = { failureCounted: false };
        ctx.state[KEY_SYMBOL] = key;

        if (state.openUntil > now) {
            ctx.res.status(503).send("Service unavailable (circuit open)");
            return;
        }

        if (state.failures >= config.threshold && state.openUntil <= now) {
            if (state.inFlight) {
                ctx.res.status(503).send("Service unavailable (half-open busy)");
                return;
            }

            state.halfOpen = true;
            state.inFlight = true;
        }

        try {
            await next();

            if (ctx.res.statusCode < 500) {
                state.failures = 0;
                state.halfOpen = false;
            }
        } finally {
            state.inFlight = false;
        }
    },

    async onError(err, ctx) {
        const config = ctx.config;
        if (isNotDefined(config)) return;

        const key = ctx.state[KEY_SYMBOL];

        if(isNotDefined(key)) return;

        const state = STATE.get(key);

        if (isNotDefined(state)) return;

        const shouldCount = isDefined(config.considerError)
            ? config.considerError(err)
            : true;

        if (!shouldCount) return;

        const meta = ctx.state[ID_SYMBOL]; 
        if (!meta || meta.failureCounted) return;

        meta.failureCounted = true;
        state.failures++;

        if (state.failures >= config.threshold) {
            state.openUntil = Date.now() + config.cooldown;
            state.halfOpen = false;
        }
    }
};

export default circuitBreakerPlugin;