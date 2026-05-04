import fs from "fs";
import { RequestHandler } from "express";
import { RouteErrorHandler, ExpressMethod } from "../types";
import { JAVASCRIPT_FILES_EXTENSION_REGEX } from "../constants/regex";
import { EXPRESS_METHODS_ARRAY } from "../constants";
import { resolveTarget } from "./resolvers";

const VALID_OUTPUT_TYPES = ["tree", "table", "json"] as const;

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

export function isObject(value: unknown): value is object {
    return isDefined(value) && typeof value === "object";
}

export function validateCLIList<T extends string = string>(value: string | undefined, allowed: T[] | Readonly<T[]>, name: string): T[] {
    if (!value) return [];
  
    const list = value.split(",").map(v => v.trim()).filter(Boolean);
  
    for (const item of list) {
      if (!allowed.includes(item as T)) {
        throw new Error(`Invalid ${name} value: ${item}`);
      }
    }
  
    return list as T[];
}

export function normalizeCLIOptions(options: Record<string, any>) {
  const output = options.output ?? "tree";
  const target = resolveTarget(options.target);

  if (!VALID_OUTPUT_TYPES.includes(output)) {
    throw new Error(`Invalid output: ${output}`);
  }

  return {
    target,
    output: output as typeof VALID_OUTPUT_TYPES[number],
  };
}