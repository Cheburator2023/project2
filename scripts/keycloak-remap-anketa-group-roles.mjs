#!/usr/bin/env node
/**
 * Заливка ролей и групп Смарт-Анкеты в Keycloak под матрицу F-05
 * (ТИС 2026-07, llm/feature_roles_fresh/требования_матрица_ролей.csv).
 *
 * Делает:
 *  1) создаёт недостающие realm roles anketa_* (в т.ч. anketa_complete_anketa);
 *  2) создаёт недостающие группы из TARGET (в т.ч. /sacfg, nested lead-подгруппы);
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
 *   STAND_PREFIX=test_ \   # optional: test_ | dev_ | prod_ | empty
 *   node scripts/keycloak-remap-anketa-group-roles.mjs           # dry-run
 *   … --apply
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
	expandV2KeycloakTargetsWithAdAliases,
	resolveV2KeycloakGroupPath,
} = require("../packages/api-contract/dist/cjs/v2-ad-domain-groups.util.js");

const KC = (process.env.KC_URL || "").replace(/\/$/, "");
const REALM = process.env.KC_REALM || "cym";
const ADMIN_REALM = process.env.KC_ADMIN_REALM || "master";
const USER = process.env.KC_ADMIN || "";
const PASS = process.env.KC_ADMIN_PASS || "";
const STAND_PREFIX = process.env.STAND_PREFIX || "";
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
		"anketa_complete_anketa",
	],
	"/de": ["anketa_view_all_calculations", "anketa_export_reports"],
	"/de/de_lead": [
		"anketa_view_all_calculations",
		"anketa_edit_calculation",
		"anketa_export_reports",
		"anketa_workflow_approve",
		"anketa_complete_anketa",
	],
	"/modelops": ["anketa_view_all_calculations", "anketa_export_reports"],
	"/modelops/modelops_lead": [
		"anketa_view_all_calculations",
		"anketa_create_calculation",
		"anketa_edit_calculation",
		"anketa_delete_calculation",
		"anketa_export_reports",
		"anketa_workflow_approve",
		"anketa_complete_anketa",
	],
	"/business_customer": [],
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
	"/mntranlst": [
		"anketa_view_all_calculations",
		"anketa_edit_calculation",
		"anketa_export_reports",
		"anketa_workflow_approve",
	],
	"/da": [
		"anketa_view_all_calculations",
		"anketa_edit_calculation",
		"anketa_export_reports",
		"anketa_complete_anketa",
	],
	"/da_stream": [
		"anketa_view_all_calculations",
		"anketa_edit_calculation",
		"anketa_export_reports",
	],
	/**
	 * Прикладной администратор: AD sum_appadmin → /appadmin.
	 * Админка в UI/API — по доменной группе appadmin/sacfg, без anketa_admin_*.
	 * /admin_it* — legacy, anketa_* снимаем.
	 */
	"/appadmin": [
		"anketa_view_all_calculations",
		"anketa_audit_view",
	],
	"/admin_it": [],
	"/admin_it/admin_it_lead": [],
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
	"/auditorib": [
		"anketa_view_all_calculations",
		"anketa_export_reports",
		"anketa_audit_view",
	],
	/** AD sum_prjtoffice → /prjtoffice; /project_office — legacy alias. */
	"/prjtoffice": [],
	"/project_office": [],
	"/sacfg": [
		"anketa_view_all_calculations",
		"anketa_create_calculation",
		"anketa_edit_calculation",
		"anketa_delete_calculation",
		"anketa_export_reports",
		"anketa_workflow_approve",
		"anketa_complete_anketa",
	],
	"/saprg": [
		"anketa_view_all_calculations",
		"anketa_export_reports",
		"anketa_hold",
	],
	"/sarep": [
		"anketa_view_all_calculations",
		"anketa_create_calculation",
		"anketa_edit_calculation",
		"anketa_delete_calculation",
		"anketa_export_reports",
		"anketa_workflow_approve",
		"anketa_complete_anketa",
	],
};

const EFFECTIVE_TARGET = expandV2KeycloakTargetsWithAdAliases(
	TARGET,
	STAND_PREFIX,
);

/** Все path из TARGET + AD-alias + родители, parents first (create-only). */
function collectGroupPathsToEnsure(target) {
	const paths = new Set();
	for (const path of Object.keys(target)) {
		const parts = path.split("/").filter(Boolean);
		let cur = "";
		for (const part of parts) {
			cur += `/${part}`;
			paths.add(cur);
		}
	}
	return [...paths].sort(
		(a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b),
	);
}

const GROUPS_TO_ENSURE = collectGroupPathsToEnsure(EFFECTIVE_TARGET);

const ROLES_TO_ENSURE = [
	"anketa_view_all_calculations",
	"anketa_create_calculation",
	"anketa_edit_calculation",
	"anketa_export_reports",
	"anketa_audit_view",
	"anketa_delete_calculation",
	"anketa_workflow_approve",
	"anketa_complete_anketa",
	"anketa_hold",
];

const ROLE_DESCRIPTIONS = {
	anketa_delete_calculation: "Delete questionnaires (Smart Anketa)",
	anketa_workflow_approve: "Complete anketa section/block (§3.10)",
	anketa_complete_anketa: "Complete whole anketa fill (§3.12)",
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
	/** Без `first=` Keycloak на SUMD иногда отдаёт усечённый список (без свежих групп). */
	const byPath = {};
	const pageSize = 100;
	let first = 0;
	for (;;) {
		const page = await api(
			t,
			"GET",
			`/groups?briefRepresentation=false&first=${first}&max=${pageSize}`,
		);
		if (!Array.isArray(page) || page.length === 0) break;
		for (const g of flattenGroups(page)) {
			if (g?.path) byPath[g.path] = g;
		}
		first += page.length;
		if (page.length < pageSize) break;
	}

	/** Догружаем TARGET/GROUPS_TO_ENSURE через search, если их нет в page-list. */
	const needed = [
		...new Set([...GROUPS_TO_ENSURE, ...Object.keys(EFFECTIVE_TARGET)]),
	];
	for (const path of needed) {
		if (byPath[path]) continue;
		const leaf = path.split("/").filter(Boolean).pop();
		if (!leaf) continue;
		const found = await api(
			t,
			"GET",
			`/groups?search=${encodeURIComponent(leaf)}&exact=true&briefRepresentation=false&max=50`,
		);
		for (const g of flattenGroups(found || [])) {
			if (g?.path) byPath[g.path] = g;
		}
	}
	return byPath;
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
	console.log(`STAND_PREFIX=${STAND_PREFIX || "(none)"}`);
	console.log(`TARGET paths=${Object.keys(EFFECTIVE_TARGET).length}`);
	console.log("\n== Ensure realm roles ==");
	for (const name of ROLES_TO_ENSURE) {
		if (byName[name]) {
			console.log(`  ok ${name}`);
			continue;
		}
		/** Список /roles?max=N на SUMD иногда не отдаёт роль, хотя GET /roles/{name} 200. */
		const existing =
			(await api(t, "GET", `/roles/${encodeURIComponent(name)}`).catch(
				() => null,
			)) || null;
		if (existing?.id) {
			byName[name] = existing;
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
	for (const path of GROUPS_TO_ENSURE) {
		const existing = resolveV2KeycloakGroupPath(path, Object.keys(byPath));
		if (existing) {
			console.log(
				existing === path ? `  ok ${path}` : `  ok ${path} → ${existing}`,
			);
			continue;
		}
		console.log(`  CREATE ${path}`);
		if (!APPLY) continue;
		const parts = path.split("/").filter(Boolean);
		const name = parts[parts.length - 1];
		try {
			if (parts.length === 1) {
				await api(t, "POST", "/groups", { name });
			} else {
				const parentPath = `/${parts.slice(0, -1).join("/")}`;
				const resolvedParent =
					resolveV2KeycloakGroupPath(parentPath, Object.keys(byPath)) ||
					parentPath;
				const parent = byPath[resolvedParent];
				if (!parent?.id) {
					throw new Error(`cannot create ${path}: missing parent ${parentPath}`);
				}
				await api(t, "POST", `/groups/${parent.id}/children`, { name });
			}
		} catch (e) {
			const msg = String(e.message || e);
			if (!msg.includes("409")) throw e;
			console.log(`  (already exists) ${path}`);
		}
		byPath = await loadGroupsByPath(t);
	}

	console.log("\n== Group role mappings ==");
	const remappedIds = new Set();
	for (const [path, desired] of Object.entries(EFFECTIVE_TARGET)) {
		const resolved =
			resolveV2KeycloakGroupPath(path, Object.keys(byPath)) || path;
		const g = byPath[resolved];
		if (!g) {
			console.log(`  MISSING group ${path}`);
			continue;
		}
		if (remappedIds.has(g.id)) {
			if (resolved !== path) console.log(`  skip alias ${path} → ${resolved}`);
			continue;
		}
		remappedIds.add(g.id);
		const label = resolved === path ? path : `${path} → ${resolved}`;
		const current = (
			(await api(t, "GET", `/groups/${g.id}/role-mappings/realm`)) || []
		).map((r) => r.name);
		const anketaCurrent = current.filter((n) => n.startsWith("anketa_"));
		const want = sortUniq(desired);
		const have = sortUniq(anketaCurrent);
		const toAdd = want.filter((n) => !have.includes(n));
		const toRemove = have.filter((n) => !want.includes(n));
		if (!toAdd.length && !toRemove.length) {
			console.log(`  ok ${label}`);
			continue;
		}
		console.log(`  ${label}`);
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
			const reps = [];
			for (const name of toRemove) {
				let full =
					byName[name] || (existingRoles || []).find((r) => r.name === name);
				if (!full) {
					full = await api(t, "GET", `/roles/${encodeURIComponent(name)}`).catch(
						() => null,
					);
					if (full?.id) byName[name] = full;
				}
				if (!full?.id) throw new Error(`cannot resolve role ${name}`);
				reps.push({ id: full.id, name: full.name });
			}
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
