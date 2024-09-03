import fs from "fs";
import path from "path";
import { RouteConfig } from "../types";

export function extractEndpointName(name: string) {
    const regex = /^\[(.+)\]$/;
    const match = name.match(regex);
    const isParam = !!match && match.length === 2;
    name = isParam ? `:${match.at(1) || name}` : name;

    return { name, isParam };
}

export function extractDirConfig(dir: string): RouteConfig {
    const file = path.join(dir, "_config.ts");

    if(
        !fs.existsSync(file) || 
        !fs.statSync(file).isFile() || 
        !path.basename(file).toLowerCase().match(/.(js|ts)$/g)
    ) return {};

    const module = require(file);

    return  module.config || module.default || {};
}