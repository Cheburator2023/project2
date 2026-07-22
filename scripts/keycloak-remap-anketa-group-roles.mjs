#!/usr/bin/env node
/**
 * Заливка ролей и групп Смарт-Анкеты в Keycloak под матрицу F-05
 * (редакция 2026-07, llm/feature_roles_fresh/требования_матрица_ролей.csv).
 *
 * Делает:
 *  1) создаёт недостающие realm roles anketa_*;
 *  2) создаёт недостающие top-level группы из матрицы (/mntranlst, /da, /auditorib, /project_office);
 *  3) выставляет anketa_* realm-role mappings канонических групп ровно по TARGET.
 *
 * НЕ делает:
 *  - не удаляет и не склеивает группы (Latin-дубли /DE vs /de не трогаем);
 *  - не трогает кириллические /departament/* и не-anketa_* роли.
 *
 * Usage:
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 \
 *   KC_URL=https://keycloak-….local/auth KC_REALM=cym \
 *   KC_ADMIN=admin KC_ADMIN_PASS=… \
 *   node scripts/keycloak-remap-anketa-group-roles.mjs           # dry-run
 *   … --apply
 */
const KC = (process.env.KC_URL || "").replace(/\/$/, "");
const REALM = process.env.KC_REALM || "cym";
const ADMIN_REALM = process.env.KC_ADMIN_REALM || "master";
const USER = process.env.KC_ADMIN || "";
const PASS = process.env.KC_ADMIN_PASS || "";
const APPLY = process.argv.includes("--apply");

/** path → desired anketa* realm roles (canonical lowercase groups). */
const TARGET = {
	"/ds": ["anketa_view_all_calculations", "anketa_export_reports"],
	"/ds/ds_lead": [
		"anketa_view_all_calculations",
		"anketa_create_calculation",
		"anketa_edit_calculation",
		"anketa_delete_calculation",
		"anketa_export_reports",
		"anketa_workflow_approve",
	],
	"/de": ["anketa_view_all_calculations", "anketa_export_reports"],
	"/de/de_lead": [
		"anketa_view_all_calculations",
		"anketa_edit_calculation",
		"anketa_export_reports",
		"anketa_workflow_approve",
	],
	"/modelops": ["anketa_view_all_calculations", "anketa_export_reports"],
	"/modelops/modelops_lead": [
		"anketa_view_all_calculations",
		"anketa_create_calculation",
		"anketa_edit_calculation",
		"anketa_delete_calculation",
		"anketa_export_reports",
		"anketa_workflow_approve",
	],
	"/business_customer": [],
	// Бизнес-партнёр / Бизнес-партнёр стрима: только просмотр + экспорт
	// (в прошлой редакции у /mipm были edit+approve — убираем).
	"/mipm": ["anketa_view_all_calculations", "anketa_export_reports"],
	"/validator": ["anketa_view_all_calculations", "anketa_export_reports"],
	"/validator/validator_lead": [
		"anketa_view_all_calculations",
		"anketa_export_reports",
	],
	"/architect": [
		"anketa_view_all_calculations",
		"anketa_edit_calculation",
		"anketa_export_reports",
		"anketa_workflow_approve",
	],
	// Аналитик качества работы моделей ДАДМ (новая группа)
	"/mntranlst": [
		"anketa_view_all_calculations",
		"anketa_edit_calculation",
		"anketa_export_reports",
		"anketa_workflow_approve",
	],
	// Аналитик качества модельных данных (новая группа, без approve)
	"/da": [
		"anketa_view_all_calculations",
		"anketa_edit_calculation",
		"anketa_export_reports",
	],
	"/admin_it": [
		"anketa_view_all_calculations",
		"anketa_admin_panel",
		"anketa_audit_view",
	],
	"/admin_it/admin_it_lead": [
		"anketa_view_all_calculations",
		"anketa_admin_panel",
		"anketa_audit_view",
	],
	"/auditor": [
		"anketa_view_all_calculations",
		"anketa_export_reports",
		"anketa_audit_view",
	],
	"/auditor/auditor_lead": [
		"anketa_view_all_calculations",
		"anketa_export_reports",
		"anketa_audit_view",
	],
	// Аудитор ИБ (новая группа)
	"/auditorib": [
		"anketa_view_all_calculations",
		"anketa_export_reports",
		"anketa_audit_view",
	],
	// Сотрудник Проектного офиса — доступ не предоставляется
	"/project_office": [],
	"/sacfg": [
		"anketa_view_all_calculations",
		"anketa_create_calculation",
		"anketa_edit_calculation",
		"anketa_delete_calculation",
		"anketa_export_reports",
		"anketa_workflow_approve",
		"anketa_admin_panel",
	],
	"/saprg": [
		"anketa_view_all_calculations",
		"anketa_export_reports",
		"anketa_hold",
	],
	// Представитель стрима-не участника ЖЦМ: + approve по блокам своего стрима
	"/sarep": [
		"anketa_view_all_calculations",
		"anketa_create_calculation",
		"anketa_edit_calculation",
		"anketa_delete_calculation",
		"anketa_export_reports",
		"anketa_workflow_approve",
	],
};

/** Top-level группы из матрицы, которых может не быть на стенде — создаём. */
const GROUPS_TO_ENSURE = ["/mntranlst", "/da", "/auditorib", "/project_office"];

const ROLES_TO_ENSURE = [
	"anketa_view_all_calculations",
	"anketa_create_calculation",
	"anketa_edit_calculation",
	"anketa_export_reports",
	"anketa_admin_panel",
	"anketa_audit_view",
	"anketa_delete_calculation",
	"anketa_workflow_approve",
	"anketa_hold",
];

const ROLE_DESCRIPTIONS = {
	anketa_delete_calculation: "Delete questionnaires (Smart Anketa)",
	anketa_workflow_approve: "Complete/approve anketa block workflow",
	anketa_hold: "Hold / freeze anketa snapshot (saprg)",
};

async function token() {
	const body = new URLSearchParams({
		client_id: "admin-cli",
		username: USER,
		password: PASS,
		grant_type: "password",
	});
	const res = await fetch(
		`${KC}/realms/${ADMIN_REALM}/protocol/openid-connect/token`,
		{
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body,
		},
	);
	if (!res.ok) throw new Error(`token ${res.status} ${await res.text()}`);
	return (await res.json()).access_token;
}

async function api(t, method, path, body) {
	const res = await fetch(`${KC}/admin/realms/${REALM}${path}`, {
		method,
		headers: {
			Authorization: `Bearer ${t}`,
			...(body ? { "Content-Type": "application/json" } : {}),
		},
		body: body ? JSON.stringify(body) : undefined,
	});
	if (!res.ok && res.status !== 204) {
		throw new Error(`${method} ${path} → ${res.status} ${await res.text()}`);
	}
	if (res.status === 204 || res.status === 201) return null;
	const text = await res.text();
	return text ? JSON.parse(text) : null;
}

function flattenGroups(nodes, acc = []) {
	for (const g of nodes || []) {
		acc.push(g);
		if (g.subGroups?.length) flattenGroups(g.subGroups, acc);
	}
	return acc;
}

async function loadGroupsByPath(t) {
	const tree = await api(t, "GET", "/groups?briefRepresentation=false&max=1000");
	return Object.fromEntries(flattenGroups(tree).map((g) => [g.path, g]));
}

function sortUniq(arr) {
	return [...new Set(arr)].sort();
}

(async () => {
	if (!KC || !USER || !PASS) {
		console.error(
			"Set KC_URL, KC_ADMIN, KC_ADMIN_PASS (optional KC_REALM, KC_ADMIN_REALM)",
		);
		process.exit(1);
	}

	const t = await token();
	const existingRoles = await api(t, "GET", "/roles?max=500");
	const byName = Object.fromEntries(
		(existingRoles || []).map((r) => [r.name, r]),
	);

	console.log(APPLY ? "MODE: APPLY" : "MODE: dry-run");
	console.log("\n== Ensure realm roles ==");
	for (const name of ROLES_TO_ENSURE) {
		if (byName[name]) {
			console.log(`  ok ${name}`);
			continue;
		}
		console.log(`  CREATE ${name}`);
		if (APPLY) {
			try {
				await api(t, "POST", "/roles", {
					name,
					description: ROLE_DESCRIPTIONS[name] || name,
				});
			} catch (e) {
				const msg = String(e.message || e);
				if (!msg.includes("409")) throw e;
				console.log(`  (already exists) ${name}`);
			}
			const created = await api(t, "GET", `/roles/${encodeURIComponent(name)}`);
			byName[name] = created;
		}
	}

	// refresh role ids after creates
	const refreshed = await api(t, "GET", "/roles?max=500");
	for (const r of refreshed || []) byName[r.name] = r;

	let byPath = await loadGroupsByPath(t);

	console.log("\n== Ensure groups (create-only, никого не удаляем) ==");
	let createdAny = false;
	for (const path of GROUPS_TO_ENSURE) {
		if (byPath[path]) {
			console.log(`  ok ${path}`);
			continue;
		}
		console.log(`  CREATE ${path}`);
		if (APPLY) {
			await api(t, "POST", "/groups", { name: path.replace(/^\//, "") });
			createdAny = true;
		}
	}
	if (createdAny) byPath = await loadGroupsByPath(t);

	console.log("\n== Group role mappings ==");
	for (const [path, desired] of Object.entries(TARGET)) {
		const g = byPath[path];
		if (!g) {
			console.log(`  MISSING group ${path}`);
			continue;
		}
		const current = (
			(await api(t, "GET", `/groups/${g.id}/role-mappings/realm`)) || []
		).map((r) => r.name);
		const anketaCurrent = current.filter((n) => n.startsWith("anketa_"));
		const want = sortUniq(desired);
		const have = sortUniq(anketaCurrent);
		const toAdd = want.filter((n) => !have.includes(n));
		const toRemove = have.filter((n) => !want.includes(n));
		if (!toAdd.length && !toRemove.length) {
			console.log(`  ok ${path}`);
			continue;
		}
		console.log(`  ${path}`);
		if (toAdd.length) console.log(`    + ${toAdd.join(", ")}`);
		if (toRemove.length) console.log(`    - ${toRemove.join(", ")}`);
		if (!APPLY) continue;

		if (toAdd.length) {
			const reps = toAdd.map((name) => {
				const role = byName[name];
				if (!role) throw new Error(`role missing: ${name}`);
				return { id: role.id, name: role.name };
			});
			await api(t, "POST", `/groups/${g.id}/role-mappings/realm`, reps);
		}
		if (toRemove.length) {
			const reps = toRemove.map((name) => {
				const full =
					byName[name] || (existingRoles || []).find((r) => r.name === name);
				if (!full) throw new Error(`cannot resolve role ${name}`);
				return { id: full.id, name: full.name };
			});
			await api(t, "DELETE", `/groups/${g.id}/role-mappings/realm`, reps);
		}
	}

	console.log(
		"\nDone. Latin case-duplicate groups are intentionally left untouched.",
	);
})().catch((e) => {
	console.error(e);
	process.exit(1);
});
