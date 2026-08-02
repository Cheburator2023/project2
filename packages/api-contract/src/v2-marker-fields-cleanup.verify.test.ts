import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { matchTypicalWorkTriggers } from "./v2-trigger-formula.util";

function resolveMonorepoFile(...parts: string[]): string {
	const candidates = [
		join(process.cwd(), ...parts),
		join(process.cwd(), "../..", ...parts),
	];
	const hit = candidates.find((p) => existsSync(p));
	if (!hit) throw new Error(`file not found: ${parts.join("/")}`);
	return hit;
}

const ANKETA = resolveMonorepoFile(
	"apps/nestjs-server/src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json",
);
const WORKS = resolveMonorepoFile(
	"apps/nestjs-server/src/modules/anketa-v2/constants/v2-factory-typical-works.snapshot.json",
);

const ORPHANS = [
	// дубли без/с «Маркер:»
	"field_DJJtx7nX",
	"field_1bl3dfSX",
	"field_WgK6lIS-",
	"field_lDw9gG39",
	// старые имена после переименования в CSV 2026.08.01
	"field_wuYlhnu0", // → field_DnB8Ur4I
	"field_61bkBs0m", // → field_xi0W_vl-
	"field_F8GPVM7R", // → field_OyRJyJxD
	"field_VX7y3PsB", // → field_OyRJyJxD
	"field_4Gff93vI",
	"field_TvqjyIO-",
] as const;

const KEPT = [
	"field_LGUdr5mq",
	"field_eIIWBdCg",
	"field_nx1zBg1X",
	"field_KnIEmMxM",
	"field_xi0W_vl-",
	"field_DnB8Ur4I",
	"field_OyRJyJxD",
	"field__NUAXSNP",
	"field_wluxUVJ9",
	"field_TrX4G9Gc",
] as const;

describe("cleanup Маркер-дубликатов sourceSystems", () => {
	const anketa = JSON.parse(readFileSync(ANKETA, "utf8")) as {
		jsonSchema: {
			properties: {
				detailInfo: {
					properties: {
						sourceSystems: {
							items: { properties: Record<string, { title?: string }> };
						};
					};
				};
			};
		};
	};
	const worksSnap = JSON.parse(readFileSync(WORKS, "utf8")) as {
		typicalWorks: Array<{
			name: string;
			stream: string;
			triggerRules?: Array<{
				paramCode?: string;
				paramName?: string;
				operator?: string;
				valueCode?: string | null;
				valueLabel?: string | null;
			}>;
		}>;
	};

	const props =
		anketa.jsonSchema.properties.detailInfo.properties.sourceSystems.items
			.properties;

	it("orphans удалены, у оставшихся titles есть префикс Маркер:", () => {
		for (const key of ORPHANS) {
			expect(props[key]).toBeUndefined();
		}
		for (const key of KEPT) {
			expect(props[key]?.title).toBeTruthy();
			expect(props[key]?.title).toMatch(/^Маркер:/i);
		}
	});

	it("работы ПиРМ матчятся по оставшимся paramCode с префиксом Маркер: в paramName", () => {
		const pirmWorks = worksSnap.typicalWorks.filter(
			(w) =>
				w.stream === "ПиРМ" &&
				(w.triggerRules ?? []).some((r) =>
					KEPT.includes(r.paramCode as (typeof KEPT)[number]),
				),
		);
		expect(pirmWorks.length).toBeGreaterThanOrEqual(5);

		for (const work of pirmWorks) {
			const rules = (work.triggerRules ?? []).map((r) => ({
				paramCode: r.paramCode ?? "",
				paramName: r.paramName ?? "",
				operator: (r.operator ?? "=") as "=",
				valueCode: r.valueCode ?? "true",
				valueLabel: r.valueLabel ?? "Да",
			}));
			expect(
				rules
					.filter((r) => KEPT.includes(r.paramCode as (typeof KEPT)[number]))
					.every((r) => /^Маркер:/i.test(r.paramName)),
			).toBe(true);

			const source: Record<string, unknown> = {};
			for (const rule of rules) {
				if (rule.paramCode) source[rule.paramCode] = true;
			}

			expect(
				matchTypicalWorkTriggers(
					{ mode: "simple", rules, triggerArchCount: null, triggerFormula: null },
					source,
					{ detailInfo: { sourceSystems: [source] } },
				),
			).toBe(true);

			const off = { ...source };
			const first = rules[0]?.paramCode;
			if (first) off[first] = false;
			expect(
				matchTypicalWorkTriggers(
					{ mode: "simple", rules, triggerArchCount: null, triggerFormula: null },
					off,
					{ detailInfo: { sourceSystems: [off] } },
				),
			).toBe(false);
		}
	});
});
