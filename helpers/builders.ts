export function buildRoutePattern(route: string, name: string, isParam: boolean, parentIsParam: boolean, pattern?: string | RegExp) {
    const fileIsIndex = name.trim().toLowerCase() === "index";

    name = fileIsIndex ? "" : "/" + name.trim().replace(/^(\\|\/)*/g, "");
    route = "/" + route.replace(/^(\\|\/)*/g, "");
    pattern = pattern ? `(${pattern.toString().replace(/^\//g, "").replace(/\/[a-z]*$/gi, "")})` : undefined;

    let endpoint = `${route}${name}`;

    if(pattern) {
        endpoint = endpoint + (isParam ? pattern : `/${pattern}`)
    }

    return endpoint;
}