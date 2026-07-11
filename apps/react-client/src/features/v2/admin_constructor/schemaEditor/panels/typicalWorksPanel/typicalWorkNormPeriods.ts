import type { V2TypicalWorkNormDto } from "@smart-anketa/api-contract";

export function isoNormDay(value: string | null | undefined): string {
	if (!value) return "";
	const day = value.slice(0, 10);
	return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : "";
}

export function dayBeforeIso(isoDay: string): string | null {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDay)) return null;
	const date = new Date(`${isoDay}T12:00:00.000Z`);
	if (Number.isNaN(date.getTime())) return null;
	date.setUTCDate(date.getUTCDate() - 1);
	return date.toISOString().slice(0, 10);
}

/**
 * Закрывает открытые периоды (validTo = null) того же стрима,
 * начавшиеся не позже дня перед nextValidFrom.
 */
export function closeOpenNormPeriodsBefore(
	norms: readonly V2TypicalWorkNormDto[],
	streamExecutor: string,
	nextValidFrom: string,
	options?: { exceptNormId?: string | null },
): V2TypicalWorkNormDto[] {
	const closeBefore = dayBeforeIso(nextValidFrom);
	if (!closeBefore) return [...norms];
	const exceptId = options?.exceptNormId ?? null;
	return norms.map((norm) => {
		if (norm.streamExecutor !== streamExecutor || norm.validTo) return norm;
		if (exceptId && norm.id === exceptId) return norm;
		const from = isoNormDay(norm.validFrom);
		if (!from || from > closeBefore) return norm;
		return { ...norm, validTo: closeBefore };
	});
}

/**
 * Для каждого стрима закрывает более ранние открытые нормы,
 * если есть более поздняя по validFrom (типичный дубль: сид 2025-01-01 + новая норма).
 */
export function reconcileStreamNormPeriods(
	norms: readonly V2TypicalWorkNormDto[],
	streamExecutor?: string,
): V2TypicalWorkNormDto[] {
	const streams = streamExecutor
		? [streamExecutor]
		: [...new Set(norms.map((norm) => norm.streamExecutor))];

	let result = [...norms];
	for (const stream of streams) {
		const indices = result
			.map((norm, index) => ({ norm, index }))
			.filter(({ norm }) => norm.streamExecutor === stream)
			.sort((a, b) =>
				isoNormDay(a.norm.validFrom).localeCompare(isoNormDay(b.norm.validFrom)),
			);

		for (let i = 0; i < indices.length - 1; i++) {
			const current = indices[i];
			const next = indices[i + 1];
			if (!current || !next) continue;
			const nextFrom = isoNormDay(next.norm.validFrom);
			if (!nextFrom) continue;
			if (current.norm.validTo) continue;
			const closeBefore = dayBeforeIso(nextFrom);
			if (!closeBefore) continue;
			const currentFrom = isoNormDay(current.norm.validFrom);
			if (!currentFrom || currentFrom > closeBefore) continue;
			result = result.map((norm, index) =>
				index === current.index ? { ...norm, validTo: closeBefore } : norm,
			);
		}
	}
	return result;
}
