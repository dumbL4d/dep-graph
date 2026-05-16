import { Composio } from "@composio/core";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { RawTool, ToolkitSlug } from "./types";

const PROJECT_ROOT = join(import.meta.dir, "..");
const CACHE_DIR = join(PROJECT_ROOT, ".cache");

function getCachePath(slug: ToolkitSlug): string {
  return join(CACHE_DIR, `${slug}_tools.json`);
}

function loadFromRootJson(slug: ToolkitSlug): RawTool[] | null {
  const path = join(PROJECT_ROOT, `${slug}_tools.json`);
  if (!existsSync(path)) return null;
  console.log(`  [${slug}] Loading from ${slug}_tools.json`);
  const data = readFileSync(path, "utf-8");
  return JSON.parse(data) as RawTool[];
}

function loadFromCache(slug: ToolkitSlug): RawTool[] | null {
  const path = getCachePath(slug);
  if (!existsSync(path)) return null;
  const data = readFileSync(path, "utf-8");
  return JSON.parse(data) as RawTool[];
}

function saveToCache(slug: ToolkitSlug, tools: RawTool[]): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
  writeFileSync(getCachePath(slug), JSON.stringify(tools, null, 2));
}

export async function fetchTools(
  slug: ToolkitSlug,
  apiKey?: string,
): Promise<RawTool[]> {
  const cached = loadFromCache(slug);
  if (cached) {
    console.log(`  [${slug}] Loaded ${cached.length} tools from cache`);
    return cached;
  }

  const rootJson = loadFromRootJson(slug);
  if (rootJson) {
    saveToCache(slug, rootJson);
    return rootJson;
  }

  const key = apiKey ?? process.env.COMPOSIO_API_KEY;
  if (!key) {
    throw new Error(
      `COMPOSIO_API_KEY is required to fetch ${slug} tools.\n` +
        "  Set it in a .env file: COMPOSIO_API_KEY=your_key\n" +
        "  Or run: sh scaffold.sh",
    );
  }

  const composio = new Composio({ apiKey: key });
  const tools = await composio.tools.getRawComposioTools({
    toolkits: [slug],
    limit: 1000,
  });

  saveToCache(slug, tools);
  console.log(`  [${slug}] Fetched and cached ${tools.length} tools`);
  return tools;
}

export async function fetchAllTools(slugs: string[] = []): Promise<Map<string, RawTool[]>> {
  if (slugs.length === 0) {
    return new Map();
  }
  console.log("Fetching tools from Composio...");
  const results = new Map<string, RawTool[]>();

  for (const slug of slugs) {
    try {
      const tools = await fetchTools(slug);
      results.set(slug, tools);
    } catch (err) {
      console.error(`  [${slug}] Failed:`, (err as Error).message);
    }
  }

  return results;
}
