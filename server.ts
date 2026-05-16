import { fetchTools } from "./src/fetcher";
import { buildGraph } from "./src/analyzer";

const PORT = parseInt(process.env.PORT || "3456");

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (url.pathname === "/" && req.method === "GET") {
      return new Response(JSON.stringify({ ok: true, endpoints: ["POST /api/toolkit"] }), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (url.pathname === "/api/toolkit" && req.method === "POST") {
      try {
        const { slug, apiKey } = await req.json();
        if (!slug || typeof slug !== "string") {
          return new Response(JSON.stringify({ error: "slug required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
        }
        const tools = await fetchTools(slug, apiKey || undefined);
        const toolsByToolkit = new Map();
        toolsByToolkit.set(slug, tools);
        const graph = buildGraph(toolsByToolkit);
        const toolMap: Record<string, { label: string; toolkit: string }> = {};
        for (const n of graph.nodes) toolMap[n.id] = { label: n.label, toolkit: n.toolkit };
        const label = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/([a-z])([A-Z])/g, "$1 $2");
        return new Response(JSON.stringify({ nodes: graph.nodes, edges: graph.edges, toolMap, toolkitLabel: label }), {
          headers: { ...cors, "Content-Type": "application/json" },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
      }
    }
    return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
  },
});

console.log(`Server running at http://localhost:${PORT}`);
