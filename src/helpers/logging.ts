import { isNotDefined } from "./validators";

export const colors = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    cyan: "\x1b[36m",
    gray: "\x1b[90m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
};

export function color(text: string, c?: keyof typeof colors) {
    if(isNotDefined(c)) return text;
    return `${colors[c]}${text}${colors.reset}`;
}

export function level(label: string, c?: keyof typeof colors) {
    return color(`[${label}]`, c);
}

export const logger = {
    info: (msg: string) =>
        console.log(`${level("INFO", "cyan")} ${msg}`),

    warn: (msg: string) =>
        console.warn(`${level("WARN", "yellow")} ${msg}`),

    error: (msg: string) =>
        console.error(`${level("ERROR", "red")} ${msg}`),

    success: (msg: string) =>
        console.log(`${level("SUCCESS", "green")} ${msg}`),

    raw: (msg: string, c?: keyof typeof colors) => console.log(color(msg, c)),
    plain: (msg: string) => console.log(msg),
};