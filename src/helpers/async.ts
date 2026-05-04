import { TimeoutError } from "../types/exceptions";

export async function withTimeout<T = any>(
    p: Promise<T>,
    ms: number,
    abortController?: AbortController
): Promise<T> {
    let timeoutId: NodeJS.Timeout | undefined;

    const timer = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            if (abortController) {
                abortController.abort();
            }

            reject(new TimeoutError(ms));
        }, ms);
    });

    try {
        return await Promise.race([p, timer]);
    } finally {
        clearTimeout(timeoutId);
    }
}