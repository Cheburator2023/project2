import {
	expandV2RegistrySetFilterValues,
	formatV2RegistrySetFilterValue,
	isV2AgGridFilterModelEmpty,
	V2_REGISTRY_DATE_COL_IDS,
	V2_REGISTRY_EDIT_LOCK_FILTER_VALUE,
	type V2AgGridColumnFilter,
	type V2AgGridDateFilter,
	type V2AgGridFilterModel,
	type V2AgGridNumberFilter,
	type V2AgGridSetFilter,
	type V2AgGridSortModel,
	type V2AgGridTextFilter,
} from "@smart-anketa/api-contract";
import type { SelectQueryBuilder } from "typeorm";
import { V2QuestionnaireEditLockEntity } from "../entities/v2-questionnaire-edit-lock.entity";
import type { V2QuestionnaireEntity } from "../entities/v2-questionnaire.entity";

export type V2RegistryJoinKind = "template" | "boundVersion" | "editLock";

export type V2RegistryColumnExpr = {
	textSql: string;
	joins: V2RegistryJoinKind[];
	kind: "text" | "date" | "number" | "status" | "editLock";
};

const AUTO_GROUP_COL_IDS = new Set(["ag-Grid-AutoColumn", "displayLabel"]);

/** Только безопасные сегменты JSON-пути: ключи и числовые индексы массива. */
const FORM_PATH_TOKEN =
	/^(?:[A-Za-z_][A-Za-z0-9_]*(?:\[\d+\])?)(?:\.[A-Za-z_][A-Za-z0-9_]*(?:\[\d+\])?)*$/;
const SIMPLE_IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

function quoteJsonKey(key: string): string {
	return `'${key.replace(/'/g, "''")}'`;
}

function parseFormPath(formPath: string): Array<string | number> | null {
	if (!FORM_PATH_TOKEN.test(formPath)) return null;
	const parts: Array<string | number> = [];
	for (const token of formPath.split(".")) {
		const indexed = /^([A-Za-z_][A-Za-z0-9_]*)\[(\d+)\]$/.exec(token);
		if (indexed) {
			parts.push(indexed[1]!, Number(indexed[2]));
			continue;
		}
		if (/^\[\d+\]$/.test(token)) {
			parts.push(Number(token.slice(1, -1)));
			continue;
		}
		if (!SIMPLE_IDENT.test(token)) return null;
		parts.push(token);
	}
	return parts;
}

function jsonTextExpr(parts: Array<string | number>): string {
	let expr = "q.form_data";
	parts.forEach((part, index) => {
		const isLast = index === parts.length - 1;
		const key = typeof part === "number" ? String(part) : quoteJsonKey(part);
		expr += isLast ? `->>${key}` : `->${key}`;
	});
	return expr;
}

export function resolveV2RegistryColumnExpr(
	colId: string,
): V2RegistryColumnExpr | null {
	if (AUTO_GROUP_COL_IDS.has(colId) || colId === "calcName") {
		return { textSql: "q.calc_name", joins: [], kind: "text" };
	}
	if (colId === "readableId") {
		return {
			textSql: "COALESCE(q.readable_id, CAST(q.id AS text))",
			joins: [],
			kind: "text",
		};
	}
	if (colId === "version") {
		return { textSql: "q.version", joins: [], kind: "text" };
	}
	if (colId === "author") {
		return { textSql: "q.author", joins: [], kind: "text" };
	}
	if (colId === "status") {
		return {
			textSql: "CAST(q.status AS text)",
			joins: [],
			kind: "status",
		};
	}
	if (colId === "workflowGlobalStatus") {
		return {
			textSql: "q.form_data->'workflow'->>'globalStatus'",
			joins: [],
			kind: "text",
		};
	}
	if (colId === "finalCoefficient") {
		return {
			textSql: "CAST(q.final_coefficient AS text)",
			joins: [],
			kind: "number",
		};
	}
	if (colId === "createdAt") {
		return {
			textSql: "to_char(q.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')",
			joins: [],
			kind: "date",
		};
	}
	if (colId === "updatedAt") {
		return {
			textSql: "to_char(q.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')",
			joins: [],
			kind: "date",
		};
	}
	if (colId === "templateName") {
		return { textSql: "template.name", joins: ["template"], kind: "text" };
	}
	if (colId === "schemaBindingStatus") {
		return {
			textSql:
				"CONCAT(COALESCE(NULLIF(TRIM(template.name), ''), 'Схема'), '-', boundTemplateVersion.version_number)",
			joins: ["template", "boundVersion"],
			kind: "text",
		};
	}
	if (colId === "schemaCreatedAt") {
		return {
			textSql:
				"to_char(boundTemplateVersion.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')",
			joins: ["boundVersion"],
			kind: "date",
		};
	}
	if (colId === "schemaUpdatedAt") {
		return {
			textSql:
				"to_char(boundTemplateVersion.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')",
			joins: ["boundVersion"],
			kind: "date",
		};
	}
	if (colId === "editLock") {
		return {
			textSql: `CASE WHEN lock.questionnaire_id IS NOT NULL THEN '${V2_REGISTRY_EDIT_LOCK_FILTER_VALUE}' ELSE NULL END`,
			joins: ["editLock"],
			kind: "editLock",
		};
	}
	if (colId.startsWith("workflowSection.")) {
		const sectionId = colId.slice("workflowSection.".length);
		if (!SIMPLE_IDENT.test(sectionId)) return null;
		return {
			textSql: `q.form_data->'workflow'->'sections'->>${quoteJsonKey(sectionId)}`,
			joins: [],
			kind: "text",
		};
	}
	if (colId.startsWith("workflowPanel.")) {
		const panelPathKey = colId.slice("workflowPanel.".length);
		if (
			!FORM_PATH_TOKEN.test(panelPathKey) &&
			!SIMPLE_IDENT.test(panelPathKey)
		) {
			return null;
		}
		return {
			textSql: `q.form_data->'workflow'->'panelSections'->>${quoteJsonKey(panelPathKey)}`,
			joins: [],
			kind: "text",
		};
	}
	if (colId.startsWith("form.")) {
		const formPath = colId.slice("form.".length);
		const parts = parseFormPath(formPath);
		if (!parts?.length) return null;
		const dateKind = V2_REGISTRY_DATE_COL_IDS.has(colId) ? "date" : "text";
		return { textSql: jsonTextExpr(parts), joins: [], kind: dateKind };
	}
	return null;
}

function collectColIds(
	filterModel: V2AgGridFilterModel | undefined,
	sortModel: V2AgGridSortModel[] | undefined,
): string[] {
	const ids = new Set<string>([
		...Object.keys(filterModel ?? {}),
		...(sortModel ?? []).map((item) => item.colId),
	]);
	return [...ids];
}

function hasJoinAlias(
	qb: SelectQueryBuilder<V2QuestionnaireEntity>,
	alias: string,
): boolean {
	return qb.expressionMap.joinAttributes.some(
		(join) => join.alias?.name === alias,
	);
}

export function applyV2RegistryAgGridJoins(
	qb: SelectQueryBuilder<V2QuestionnaireEntity>,
	filterModel?: V2AgGridFilterModel,
	sortModel?: V2AgGridSortModel[],
	extraColIds: string[] = [],
): void {
	const needed = new Set<V2RegistryJoinKind>();
	for (const colId of [
		...collectColIds(filterModel, sortModel),
		...extraColIds,
	]) {
		const expr = resolveV2RegistryColumnExpr(colId);
		if (!expr) continue;
		for (const join of expr.joins) needed.add(join);
	}
	if (needed.has("template") && !hasJoinAlias(qb, "template")) {
		qb.leftJoin("q.template", "template");
	}
	if (needed.has("boundVersion") && !hasJoinAlias(qb, "boundTemplateVersion")) {
		qb.leftJoin("q.boundTemplateVersion", "boundTemplateVersion");
	}
	if (needed.has("editLock") && !hasJoinAlias(qb, "lock")) {
		qb.leftJoin(
			V2QuestionnaireEditLockEntity,
			"lock",
			"lock.questionnaire_id = q.id AND lock.expires_at > NOW()",
		);
	}
}

type SqlClause = { sql: string; params: Record<string, unknown> };

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function isSetFilter(
	filter: V2AgGridColumnFilter,
): filter is V2AgGridSetFilter {
	return (
		filter.filterType === "set" && "values" in filter && !("operator" in filter)
	);
}

function isTextFilter(
	filter: V2AgGridColumnFilter,
): filter is V2AgGridTextFilter {
	return filter.filterType === "text" && !("operator" in filter);
}

function isNumberFilter(
	filter: V2AgGridColumnFilter,
): filter is V2AgGridNumberFilter {
	return filter.filterType === "number" && !("operator" in filter);
}

function isDateFilter(
	filter: V2AgGridColumnFilter,
): filter is V2AgGridDateFilter {
	return filter.filterType === "date" && !("operator" in filter);
}

function combinedConditions(
	filter: V2AgGridColumnFilter,
): V2AgGridColumnFilter[] {
	if (
		!("operator" in filter || "conditions" in filter || "condition1" in filter)
	) {
		return [];
	}
	const combined = filter as V2AgGridColumnFilter & {
		operator?: "AND" | "OR";
		conditions?: V2AgGridColumnFilter[];
		condition1?: V2AgGridColumnFilter;
		condition2?: V2AgGridColumnFilter;
	};
	if (combined.conditions?.length) return combined.conditions.filter(Boolean);
	return [combined.condition1, combined.condition2].filter(
		(item): item is V2AgGridColumnFilter => Boolean(item),
	);
}

function dateDaySql(textSql: string): string {
	return `LEFT(${textSql}, 10)`;
}

function buildFilterClause(
	colId: string,
	filter: V2AgGridColumnFilter,
	paramSeed: string,
): SqlClause | null {
	const expr = resolveV2RegistryColumnExpr(colId);
	if (!expr) return null;

	const conditions = combinedConditions(filter);
	if (conditions.length > 0) {
		const parts: SqlClause[] = [];
		for (const [index, condition] of conditions.entries()) {
			const clause = buildFilterClause(
				colId,
				condition,
				`${paramSeed}_${index}`,
			);
			if (clause) parts.push(clause);
		}
		if (parts.length === 0) return null;
		const joiner =
			"operator" in filter && filter.operator === "OR" ? " OR " : " AND ";
		return {
			sql: `(${parts.map((part) => part.sql).join(joiner)})`,
			params: Object.assign({}, ...parts.map((part) => part.params)),
		};
	}

	if (isSetFilter(filter)) {
		return buildSetFilterClause(expr, colId, filter.values ?? [], paramSeed);
	}
	if (isTextFilter(filter)) {
		return buildTextFilterClause(expr.textSql, filter, paramSeed);
	}
	if (isNumberFilter(filter)) {
		return buildNumberFilterClause(expr.textSql, filter, paramSeed);
	}
	if (isDateFilter(filter)) {
		return buildDateFilterClause(expr.textSql, filter, paramSeed);
	}
	return null;
}

function buildSetFilterClause(
	expr: V2RegistryColumnExpr,
	colId: string,
	values: Array<string | number | boolean | null>,
	paramSeed: string,
): SqlClause {
	if (values.length === 0) return { sql: "1 = 0", params: {} };
	const alternatives = new Set<string>();
	let includeBlank = false;
	for (const value of values) {
		if (value == null || value === "") {
			includeBlank = true;
			continue;
		}
		for (const alt of expandV2RegistrySetFilterValues(colId, String(value))) {
			alternatives.add(alt);
		}
	}
	const parts: string[] = [];
	const params: Record<string, unknown> = {};
	if (alternatives.size > 0) {
		const list = [...alternatives];
		const asDates =
			expr.kind === "date" || list.every((item) => ISO_DAY.test(item));
		const cmpSql = asDates ? dateDaySql(expr.textSql) : expr.textSql;
		parts.push(`${cmpSql} IN (:...${paramSeed})`);
		params[paramSeed] = asDates
			? [...new Set(list.map((item) => item.slice(0, 10)))]
			: list;
	}
	if (includeBlank) {
		parts.push(`(${expr.textSql} IS NULL OR ${expr.textSql} = '')`);
	}
	if (parts.length === 0) return { sql: "1 = 0", params: {} };
	return { sql: `(${parts.join(" OR ")})`, params };
}

function buildTextFilterClause(
	textSql: string,
	filter: { type?: string; filter?: string },
	paramSeed: string,
): SqlClause | null {
	const needle = filter.filter ?? "";
	const type = filter.type ?? "contains";
	if (type === "blank") {
		return { sql: `(${textSql} IS NULL OR ${textSql} = '')`, params: {} };
	}
	if (type === "notBlank") {
		return { sql: `(${textSql} IS NOT NULL AND ${textSql} != '')`, params: {} };
	}
	if (!needle) return null;
	if (type === "equals" || type === "notEqual") {
		const cmp = type === "equals" ? "=" : "!=";
		return {
			sql: `${textSql} ${cmp} :${paramSeed}`,
			params: { [paramSeed]: needle },
		};
	}
	const pattern =
		type === "startsWith"
			? `${needle}%`
			: type === "endsWith"
				? `%${needle}`
				: `%${needle}%`;
	const op =
		type === "notEqual" || type === "notContains" ? "NOT ILIKE" : "ILIKE";
	return {
		sql: `${textSql} ${op} :${paramSeed}`,
		params: { [paramSeed]: pattern },
	};
}

function buildNumberFilterClause(
	textSql: string,
	filter: { type?: string; filter?: number; filterTo?: number },
	paramSeed: string,
): SqlClause | null {
	const numeric = `NULLIF(${textSql}, '')::numeric`;
	const type = filter.type ?? "equals";
	if (type === "blank") {
		return { sql: `(${textSql} IS NULL OR ${textSql} = '')`, params: {} };
	}
	if (type === "notBlank") {
		return { sql: `(${textSql} IS NOT NULL AND ${textSql} != '')`, params: {} };
	}
	if (filter.filter == null) return null;
	if (type === "inRange") {
		return {
			sql: `${numeric} BETWEEN :${paramSeed}_from AND :${paramSeed}_to`,
			params: {
				[`${paramSeed}_from`]: filter.filter,
				[`${paramSeed}_to`]: filter.filterTo,
			},
		};
	}
	const ops: Record<string, string> = {
		equals: "=",
		notEqual: "!=",
		lessThan: "<",
		lessThanOrEqual: "<=",
		greaterThan: ">",
		greaterThanOrEqual: ">=",
	};
	const op = ops[type];
	if (!op) return null;
	return {
		sql: `${numeric} ${op} :${paramSeed}`,
		params: { [paramSeed]: filter.filter },
	};
}

function buildDateFilterClause(
	textSql: string,
	filter: { type?: string; dateFrom?: string; dateTo?: string },
	paramSeed: string,
): SqlClause | null {
	const type = filter.type ?? "equals";
	const daySql = dateDaySql(textSql);
	if (type === "blank") {
		return { sql: `(${textSql} IS NULL OR ${textSql} = '')`, params: {} };
	}
	if (type === "notBlank") {
		return { sql: `(${textSql} IS NOT NULL AND ${textSql} != '')`, params: {} };
	}
	if (!filter.dateFrom) return null;
	const day = filter.dateFrom.slice(0, 10);
	if (type === "inRange") {
		return {
			sql: `${daySql} BETWEEN :${paramSeed}_from AND :${paramSeed}_to`,
			params: {
				[`${paramSeed}_from`]: day,
				[`${paramSeed}_to`]: (filter.dateTo ?? day).slice(0, 10),
			},
		};
	}
	const ops: Record<string, string> = {
		equals: "=",
		notEqual: "!=",
		lessThan: "<",
		greaterThan: ">",
	};
	const op = ops[type];
	if (!op) return null;
	return {
		sql: `${daySql} ${op} :${paramSeed}`,
		params: { [paramSeed]: day },
	};
}

export function applyV2RegistryAgGridFilters(
	qb: SelectQueryBuilder<V2QuestionnaireEntity>,
	filterModel: V2AgGridFilterModel | undefined,
): void {
	if (isV2AgGridFilterModelEmpty(filterModel)) return;
	let index = 0;
	for (const [colId, filter] of Object.entries(filterModel ?? {})) {
		const clause = buildFilterClause(colId, filter, `agf_${index}`);
		if (clause) qb.andWhere(clause.sql, clause.params);
		index += 1;
	}
}

/**
 * Сортировка через alias addSelect: TypeORM skip/take + join ломает ORDER BY
 * по сырому JSON (`q.form_data->>'x'` содержит точку).
 */
export function applyV2RegistryAgGridSort(
	qb: SelectQueryBuilder<V2QuestionnaireEntity>,
	sortModel: V2AgGridSortModel[] | undefined,
): void {
	addV2RegistrySortSelects(qb, sortModel);
	if (!sortModel?.length) {
		qb.orderBy("q.createdAt", "DESC").addOrderBy("q.id", "DESC");
		return;
	}
	let applied = false;
	sortModel.forEach((sort, index) => {
		if (!resolveV2RegistryColumnExpr(sort.colId)) return;
		const dir = sort.sort === "asc" ? "ASC" : "DESC";
		const alias = `sort_${index}`;
		if (!applied) {
			qb.orderBy(alias, dir);
			applied = true;
		} else {
			qb.addOrderBy(alias, dir);
		}
	});
	if (!applied) qb.orderBy("q.createdAt", "DESC");
	qb.addOrderBy("q.id", "DESC");
}

export function addV2RegistrySortSelects(
	qb: SelectQueryBuilder<V2QuestionnaireEntity>,
	sortModel: V2AgGridSortModel[] | undefined,
): void {
	(sortModel ?? []).forEach((sort, index) => {
		const expr = resolveV2RegistryColumnExpr(sort.colId);
		if (!expr) return;
		qb.addSelect(expr.textSql, `sort_${index}`);
	});
}

export function sortV2RegistryLeanRows<T extends Record<string, unknown>>(
	rows: T[],
	sortModel: V2AgGridSortModel[] | undefined,
): T[] {
	const sorted = [...rows];
	sorted.sort((a, b) => {
		for (const [index, sort] of (sortModel ?? []).entries()) {
			const key = `sort_${index}`;
			const av = a[key];
			const bv = b[key];
			const cmp = compareSortValues(av, bv);
			if (cmp !== 0) return sort.sort === "asc" ? cmp : -cmp;
		}
		const ta = new Date(String(a.createdAt ?? "")).getTime();
		const tb = new Date(String(b.createdAt ?? "")).getTime();
		if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) {
			return tb - ta;
		}
		return String(b.id ?? "").localeCompare(String(a.id ?? ""));
	});
	return sorted;
}

function compareSortValues(a: unknown, b: unknown): number {
	if (a == null && b == null) return 0;
	if (a == null) return 1;
	if (b == null) return -1;
	const an = Number(a);
	const bn = Number(b);
	if (Number.isFinite(an) && Number.isFinite(bn) && an !== bn) return an - bn;
	return String(a).localeCompare(String(b), "ru");
}

export function formatV2RegistryDistinctValue(
	colId: string,
	raw: unknown,
): string | null {
	return formatV2RegistrySetFilterValue(colId, raw);
}

export const V2_REGISTRY_FILTER_VALUES_LIMIT = 1000;
