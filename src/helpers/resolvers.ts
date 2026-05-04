import path from "path";
import fs from "fs";
import { RoutesRootNotFound } from "../types";

export function resolveTarget(target?: string) {
    const resolved = path.resolve(process.cwd(), target || "./src/routes");
  
    if (!fs.existsSync(resolved)) {
        throw new RoutesRootNotFound(`Target folder does not exist: ${resolved}`);
    }
  
    return resolved;
}