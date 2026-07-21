import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const web = join(root, "apps", "web");
const dist = join(root, "dist");

execFileSync(process.execPath, [join(web, "node_modules", "next", "dist", "bin", "next"), "build"], {
  cwd: web,
  stdio: "inherit",
});

rmSync(dist, { force: true, recursive: true });
mkdirSync(join(dist, "server"), { recursive: true });
mkdirSync(join(dist, ".openai"), { recursive: true });

let html = readFileSync(join(web, ".next", "server", "app", "index.html"), "utf8");
const cssHref = html.match(/<link rel="stylesheet" href="([^"]+)"/)?.[1];
if (cssHref) {
  const cssPath = join(web, ".next", cssHref.replace(/^\/_next\//, "static/"));
  if (existsSync(cssPath)) {
    const css = readFileSync(cssPath, "utf8");
    html = html.replace(/<link rel="stylesheet"[^>]+data-precedence="next"\/>/, `<style>${css}</style>`);
  }
}

html = html
  .replace(/<link rel="preload" as="script"[^>]+>/g, "")
  .replace(/<script[\s\S]*?<\/script>/g, "");

const worker = `const html = ${JSON.stringify(html)};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(html, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=60"
        }
      });
    }
    return new Response("Not found", { status: 404 });
  }
};
`;

writeFileSync(join(dist, "server", "index.js"), worker);
cpSync(join(root, ".openai", "hosting.json"), join(dist, ".openai", "hosting.json"));
