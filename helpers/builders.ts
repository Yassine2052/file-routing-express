import path from "path";
import { filenameIsJSorTS, pathExistsAndIsFile } from "./validators";
import { removeLeadingBackSlashesFromName } from "./cleaners";

export function buildRoutePattern(route: string, name: string, isParam: boolean, pattern?: string | RegExp, isFile: boolean = false) {
    const fileIsIndex = isFile && name.trim().toLowerCase() === "index";

    name = fileIsIndex ? "" : buildRouteWithOneLeadingSlash(name.trim());
    route = buildRouteWithOneLeadingSlash(route);
    pattern = pattern ? `(${pattern.toString().replace(/^\//g, "").replace(/\/[a-z]*$/gi, "")})` : undefined;

    let endpoint = `${route}${name}`;

    if(pattern) {
        endpoint = endpoint + (isParam ? pattern : `/${pattern}`)
    }

    return endpoint;
}

export function buildRouteWithOneLeadingSlash(value: string) {
    return `/${removeLeadingBackSlashesFromName(value)}`;
}

export function filenameToJSorTS(dir: string, filename: string) {
    if(filenameIsJSorTS(filename)) {
        const file = path.join(dir, filename);
        if(pathExistsAndIsFile(file)) return file;
    } else {
        const jsFile = path.join(dir, `${filename}.js`);
        const tsFile = path.join(dir, `${filename}.ts`);

        if(pathExistsAndIsFile(jsFile)) {
            return jsFile;
        }

        if(pathExistsAndIsFile(tsFile)) {
            return tsFile;
        }
    }

    return undefined;
}