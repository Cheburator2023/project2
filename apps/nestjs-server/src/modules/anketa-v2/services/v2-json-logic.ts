/**
 * Минимальный интерпретатор JsonLogic, достаточный для правил `v2-default-logic`.
 *
 * Совместим по поведению с фронтовой `react-json-logic` для использованных
 * операторов: `+`, `-`, `*`, `/`, `%`, `==`, `===`, `!=`, `!==`,
 * `<`, `<=`, `>`, `>=`, `!`, `!!`, `and`, `or`, `if`/`?:`, `var`,
 * `reduce`, `map`, `filter`, `max`, `min`, `in`, `merge`, `cat`.
 *
 * Зависимостей не тянем (`json-logic-js` пакет в `node_modules` сейчас
 * заблокирован root-правами; реализация уложилась в ~120 строк).
 */
import type { V2JsonLogicValue } from "@smart-anketa/api-contract";

export type JsonLogicData = Record<string, unknown> | unknown[];

function getOpKey(expr: Record<string, unknown>): string | null {
	const keys = Object.keys(expr);
	if (keys.length !== 1) return null;
	return keys[0] ?? null;
}

function resolveVar(path: string, data: unknown): unknown {
	if (!path) return data;
	const parts = path.split(".");
	let cur: unknown = data;
	for (const p of parts) {
		if (cur == null) return null;
		if (Array.isArray(cur)) {
			const idx = Number(p);
			if (!Number.isInteger(idx)) return null;
			cur = cur[idx];
		} else if (typeof cur === "object") {
			cur = (cur as Record<string, unknown>)[p];
		} else {
			return null;
		}
	}
	return cur ?? null;
}

function truthy(value: unknown): boolean {
	if (value === null || value === undefined) return false;
	if (value === false) return false;
	if (value === 0 || value === "0" || value === "") return false;
	if (Array.isArray(value) && value.length === 0) return false;
	return true;
}

function toNumber(value: unknown): number {
	if (typeof value === "number") return Number.isFinite(value) ? value : 0;
	if (typeof value === "string") {
		const n = Number(value);
		return Number.isFinite(n) ? n : 0;
	}
	if (typeof value === "boolean") return value ? 1 : 0;
	if (value == null) return 0;
	return 0;
}

export function applyJsonLogic(
	expr: V2JsonLogicValue,
	data: JsonLogicData = {},
): unknown {
	if (expr === null || typeof expr !== "object") return expr;
	if (Array.isArray(expr)) {
		return expr.map((e) => applyJsonLogic(e as V2JsonLogicValue, data));
	}

	const op = getOpKey(expr as Record<string, unknown>);
	if (!op) return null;
	const rawArgs = (expr as Record<string, unknown>)[op];
	const args = Array.isArray(rawArgs) ? rawArgs : [rawArgs];

	const ev = (v: unknown): unknown =>
		applyJsonLogic(v as V2JsonLogicValue, data);

	switch (op) {
		case "var": {
			const key = ev(args[0]);
			const fallback = args.length > 1 ? ev(args[1]) : null;
			if (key === "" || key === null || key === undefined) return data;
			const got = resolveVar(String(key), data);
			return got === null || got === undefined ? fallback : got;
		}
		case "missing": {
			return args
				.map((a) => String(ev(a)))
				.filter((k) => {
					const v = resolveVar(k, data);
					return v === null || v === undefined || v === "";
				});
		}
		case "if":
		case "?:": {
			for (let i = 0; i < args.length - 1; i += 2) {
				if (truthy(ev(args[i]))) return ev(args[i + 1]);
			}
			return args.length % 2 === 1 ? ev(args[args.length - 1]) : null;
		}
		case "==": {
			const a = ev(args[0]);
			const b = ev(args[1]);
			if (typeof a === typeof b) return a === b;
			return String(a) === String(b);
		}
		case "===":
			return ev(args[0]) === ev(args[1]);
		case "!=": {
			const a = ev(args[0]);
			const b = ev(args[1]);
			if (typeof a === typeof b) return a !== b;
			return String(a) !== String(b);
		}
		case "!==":
			return ev(args[0]) !== ev(args[1]);
		case "!":
			return !truthy(ev(args[0]));
		case "!!":
			return truthy(ev(args[0]));
		case "and": {
			let last: unknown = true;
			for (const a of args) {
				last = ev(a);
				if (!truthy(last)) return last;
			}
			return last;
		}
		case "or": {
			let last: unknown = false;
			for (const a of args) {
				last = ev(a);
				if (truthy(last)) return last;
			}
			return last;
		}
		case "<":
		case "<=":
		case ">":
		case ">=": {
			const vals = args.map((a) => toNumber(ev(a)));
			for (let i = 0; i < vals.length - 1; i++) {
				const cur = vals[i] as number;
				const next = vals[i + 1] as number;
				const ok =
					op === "<"
						? cur < next
						: op === "<="
							? cur <= next
							: op === ">"
								? cur > next
								: cur >= next;
				if (!ok) return false;
			}
			return true;
		}
		case "+":
			return args.reduce((acc: number, a) => acc + toNumber(ev(a)), 0);
		case "-": {
			if (args.length === 1) return -toNumber(ev(args[0]));
			return args
				.slice(1)
				.reduce(
					(acc: number, a) => acc - toNumber(ev(a)),
					toNumber(ev(args[0])),
				);
		}
		case "*":
			return args.reduce((acc: number, a) => acc * toNumber(ev(a)), 1);
		case "/": {
			if (args.length < 2) return 0;
			let acc = toNumber(ev(args[0]));
			for (const a of args.slice(1)) {
				const d = toNumber(ev(a));
				acc = d === 0 ? 0 : acc / d;
			}
			return acc;
		}
		case "%": {
			const a = toNumber(ev(args[0]));
			const b = toNumber(ev(args[1]));
			return b === 0 ? 0 : a % b;
		}
		case "max":
			return Math.max(...args.map((a) => toNumber(ev(a))));
		case "min":
			return Math.min(...args.map((a) => toNumber(ev(a))));
		case "in": {
			const needle = ev(args[0]);
			const haystack = ev(args[1]);
			if (Array.isArray(haystack)) return haystack.includes(needle);
			if (typeof haystack === "string")
				return haystack.includes(String(needle));
			return false;
		}
		case "cat":
			return args.map((a) => String(ev(a) ?? "")).join("");
		case "merge": {
			const out: unknown[] = [];
			for (const a of args) {
				const v = ev(a);
				if (Array.isArray(v)) out.push(...v);
				else out.push(v);
			}
			return out;
		}
		case "map": {
			const arr = ev(args[0]);
			if (!Array.isArray(arr)) return [];
			return arr.map((item) =>
				applyJsonLogic(args[1] as V2JsonLogicValue, item as JsonLogicData),
			);
		}
		case "filter": {
			const arr = ev(args[0]);
			if (!Array.isArray(arr)) return [];
			return arr.filter((item) =>
				truthy(
					applyJsonLogic(args[1] as V2JsonLogicValue, item as JsonLogicData),
				),
			);
		}
		case "reduce": {
			const arr = ev(args[0]);
			const initial = ev(args[2]);
			if (!Array.isArray(arr)) return initial;
			let acc: unknown = initial;
			for (const current of arr) {
				acc = applyJsonLogic(args[1] as V2JsonLogicValue, {
					current,
					accumulator: acc,
				});
			}
			return acc;
		}
		case "none": {
			const arr = ev(args[0]);
			if (!Array.isArray(arr)) return true;
			return arr.every(
				(item) =>
					!truthy(
						applyJsonLogic(args[1] as V2JsonLogicValue, item as JsonLogicData),
					),
			);
		}
		case "some": {
			const arr = ev(args[0]);
			if (!Array.isArray(arr)) return false;
			return arr.some((item) =>
				truthy(
					applyJsonLogic(args[1] as V2JsonLogicValue, item as JsonLogicData),
				),
			);
		}
		case "all": {
			const arr = ev(args[0]);
			if (!Array.isArray(arr) || arr.length === 0) return false;
			return arr.every((item) =>
				truthy(
					applyJsonLogic(args[1] as V2JsonLogicValue, item as JsonLogicData),
				),
			);
		}
		default:
			return null;
	}
}

export function isJsonLogicTruthy(value: unknown): boolean {
	return truthy(value);
}

export function toFiniteNumberOrNull(value: unknown): number | null {
	if (value === null || value === undefined || value === "") return null;
	if (typeof value === "number") return Number.isFinite(value) ? value : null;
	if (typeof value === "boolean") return value ? 1 : 0;
	if (typeof value === "string") {
		const n = Number(value);
		return Number.isFinite(n) ? n : null;
	}
	return null;
}
