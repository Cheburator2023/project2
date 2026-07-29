/** Строка типовой работы из ответа POST /calculate / liveFormData. */
export type CalcTypicalRow = {
	path: string;
	name: string;
	workId: string | null;
	estimateHoursPerDay: number | null;
	coefficient: number | null;
	total: number | null;
	formulaBreakdown: {
		baseNorm?: number;
		coefficient?: number;
		total?: number;
		expanded?: string;
	} | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function asFiniteNumber(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim()) {
		const n = Number(value.replace(",", "."));
		return Number.isFinite(n) ? n : null;
	}
	return null;
}

function isTypicalWorkRow(row: Record<string, unknown>): boolean {
	if (typeof row.workId === "string" && row.workId.trim()) return true;
	if (row.estimateHoursPerDay != null && row.total != null) return true;
	if (row.generatedByRuleId != null && row.name != null) return true;
	return false;
}

/** Рекурсивно собирает массивы типовых работ из formData. */
export function collectTypicalWorkRowsFromFormData(
	formData: Record<string, unknown>,
	prefix = "",
): CalcTypicalRow[] {
	const out: CalcTypicalRow[] = [];
	for (const [key, value] of Object.entries(formData)) {
		const path = prefix ? `${prefix}.${key}` : key;
		if (Array.isArray(value)) {
			const looksTypical =
				key.toLowerCase().includes("typical") ||
				value.some(
					(item) =>
						asRecord(item) != null && isTypicalWorkRow(asRecord(item)!),
				);
			if (looksTypical) {
				value.forEach((item, index) => {
					const row = asRecord(item);
					if (!row || !isTypicalWorkRow(row)) return;
					const breakdown = asRecord(row.formulaBreakdown);
					out.push({
						path: `${path}[${index}]`,
						name: String(row.name ?? row.label ?? `work-${index}`),
						workId:
							typeof row.workId === "string" && row.workId.trim()
								? row.workId
								: null,
						estimateHoursPerDay: asFiniteNumber(row.estimateHoursPerDay),
						coefficient: asFiniteNumber(row.coefficient),
						total: asFiniteNumber(row.total),
						formulaBreakdown: breakdown
							? {
									baseNorm: asFiniteNumber(breakdown.baseNorm) ?? undefined,
									coefficient:
										asFiniteNumber(breakdown.coefficient) ?? undefined,
									total: asFiniteNumber(breakdown.total) ?? undefined,
									expanded:
										typeof breakdown.expanded === "string"
											? breakdown.expanded
											: undefined,
								}
							: null,
					});
				});
			}
			continue;
		}
		const child = asRecord(value);
		if (child) {
			out.push(...collectTypicalWorkRowsFromFormData(child, path));
		}
	}
	return out;
}

/**
 * Сверка арифметики строки: total ≈ norm × coeff (с допуском на CEIL/округление).
 * Если есть formulaBreakdown.total — он главный источник истины.
 */
export function assertTypicalRowMath(
	row: CalcTypicalRow,
	opts?: { absTol?: number },
): void {
	const absTol = opts?.absTol ?? 0.15;
	const breakdownTotal = row.formulaBreakdown?.total ?? null;
	if (breakdownTotal != null && row.total != null) {
		if (Math.abs(breakdownTotal - row.total) > absTol) {
			throw new Error(
				`[${row.name}] formulaBreakdown.total=${breakdownTotal} ≠ total=${row.total}`,
			);
		}
	}

	const norm =
		row.estimateHoursPerDay ?? row.formulaBreakdown?.baseNorm ?? null;
	const coeff = row.coefficient ?? row.formulaBreakdown?.coefficient ?? null;
	const total = row.total;
	if (norm == null || coeff == null || total == null) return;

	const expected = norm * coeff;
	if (Math.abs(expected - total) > absTol + Math.abs(norm) * 0.05) {
		// CEIL step 0.1 может чуть разъехаться — допускаем ещё один шаг
		const ceilish = Math.ceil(expected * 10) / 10;
		if (Math.abs(ceilish - total) > absTol) {
			throw new Error(
				`[${row.name}] ${norm} × ${coeff} = ${expected} (ceil≈${ceilish}), UI/calc total=${total}`,
			);
		}
	}
}

export function sumTypicalTotals(rows: CalcTypicalRow[]): number {
	return rows.reduce((sum, row) => sum + (row.total ?? 0), 0);
}
