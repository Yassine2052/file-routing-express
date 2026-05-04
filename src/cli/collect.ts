import { normalizeCLIOptions } from "../helpers/validators";
import FileBasedRouting from "../models/file-based-routing";
import fs from "fs";
import path from "path";
import { printTable, printTree } from "../helpers/cli";
import { logger } from "../helpers/logging";
import { program } from "./program";

export default function configCollectCommand() {
    program
        .command("collect")
        .option("--target <path>", "base folder for endpoints", "./src/routes")
        .option("--output <type>", "tree | json | table", "tree")
        .action(async (options) => {
            try {
            const config = normalizeCLIOptions(options);
            const endpoints = await FileBasedRouting.collectRoutes(config.target);

            switch(config.output) {
                case "json":
                const dir = path.join(process.cwd(), ".fre", "routes");
                fs.mkdirSync(dir, { recursive: true });

                const file = path.join(dir, `${Date.now()}.json`);
                fs.writeFileSync(file, JSON.stringify(endpoints, null, 2), "utf-8");
                logger.info(`Saved to ${file}`);
                break;
                case "table":
                printTable(endpoints);
                break;
                default:
                printTree(endpoints);
                break;
            }
            } catch (err: any) {
            logger.error(err.message);
            process.exit(1);
            }
        });

    return program;
}