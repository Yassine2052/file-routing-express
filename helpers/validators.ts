import { RequestHandler } from "express";
import { ErrorHandler, ExpressMethod } from "../types";
import { JAVASCRIPT_FILES_EXTENSION_REGEX } from "../constants/regex";
import fs from "fs";
import { EXPRESS_METHODS_ARRAY } from "../constants";

export function functionIsRequestHandler(handler: any): handler is RequestHandler {
    return typeof handler === 'function' && [2, 3].includes(handler.length);
}

export function functionIsExceptionHandler(handler: any): handler is ErrorHandler {
    return typeof handler === 'function' && handler.length === 4;
}

export function filenameIsJSorTS(filename: string) {
    return !!filename.match(JAVASCRIPT_FILES_EXTENSION_REGEX);
}

export function pathExistsAndIsFile(path: string) {
    return fs.existsSync(path) && fs.statSync(path).isFile();
}

export function fileExistsAndIsJSorTS(filePath: string) {
    return !!filePath.match(JAVASCRIPT_FILES_EXTENSION_REGEX) && pathExistsAndIsFile(filePath);
}

export function methodIsExpressMethod(method: string): method is ExpressMethod {
    return EXPRESS_METHODS_ARRAY.includes(method as ExpressMethod);
}