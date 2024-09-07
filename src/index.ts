import FileBasedRouting from "./models/fileBasedRouting";
import { FileBasedRoutingOptions } from "./types";

async function mapRoutes(options: FileBasedRoutingOptions) {
    const router = new FileBasedRouting({...options});
    router.createRoutes();

    return { endpoints: router.endpoints, base: router.base }
}

export { mapRoutes };