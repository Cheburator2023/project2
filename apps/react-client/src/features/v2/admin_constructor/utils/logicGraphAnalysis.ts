import type { V2LogicRuleDto } from "@smart-anketa/api-contract";

/**
 * По полю `dependencies` → `targetPath` строит ориентированный граф
 * и ищет циклы для предупреждения в редакторе до исполнения на бэкенде.
 */
export function dependencyCycleWarnings(rules: V2LogicRuleDto[]): string[] {
	const adj = new Map<string, string[]>();

	const addEdge = (from: string, to: string) => {
		if (!from || !to || from === to) return;
		if (!adj.has(from)) adj.set(from, []);
		adj.get(from)!.push(to);
	};

	for (const r of rules) {
		for (const d of r.dependencies) {
			addEdge(d, r.targetPath);
		}
	}

	const visited = new Set<string>();
	const rec = new Set<string>();
	const cycles: string[] = [];

	const dfs = (node: string, path: string[]) => {
		if (rec.has(node)) {
			const idx = path.indexOf(node);
			if (idx >= 0) {
				cycles.push([...path.slice(idx), node].join(" → "));
			}
			return;
		}
		if (visited.has(node)) return;

		visited.add(node);
		rec.add(node);
		for (const nx of adj.get(node) ?? []) {
			dfs(nx, [...path, node]);
		}
		rec.delete(node);
	};

	for (const key of adj.keys()) {
		dfs(key, []);
	}

	return [...new Set(cycles)];
}
