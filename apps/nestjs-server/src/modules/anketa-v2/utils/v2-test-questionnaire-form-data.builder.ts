import {
	completeGlobalQuestionnaire,
	createDefaultV2AnketaWorkflow,
	type V2AnketaWorkflowDto,
	type V2JsonSchemaDto,
} from "@smart-anketa/api-contract";

const SKIP_TOP_LEVEL = new Set(["summary"]);

type JsonSchemaNode = Record<string, unknown>;

function readRecord(value: unknown): JsonSchemaNode | undefined {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as JsonSchemaNode)
		: undefined;
}

function resolveType(node: JsonSchemaNode): string {
	const raw = node.type;
	if (typeof raw === "string") return raw;
	if (Array.isArray(raw)) {
		const nonNull = raw.find((t) => t !== "null");
		return typeof nonNull === "string" ? nonNull : "object";
	}
	if (node.properties) return "object";
	if (node.items) return "array";
	return "string";
}

function pickEnumValue(values: string[]): string {
	const prefer = [
		(v: string) => /×1\.50|×2\.00/.test(v),
		(v: string) => v.includes("Требуется"),
		(v: string) => v === "Высокий" || v === "Высокая",
		(v: string) => v.includes("MVP"),
		(v: string) => v === "Внутренний",
		(v: string) => v === "NLP" || v.includes("NLP"),
		(v: string) => v === "Среднее" || v === "Средняя",
	];
	for (const pred of prefer) {
		const hit = values.find(pred);
		if (hit) return hit;
	}
	const idx = Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * 0.6) - 1));
	return values[idx] ?? values[0] ?? "";
}

function arrayItemCount(path: string): number {
	if (path.endsWith("sourceSystems")) return 2;
	if (path.endsWith("typicalTasks") || path.endsWith("atypicalTasks")) return 2;
	if (path.endsWith("sourceTypicalTasks")) return 1;
	return 1;
}

function sampleNumber(path: string, depth: number): number {
	if (path.endsWith("estimateHoursPerDay")) return 3;
	if (path.endsWith("coefficient")) return 1;
	if (path.endsWith("modelsCount")) return 2;
	if (path.endsWith("initiativeCost")) return 1_500_000;
	if (path.endsWith("uncertaintyAdjustment")) return 0.15;
	return depth < 4 ? 2 : 1;
}

function resolveSchemaNode(node: JsonSchemaNode): JsonSchemaNode {
	if (Array.isArray(node.oneOf) && node.oneOf.length) {
		const first = readRecord(node.oneOf[0]);
		if (first) return first;
	}
	if (Array.isArray(node.anyOf) && node.anyOf.length) {
		const first = readRecord(node.anyOf[0]);
		if (first) return first;
	}
	return node;
}

function sampleFromSchemaNode(
	node: JsonSchemaNode,
	path: string,
	depth: number,
): unknown {
	const resolved = resolveSchemaNode(node);

	if (resolved.readOnly === true && resolved.default !== undefined) {
		return resolved.default;
	}
	if (resolved.const !== undefined) return resolved.const;
	if (Array.isArray(resolved.enum) && resolved.enum.length) {
		return pickEnumValue(resolved.enum.filter((v): v is string => typeof v === "string"));
	}

	const type = resolveType(resolved);
	switch (type) {
		case "string":
			if (resolved.format === "date") return "2026-01-15";
			if (path.endsWith("name") || path.endsWith("calcName")) {
				return `Тестовая система ${path.split(".").length}`;
			}
			return `Тест ${path.split(".").pop() ?? "значение"}`;
		case "number":
		case "integer":
			return sampleNumber(path, depth);
		case "boolean":
			if (path.endsWith("includeInCalculation")) return true;
			return true;
		case "object": {
			const props = readRecord(resolved.properties);
			if (!props) return {};
			const out: Record<string, unknown> = {};
			for (const [key, rawProp] of Object.entries(props)) {
				const prop = readRecord(rawProp);
				if (!prop) continue;
				const childPath = path ? `${path}.${key}` : key;
				out[key] = sampleFromSchemaNode(prop, childPath, depth + 1);
			}
			return out;
		}
		case "array": {
			const items = readRecord(resolved.items);
			if (!items) return [];
			const count = arrayItemCount(path);
			return Array.from({ length: count }, (_, index) =>
				sampleFromSchemaNode(items, `${path}.${index}`, depth + 1),
			);
		}
		default:
			return null;
	}
}

function applyWorkflowVariant(
	formData: Record<string, unknown>,
	variant: "draft" | "in_progress" | "completed",
): Record<string, unknown> {
	let workflow: V2AnketaWorkflowDto = createDefaultV2AnketaWorkflow();

	if (variant === "in_progress") {
		workflow = {
			globalStatus: "Черновик",
			sections: {
				generalInfo: "В работе",
				detailInfo: "В работе",
				streamDataSources: "В работе",
				streamModelControl: "В работе",
			},
		};
	} else if (variant === "completed") {
		workflow = completeGlobalQuestionnaire({
			globalStatus: "Черновик",
			sections: {
				generalInfo: "Заполнено",
				detailInfo: "Заполнено",
				streamDataSources: "Заполнено",
				streamModelControl: "Заполнено",
			},
		});
	}

	return { ...formData, workflow };
}

/**
 * Строит максимально полный formData по актуальной jsonSchema шаблона (не захардкоженный).
 */
export function buildTestQuestionnaireFormData(
	jsonSchema: V2JsonSchemaDto,
	variant: "draft" | "in_progress" | "completed" = "draft",
): Record<string, unknown> {
	const root = readRecord(jsonSchema as unknown as JsonSchemaNode) ?? {};
	const properties = readRecord(root.properties) ?? {};
	const out: Record<string, unknown> = {};

	for (const [key, rawProp] of Object.entries(properties)) {
		if (SKIP_TOP_LEVEL.has(key)) continue;
		const prop = readRecord(rawProp);
		if (!prop) continue;
		out[key] = sampleFromSchemaNode(prop, key, 0);
	}

	return applyWorkflowVariant(out, variant);
}

export const V2_TEST_QUESTIONNAIRE_SEED_SPECS = [
	{
		calcNameSuffix: "полная — черновик",
		variant: "draft" as const,
	},
	{
		calcNameSuffix: "полная — в работе",
		variant: "in_progress" as const,
	},
	{
		calcNameSuffix: "полная — завершена",
		variant: "completed" as const,
	},
];
