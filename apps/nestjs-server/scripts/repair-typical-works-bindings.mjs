#!/usr/bin/env node
/**
 * Offline-проверка и отчёт по привязкам типовых работ к полям схемы.
 *
 * Использование:
 *   node scripts/repair-typical-works-bindings.mjs <schema-version.json> <data-transfer.json> [--apply-out=repaired.json]
 *
 * schema-version.json — экспорт версии шаблона (jsonSchema + uiSchema) или Untitled-1.
 * data-transfer.json — полный v2 data-transfer export с typicalWorkRules / typicalWorkVersionConfigs.
 *
 * Список работ без rules/formula (как Untitled-2) недостаточен — нужен полный export.
 */
import { readFileSync, writeFileSync } from "node:fs";
import {
	buildWorkSchemaParamsFromTemplate,
	collectTypicalWorkSchemaConsistencyIssues,
	enrichWorkSchemaParamsWithCatalogAliases,
	findCatalogPreviousCodeForSchemaParam,
	reconcileTypicalWorkCardWithSchemaField,
	slugParamCode,
} from "@smart-anketa/api-contract";

function parseJson(path) {
	return JSON.parse(readFileSync(path, "utf-8"));
}

function isVersionRecord(value) {
	return (
		value &&
		typeof value === "object" &&
		value.jsonSchema &&
		value.uiSchema
	);
}

function resolveVersion(payload) {
	if (isVersionRecord(payload)) return payload;
	const versions = payload?.templateVersions ?? payload?.versions;
	if (Array.isArray(versions) && versions.length > 0) {
		return versions.at(-1);
	}
	throw new Error("Ожидается объект версии или export с templateVersions[]");
}

function resolveSnapshot(payload) {
	if (payload?.typicalWorkRules || payload?.typicalWorkVersionConfigs) {
		return payload;
	}
	if (payload?.data?.typicalWorkRules || payload?.data?.typicalWorkVersionConfigs) {
		return payload.data;
	}
	throw new Error(
		"Ожидается v2 data-transfer export (typicalWorkRules, typicalWorkVersionConfigs, …)",
	);
}

function groupByWorkStream(rows, keyFn) {
	const map = new Map();
	for (const row of rows) {
		const key = keyFn(row);
		if (!map.has(key)) map.set(key, []);
		map.get(key).push(row);
	}
	return map;
}

function buildCard(workId, stream, snapshot) {
	const rules = (snapshot.typicalWorkRules ?? []).filter(
		(row) => row.workId === workId && row.streamExecutor === stream,
	);
	const laborHeaders = (snapshot.typicalWorkLaborParams ?? []).filter(
		(row) => row.workId === workId && row.streamExecutor === stream,
	);
	const laborCoeffs = (snapshot.typicalWorkLaborCoefficients ?? []).filter(
		(row) => row.workId === workId && row.streamExecutor === stream,
	);
	const config = (snapshot.typicalWorkVersionConfigs ?? []).find(
		(row) =>
			row.workId === workId &&
			row.streamExecutor === stream,
	);
	const work = (snapshot.typicalWorks ?? []).find((row) => row.id === workId);

	const laborParams = laborHeaders.map((header) => ({
		schemaFieldUid: header.schemaFieldUid ?? null,
		paramCode: header.paramCode,
		paramName: header.paramName,
		kind: header.kind ?? "by_value",
		coefficients: laborCoeffs
			.filter((row) => row.paramCode === header.paramCode)
			.map((row) => ({
				id: row.id,
				streamExecutor: row.streamExecutor,
				paramCode: row.paramCode,
				paramName: row.paramName,
				valueCode: row.valueCode,
				valueLabel: row.valueLabel,
				coefficient: Number(row.coefficient ?? 1),
			})),
	}));

	return {
		id: workId,
		name: work?.name ?? workId,
		archComponentType: work?.archComponentType ?? "",
		workType: work?.workType ?? null,
		streamExecutor: stream,
		triggerStatus: "appears",
		norms: [],
		rules: rules.map((rule) => ({
			id: rule.id,
			streamExecutor: rule.streamExecutor,
			schemaFieldUid: rule.schemaFieldUid ?? null,
			paramCode: rule.paramCode,
			paramName: rule.paramName,
			operator: rule.operator,
			valueCode: rule.valueCode,
			valueLabel: rule.valueLabel,
			values: rule.values ?? null,
			sortOrder: rule.sortOrder ?? 0,
		})),
		laborParams,
		formula: {
			tokens: config?.formula?.tokens ?? config?.formulaTokens ?? [],
			text: config?.formulaText ?? "",
		},
		rounding: {
			mode: config?.roundingMode ?? "NONE",
			step: config?.roundingStep ?? null,
		},
	};
}

function main() {
	const schemaPath = process.argv[2];
	const snapshotPath = process.argv[3];
	const applyOutArg = process.argv.find((arg) => arg.startsWith("--apply-out="));
	if (!schemaPath || !snapshotPath) {
		console.error(
			"Usage: node scripts/repair-typical-works-bindings.mjs <schema-version.json> <data-transfer.json> [--apply-out=repaired.json]",
		);
		process.exit(1);
	}

	const version = resolveVersion(parseJson(schemaPath));
	const snapshot = resolveSnapshot(parseJson(snapshotPath));
	const methodologyParams = (snapshot.dictionaries ?? [])
		.filter((row) => row.category === "Методологический" || row.name)
		.map((row) => ({ code: slugParamCode(row.name), name: row.name }));

	const schemaParams = enrichWorkSchemaParamsWithCatalogAliases(
		buildWorkSchemaParamsFromTemplate({
			jsonSchema: version.jsonSchema,
			uiSchema: version.uiSchema,
		}),
		methodologyParams,
	);

	const configs = snapshot.typicalWorkVersionConfigs ?? [];
	let cardsChanged = 0;
	let rulesUpdated = 0;
	let formulasUpdated = 0;
	const consistencyBefore = [];
	const consistencyAfter = [];

	for (const config of configs) {
		let card = buildCard(config.workId, config.streamExecutor, snapshot);
		consistencyBefore.push(
			...collectTypicalWorkSchemaConsistencyIssues({
				schemaParams,
				rules: card.rules,
				laborParamCodes: card.laborParams.map((group) => ({
					paramCode: group.paramCode,
					paramName: group.paramName,
					schemaFieldUid: group.schemaFieldUid,
				})),
				formulaParamCodes: card.formula.tokens
					.filter(
						(token) =>
							token.kind === "param_coeff" || token.kind === "param_anyof",
					)
					.map((token) => token.paramCode),
				methodologyParams,
			}).map((issue) => ({
				...issue,
				workId: config.workId,
				streamExecutor: config.streamExecutor,
			})),
		);

		let changed = false;
		for (const schemaParam of schemaParams) {
			if (!schemaParam.schemaFieldUid) continue;
			const previousCode =
				findCatalogPreviousCodeForSchemaParam(
					methodologyParams,
					schemaParam,
				) ?? schemaParam.code;
			const reconciled = reconcileTypicalWorkCardWithSchemaField(card, {
				templateVersionId: "offline",
				mode: "apply",
				operation: "upsert",
				field: {
					schemaFieldUid: schemaParam.schemaFieldUid,
					previousCode,
					aliasCodes: schemaParam.sourceKeys,
					code: schemaParam.code,
					name: schemaParam.name,
					values:
						schemaParam.values?.length > 0
							? schemaParam.values
							: undefined,
				},
			});
			if (reconciled.changed) {
				changed = true;
				rulesUpdated += reconciled.impact.rulesUpdated;
				formulasUpdated += reconciled.impact.formulasInvalidated;
				card = reconciled.card;
			}
		}

		if (changed) {
			cardsChanged++;
			config.__repairedCard = card;
		}

		consistencyAfter.push(
			...collectTypicalWorkSchemaConsistencyIssues({
				schemaParams,
				rules: card.rules,
				laborParamCodes: card.laborParams.map((group) => ({
					paramCode: group.paramCode,
					paramName: group.paramName,
					schemaFieldUid: group.schemaFieldUid,
				})),
				formulaParamCodes: card.formula.tokens
					.filter(
						(token) =>
							token.kind === "param_coeff" || token.kind === "param_anyof",
					)
					.map((token) => token.paramCode),
				methodologyParams,
			}).map((issue) => ({
				...issue,
				workId: config.workId,
				streamExecutor: config.streamExecutor,
			})),
		);
	}

	console.log("Schema fields:", schemaParams.length);
	console.log("Version configs:", configs.length);
	console.log("Cards changed:", cardsChanged);
	console.log("Rules updated:", rulesUpdated);
	console.log("Consistency issues before:", consistencyBefore.length);
	console.log("Consistency issues after:", consistencyAfter.length);

	if (consistencyAfter.length > 0) {
		console.log("\nRemaining issues (first 10):");
		for (const issue of consistencyAfter.slice(0, 10)) {
			console.log(
				`- [${issue.kind}] work=${issue.workId} param=${issue.paramCode}: ${issue.message}`,
			);
		}
	}

	if (applyOutArg) {
		const outPath = applyOutArg.split("=")[1];
		writeFileSync(outPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf-8");
		console.log("\nWrote repaired snapshot:", outPath);
	}
}

main();
