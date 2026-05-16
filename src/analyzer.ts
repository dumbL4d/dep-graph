import type {
  DependencyEdge,
  DependencyGraph,
  GraphNode,
  RawTool,
} from "./types";

const SKIP_PARAMS = new Set([
  "user_id", "userId",
  "q", "query", "body", "title", "description", "content",
  "message", "type", "role", "scope", "fields", "raw", "markdown",
  "language", "timeZone", "timeMin", "timeMax", "time_min", "time_max",
  "valueInputOption", "value_input_option", "start", "end",
  "start_datetime", "latitude", "longitude", "radius", "location",
  "origin", "destination", "input", "items", "values", "rows", "columns",
  "requests", "operations", "properties", "attributes", "criteria",
  "updateMask", "alt", "prettyPrint", "textQuery", "displayName",
  "display_language", "labels",
]);

const ENTITY_PARAM_PATTERNS = [
  /^(\w+)_id$/i,
  /^(\w+)Id$/i,
  /^(\w+)_key$/i,
  /^(\w+)_number$/i,
  /^(\w+)_name$/i,
  /^(\w+)_slug$/i,
];

function singularize(word: string): string {
  if (word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.endsWith("ses")) return word.slice(0, -2);
  if (word.endsWith("shes")) return word.slice(0, -2);
  if (word.endsWith("ches")) return word.slice(0, -2);
  if (word.endsWith("xes")) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function entitiesMatch(a: string, b: string): boolean {
  return singularize(a) === singularize(b);
}

function getEntityFromParam(paramName: string): string | null {
  for (const pattern of ENTITY_PARAM_PATTERNS) {
    const match = paramName.match(pattern);
    if (match) return match[1]!.toLowerCase();
  }
  return null;
}

function refNameToEntity(ref: string): string | null {
  const name = ref.replace("#/$defs/", "");
  const clean = name
    .replace(/Response$/, "")
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toLowerCase();
  const parts = clean.split(/[_\s]+/).filter(Boolean);
  if (parts.length < 2) return null;

  const prepositions = new Set([
    "for", "by", "to", "of", "in", "on", "at", "with", "from",
    "a", "an", "and", "or", "the",
  ]);

  const verb = parts[0];
  const afterVerb = parts.slice(1);
  const entityWords: string[] = [];

  for (const word of afterVerb) {
    if (prepositions.has(word)) break;
    if (word.length > 1) entityWords.push(word);
  }

  if (entityWords.length === 0) return null;
  return singularize(entityWords[entityWords.length - 1]);
}

function getOutputRef(tool: RawTool): string | null {
  const dataProp = tool.outputParameters?.properties?.data;
  if (!dataProp) return null;
  const ref = dataProp["$ref"];
  return typeof ref === "string" ? ref : null;
}

function producerPriority(slug: string): number {
  const tokens = slug.split(/[_\s]+/);
  const verb = tokens[1] ?? "";
  if (verb === "LIST") return 0;
  if (verb === "SEARCH" || verb === "FIND" || verb === "QUERY") return 1;
  if (verb === "GET" || verb === "FETCH") return 2;
  if (verb === "DOWNLOAD" || verb === "EXPORT") return 3;
  return 4;
}

function pickBestProducer(producers: RawTool[]): RawTool | null {
  if (producers.length === 0) return null;
  return producers.reduce((best, curr) =>
    producerPriority(curr.slug) < producerPriority(best.slug) ? curr : best,
  );
}

function buildGroup(toolkit: string): string {
  return toolkit;
}

export function buildGraph(
  toolsByToolkit: Map<string, RawTool[]>,
): DependencyGraph {
  const toolMap = new Map<string, RawTool>();
  const nodes: GraphNode[] = [];
  const seenNodes = new Set<string>();
  const seenEdges = new Set<string>();
  const edges: DependencyEdge[] = [];

  for (const [, tools] of toolsByToolkit) {
    for (const tool of tools) {
      toolMap.set(tool.slug, tool);
      if (!seenNodes.has(tool.slug)) {
        seenNodes.add(tool.slug);
        nodes.push({
          id: tool.slug,
          label: tool.name,
          toolkit: tool.toolkit?.slug ?? "",
          group: buildGroup(tool.toolkit?.slug ?? ""),
        });
      }
    }
  }

  const producerCache = new Map<string, { entity: string; tool: RawTool }[]>();

  for (const [, toolkitSlug] of toolsByToolkit) {
    for (const candidate of toolkitSlug) {
      const ref = getOutputRef(candidate);
      if (!ref) continue;
      const entity = refNameToEntity(ref);
      if (!entity) continue;

      const list = producerCache.get(entity) ?? [];
      list.push({ entity, tool: candidate });
      producerCache.set(entity, list);
    }
  }

  for (const [, tools] of toolsByToolkit) {
    const toolkitName = tools[0]?.toolkit?.slug ?? "";

    for (const consumer of tools) {
      const required = consumer.inputParameters?.required ?? [];

      for (const param of required) {
        if (SKIP_PARAMS.has(param)) continue;

        const entity = getEntityFromParam(param);
        if (!entity) continue;

        const allProducers = [...producerCache.entries()]
          .filter(([e]) => entitiesMatch(e, entity))
          .flatMap(([, ps]) => ps)
          .filter((p) => {
            if (p.tool.toolkit?.slug !== toolkitName) return false;
            if (p.tool.slug === consumer.slug) return false;
            const pRequired = p.tool.inputParameters?.required ?? [];
            const alsoConsumes = pRequired.some((r) => {
              const e = getEntityFromParam(r);
              return e && entitiesMatch(e, entity);
            });
            return !alsoConsumes;
          });

        if (allProducers.length === 0) continue;

        const best = pickBestProducer(allProducers.map((p) => p.tool));
        if (!best) continue;

        const key = `${best.slug}->${consumer.slug}:${param}`;
        if (!seenEdges.has(key)) {
          seenEdges.add(key);
          edges.push({
            from: best.slug,
            to: consumer.slug,
            paramMatch: param,
            confidence: 0.9,
          });
        }
      }
    }
  }

  return { nodes, edges, toolMap };
}
