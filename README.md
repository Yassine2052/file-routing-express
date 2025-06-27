# file-routing-expressjs

A dependency-free, flexible, system-based file routing for Express.

## Installation


```shell
npm install file-routing-expressjs
```

## Usage

This package integration in your project is very simple. You will need to wrap your `Express` instance with an `mapRoutes(config)` that will bind the routes directly to the app.

```js
import express from "express";
import path from "path";
import { mapRoutes, errorGuardMiddleware } from "file-routing-expressjs";

const ROUTES_PATH = path.resolve(__dirname, "..", "app", "routes");

const app = express();

// Option 1: Basic usage
mapRoutes({
    app: app,
    target: ROUTES_PATH,
    errorGuard: true // ✅ Enable automatic async error wrapping
});

// Option 2: Using a custom error guard middleware
mapRoutes({
    app: app,
    target: ROUTES_PATH,
    errorGuard: errorGuardMiddleware // ✅ Pass your own error guard logic
});

// Option 3: If you need to log the endpoints
async function main() {
    const { endpoints } = await mapRoutes({
        app: app,
        target: ROUTES_PATH,
        errorGuard: true
    });
    console.table(endpoints);
}

main();

app.listen(3000, ()=> console.log("I'm listening mother father"));
```

### Options

- **`target`**: The root directory for your route files. Defaults to `/src/routes`.
- **`app`**: The instance of the **Express** application used for handling routes.
- **`errorGuard`**: This prevents the need to manually wrap every async handler with `try/catch`.

## Routes Directory Structure

Files located in your project's `options.target` directory will automatically correspond to a matching URL path.

**Note**: Files that start with an underscore (`_`) or do not have a `.ts` or `.js` extension will not be bound to the app.

```
📦routes  
 ┣ 📂api  
 ┃ ┗ 📜index.ts
 ┃ ┗ 📜_middleware.ts # global middlewares for '/api' 
 ┣ 📂[users] # dynamic params 
 ┃ ┣ 📂[user]
 ┃ ┃ ┣ 📜index.ts  
 ┃ ┣ 📜books.ts  
 ┃ ┣ 📜index.ts
 ┃ ┣ 📜_middleware.ts
 ┃ ┣ 📜_error.ts
 ┃ ┗ 📜_config.ts # /:users config file (path pattern etc.)
 ┣ 📜index.ts # '/' endpoint - default route
 ┣ 📜posts.ts # '/posts' endpoint
 ┣ 📜_error.ts # global error handler
```

The folder structure is quite simple and straightforward, as you can see. 💀💀💀

* `/api/<?pattern_in_index>`
* `/:users<?patter_in_config>/<?pattern_in_index>`
* `/:users<?patter_in_config>/books<?pattern_in_books>`
* `/:users<?patter_in_config>/:user/<?pattern_in_index>`
* `/<?pattern_in_index>`
* `/posts<?pattern_in_posts>`

## 🔐 Error Guard Option

### What is `errorGuard`?

- If enabled (`true`), it automatically wraps **all your route handlers and middlewares** with an async error handler.
- Any unhandled promise rejection inside async handlers will be forwarded to Express's error handlers (`.use((err, req, res, next) => {})`).
- This prevents the need to manually wrap every async handler with `try/catch`.

---

### ✅ Options

| Option       | Type                                      | Description                                                     |
| -------------| ------------------------------------------| ----------------------------------------------------------------|
| `errorGuard` | `boolean` or `errorGuardMiddleware`       | Whether to auto-wrap handlers with async error catcher. Defaults to `false`. |

---

### 🚫 Example Without Error Guard

```ts
export const _get = async (req, res) => {
    const data = await fetchData(); // ❌ If fetchData throws, Express crashes
    res.json(data);
};
```

### ✅ Example With Error Guard (errorGuard: true)

Any async error in fetchData() will be passed to Express error handler (next(err)).

## Examples

### HTTP Method Handling

If you export functions such as `get`, `post`, `put`, `patch`, `all` or `delete` from a route file, they will automatically be mapped to their respective `HTTP/Express` methods .

```js
export const _get = (req, res, next) => {...}
export const _post = (req, res) => {...}
export const _delete = (req, res) => {...}
export const _put = (req, res, next) => {...}
export const _patch = (req, res, next) => {...}
export const _all = (req, res, next) => {...}
```

### Route Pattern

#### For a directory

In the example above, there's a file named `/[users]/_config.ts`. In this file, you should export an object that is used to configure the route pattern for that specific endpoint. This configuration object can include settings like a custom URL pattern or route validation.

```js
// Option 1: default export
export default {
    pattern: /[a-fA-F0-9]{24}/g // this could be a Regex or a string 
};

// Option 2: named export
export const config = {
    pattern:'[a-fA-F0-9]{24}'
};
```

* `/:users([a-fA-F0-9]{24})/<?pattern_in_index>`

If `users` path is not a dynamic route your endpoint will be:

* `/([a-fA-F0-9]{24})/<?pattern_in_index>`
#### For JS/TS files

You can define a global pattern that applies to all HTTP methods in Express routes, or alternatively, specify a distinct pattern for each method within the route file. This allows for flexible URL handling, depending on whether you need a consistent format for all methods or different structures for specific HTTP methods.

```js
// Option 1: a pattern for each method
export const config = {
    pattern: {
        get: /[A-Z]{3}-[0-9]{4}-[a-z]{2}/,
        post: /([0-9]{5})/,
        put: /[A-Z]{2}[0-9]{2}/
        delete: /(^\d{5}(-\d{4})?$)/,
        patch: /(^([01]\d|2[0-3]):([0-5]\d)$)/,
        all: /^\d{13,19}$/
    }
}

// Option 2: a global pattern 
export const config = {
    pattern: /[A-Z]{3}-[0-9]{4}-[a-z]{2}/
}
```

#### Option 1

| method     | endpoint                                                  |
| ---------- | --------------------------------------------------------- |
| **GET**    | `/:users([a-fA-F0-9]{24})/([A-Z]{3}-[0-9]{4}-[a-z]{2})`   |
| **POST**   | `/:users([a-fA-F0-9]{24})/([0-9]{5})`                     |
| **PUT**    | `/:users([a-fA-F0-9]{24})/([A-Z]{2}[0-9]{2})`             |
| **DELETE** | `/:users([a-fA-F0-9]{24})/(^\d{5}(-\d{4})?$)`             |
| **PATCH**  | `/:users([a-fA-F0-9]{24})/(^([01]\d\|2[0-3]):([0-5]\d)$)` |
| **ALL**    | `/:users([a-fA-F0-9]{24})/(^\d{13,19}$)`                  |

**Note**: If you specify an **all** pattern in the configuration object, it will be used as the default pattern for any HTTP methods that are not explicitly defined.
#### Option 2

| method                                                     | endpoint                                                |
| ---------------------------------------------------------- | ------------------------------------------------------- |
| **GET**, **POST**, **PUT**, **DELETE**, **PATCH**, **ALL** | `/:users([a-fA-F0-9]{24})/([A-Z]{3}-[0-9]{4}-[a-z]{2})` |

### Middleware

You can apply route-specific middleware in Express by exporting an array of request handlers directly from your route file.
#### For a directory

In the example above, there's a file named `/[users]/_middleware.ts`. In this file, you should export a middleware or the list of middlewares you want to apply on the endpoint (`/users` in this case). The middleware will wrap all the sub routes of `/:users`

```js
import authMiddleware from "../middlewares/authMiddleware";
import rateLimitingMiddleware from "../middlewares/rateLimitingMiddleware";
import testMiddleware from "../middlewares/testMiddleware";

// Option 1: A list of middleware functions
export const middlewares = [
    authMiddleware,
	rateLimitingMiddleware
    testMiddleware
];

// Option 2: A single middlware function
export const middlewares = testMiddleware;

// default export or named export
export default middlewares;
```
#### For JS/TS files

You can define a global middleware/list of middlewares that wraps to all HTTP methods in Express routes, or alternatively, specify a distinct middleware/list of middlewares for each method within the route file.

```js
// Option 1: One middleware for all the exisiting requests handlers
export const middlewares = authMiddleware;

// Option 2: A list of middlewares for all the exisiting requests handlers
export const middlewares = [rateLimitingMiddleware, authMiddleware, testMiddleware];

// Option 3: A map of methods with middlware/list of middlewares
export const middlewares = {
    get: [testMiddleware, rateLimitingMiddleware],
    all: authMiddleware
};
```

**Note**: Any route handlers that are not explicitly defined will be wrapped by the `all` middleware, if such middleware exists.
### Error Handling

You can apply route-specific middleware in Express by exporting an array of request handlers directly from your route file.
#### For a directory

In the example above, there is a file named `/[users]/_error_.ts`. Within this file, you should export an error handler function, which can be either a default or named export. This function will handle errors specific to `[users]` directory route and the routes under it.

```js
import globalErrorHandler from "../middlewares/globalErrorHandler";

export const errorHandler = globalErrorHandler;

// default export or named export
export default errorHandler;
```
#### For JS/TS files

You can define an error handler that wraps all HTTP methods in Express routes, or alternatively, specify a distinct error handler for each method within the route file.

```js
import testErrorHandler from "../middlewares/testErrorHandler";
import clientErrorHandler from "../middlewares/clientErrorHandler";

// Option 1: A handler fro all the existing methods
export const error = clientErrorHandler;

// Option 2: A map of methods with error handlers
export const error = {
    put: testErrorHandler,
    all: clientErrorHandler
};
```

**Note**: Any route handlers that are not explicitly defined will be wrapped by the `all` error handler, if such error handler exists.

### Examples - TS

#### For a directory

##### `_config.ts`

```ts
import { DirRouteConfig } from "file-routing-expressjs";
const config: DirRouteConfig = {
    pattern: "[A-Z]{2}-\\d{4}"
};

export default config;
```

##### `_middleware.ts`

```ts
import { RouterDirMiddleware } from "file-routing-expressjs";
import authMiddleware from "../middlewares/authMiddleware";
import testMiddleware from "../middlewares/testMiddleware";

export const middlewares: RouterDirMiddleware = [
    authMiddleware,
    testMiddleware
];
```

##### `_error.ts`

```ts
import { ErrorHandler } from "file-routing-expressjs";
import errorsMiddleware from "../middlewares/errorsMiddleware";

export const errorHandler: ErrorHandler = errorsMiddleware;
```

#### For JS/TS files

```ts
import { RequestHandler } from "express";
import { RouterFileMiddleware, RouterFileError, RouteConfig } from "file-routing-expressjs";
import testMiddleware from "../../middlewares/testMiddleware";
import authMiddleware from "../../middlewares/authMiddleware";
import clientErrorHandler from "../../middlewares/clientErrorMiddlware";

export const config: RouteConfig = {
    pattern: {
        get: /[A-Z]{3}-[0-9]{4}-[a-z]{2}/,
        all: /[a-fA-F0-9]{24}/
    }
};
export const middlewares: RouterFileMiddleware = {
    get: testMiddleware,
    all: authMiddleware
};
export const error: RouterFileError = clientErrorHandler;

export const _get: RequestHandler = (req, res, next)=> {...}
export const _post: RequestHandler = (req, res, next)=> {...}
export const _put: RequestHandler = (req, res, next)=> {...}
```