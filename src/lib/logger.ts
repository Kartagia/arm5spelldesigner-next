export const logger = new Proxy(console, {
    get: (target, prop, receiver, ...rest) => {
        if (process.env.DEBUG_LEVEL !== undefined && typeof prop === "string") {
            const debugLevel = ["", "trace", "debug", ["log", "info"], "warn", "error"].findIndex(level => (Array.isArray(level) ? level.includes(prop) : prop === level));
            console.log("debug level: %d for %s vs. system %s", debugLevel, prop, process.env.DEBUG_LEVEL);
            if (debugLevel > 0 && debugLevel < Number(process.env.DEBUG_LEVEL ?? "0")) {
                // The call is ignored due debug level restriction.
                return;
            }
        }
        return Reflect.get(target, prop, receiver, ...rest);
    }
});
