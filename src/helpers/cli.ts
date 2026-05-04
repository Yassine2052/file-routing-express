import { RouteEndpoint, RouteEndpoints } from "../types";
import { color, colors } from "./logging";

function methodColor(method: string): keyof typeof colors {
  switch (method.toLowerCase()) {
    case "get": return "green";
    case "post": return "blue";
    case "put": return "yellow";
    case "delete": return "red";
    case "patch": return "magenta";
    default: return "cyan";
  }
}

function pad(str: string, len: number) {
  return str + " ".repeat(Math.max(0, len - str.length));
}

export function flattenRoutes(nodes: RouteEndpoints): RouteEndpoints {
  const result: RouteEndpoints = [];

  function walk(node: RouteEndpoint) {
    if (node.method !== "-") {
      result.push(node);
    }

    if (node.children?.length) {
      node.children.forEach(walk);
    }
  }

  nodes.forEach(walk);
  return result;
}

export function printTree(nodes: RouteEndpoints, indent = "") {
  for (const node of nodes) {
    const isGroup = node.method === "-";

    const method = node.method?.toUpperCase();

    const methodColored = method
      ? color(`[${method}]`, methodColor(method))
      : "";

    const label = isGroup
      ? color(node.endpoint, "bold")
      : `${methodColored} ${node.endpoint}`;

    console.log(`${indent}${label}`);

    if (!isGroup) {
      if (node.middlewares?.length) {
        console.log(
          `${indent}  ${color("├─", "gray")} ${color("middlewares:", "cyan")} ${node.middlewares.join(", ")}`
        );
      }

      if (node.plugins?.length) {
        console.log(
          `${indent}  ${color("├─", "gray")} ${color("plugins:", "magenta")} ${node.plugins.join(", ")}`
        );
      }

      if (node.errorHandler && node.errorHandler !== "-") {
        console.log(
          `${indent}  ${color("└─", "gray")} ${color("error:", "red")} ${node.errorHandler}`
        );
      }
    }

    if (node.children?.length) {
      printTree(node.children, indent + "  ");
    }
  }
}

export function printTable(endpoints: RouteEndpoints) {
  const headers = ["Method", "URI", "Name", "Middleware", "Plugins", "Error"];
  const widths = headers.map(h => h.length);
  const rows = flattenRoutes(endpoints);

  for (const row of rows) {
    const values = [
      row.method,
      row.endpoint,
      row.name,
      row.middlewares.join(", ") || "-",
      row.plugins.join(", ") || "-",
      row.errorHandler
    ];

    values.forEach((v, i) => {
      widths[i] = Math.max(widths[i], String(v).length);
    });
  }

  const line = (char: string) =>
    "+" + widths.map(w => char.repeat(w + 2)).join("+") + "+";

  const printRow = (cols: string[], colorize = false) => {
    const row = cols.map((c, i) => pad(c, widths[i])).join(" | ");
    const content = `| ${row} |`;
    return colorize ? color(content, "green") : content;
  };

  console.log(color(line("-"), "green"));
  console.log(printRow(headers, true));
  console.log(color(line("-"), "green"));

  for (const row of rows) {
    console.log(printRow([
      row.method,
      row.endpoint,
      row.name,
      row.middlewares.join(", ") || "-",
      row.plugins.join(", ") || "-",
      row.errorHandler
    ], true));
  }

  console.log(color(line("-"), "green"));
}