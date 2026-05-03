import fs from "fs";
import { RequestHandler } from "express";
import { RouteErrorHandler, ExpressMethod } from "../types";
import { JAVASCRIPT_FILES_EXTENSION_REGEX } from "../constants/regex";
import { EXPRESS_METHODS_ARRAY } from "../constants";
import { InvalidRouteHandler } from "../types/exceptions";

export function isFunction(value: any): value is Function {
    return typeof value === "function";
}

export function isRequestHandler(handler: any): handler is RequestHandler {
    return isFunction(handler);
}

export function isErrorHandler(handler: any): handler is RouteErrorHandler {
    return isFunction(handler) && handler.length === 4;
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

export function isDefined<T>(value: T): value is NonNullable<T> {
    return value !== null && value !== undefined;
}

export function isNotDefined<T>(value: T): value is Extract<T, null | undefined> {
    return value === null || value === undefined;
}