type AssignmentIdMap = ReadonlyMap<string, string>;

function remapAssignmentId(
	assignmentIdMap: AssignmentIdMap,
	assignmentId: string,
): string {
	return assignmentIdMap.get(assignmentId) ?? assignmentId;
}

/** Переносит ссылки work_ref / transitive на новые assignmentId после импорта. */
export function remapAssignmentIdsInStoredFormula(
	formula: unknown,
	assignmentIdMap: AssignmentIdMap,
): unknown {
	if (!formula || assignmentIdMap.size === 0) {
		return formula;
	}

	if (Array.isArray(formula)) {
		return formula.map((token) => {
			if (
				token &&
				typeof token === "object" &&
				(token as { kind?: string }).kind === "work_ref" &&
				typeof (token as { assignmentId?: unknown }).assignmentId === "string"
			) {
				const ref = token as {
					kind: "work_ref";
					assignmentId: string;
					workName?: string;
					invalid?: boolean;
				};
				return {
					...ref,
					assignmentId: remapAssignmentId(
						assignmentIdMap,
						ref.assignmentId,
					),
				};
			}
			return token;
		});
	}

	if (formula && typeof formula === "object") {
		const termsObject = formula as {
			version?: number;
			terms?: unknown[];
			text?: string;
		};
		if (termsObject.version === 2 && Array.isArray(termsObject.terms)) {
			return {
				...termsObject,
				terms: termsObject.terms.map((term) => {
					if (
						term &&
						typeof term === "object" &&
						(term as { kind?: string }).kind === "transitive" &&
						typeof (term as { sourceAssignmentId?: unknown })
							.sourceAssignmentId === "string"
					) {
						const transitive = term as {
							kind: "transitive";
							sourceAssignmentId: string;
							sourceWorkName?: string | null;
						};
						return {
							...transitive,
							sourceAssignmentId: remapAssignmentId(
								assignmentIdMap,
								transitive.sourceAssignmentId,
							),
						};
					}
					return term;
				}),
			};
		}
	}

	return formula;
}

export function remapAssignmentIdsInVersionConfigRow(
	row: Record<string, unknown>,
	assignmentIdMap: AssignmentIdMap,
): Record<string, unknown> {
	if (assignmentIdMap.size === 0) {
		return row;
	}
	return {
		...row,
		formula: remapAssignmentIdsInStoredFormula(row.formula, assignmentIdMap),
	};
}
