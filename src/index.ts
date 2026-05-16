import { fetchAllTools } from "./fetcher";
import { buildGraph } from "./analyzer";
import { visualize } from "./visualizer";
import { writeFileSync } from "fs";
import { join } from "path";

async function main() {
  console.log("=== Tool Dependency Graph Builder ===\n");

  const toolsByToolkit = await fetchAllTools();

  if (toolsByToolkit.size === 0) {
    console.error("No tools fetched. Cannot build graph.");
    process.exit(1);
  }

  const totalTools = [...toolsByToolkit.values()].reduce(
    (sum, tools) => sum + tools.length, 0,
  );
  console.log(`\nTotal tools loaded: ${totalTools}`);

  console.log("Building dependency graph...");
  const graph = buildGraph(toolsByToolkit);
  console.log(
    `Graph built: ${graph.nodes.length} nodes, ${graph.edges.length} edges`,
  );

  const highConf = graph.edges.filter((e) => e.confidence >= 0.9).length;
  const medConf = graph.edges.filter(
    (e) => e.confidence >= 0.7 && e.confidence < 0.9,
  ).length;
  const lowConf = graph.edges.filter((e) => e.confidence < 0.7).length;
  console.log(
    `  High confidence: ${highConf}, Medium: ${medConf}, Low: ${lowConf}`,
  );

  const dataDir = join(import.meta.dir, "..");
  writeFileSync(
    join(dataDir, "graph.json"),
    JSON.stringify(
      {
        nodes: graph.nodes,
        edges: graph.edges.map((e) => ({
          from: e.from,
          to: e.to,
          paramMatch: e.paramMatch,
          confidence: e.confidence,
        })),
      },
      null,
      2,
    ),
  );
  console.log("Graph data written to: graph.json");

  visualize(graph);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
