import { useCallback, useEffect, useRef, useState } from "react";
import type {
	PatchV2TypicalWorkRequestDto,
	V2TypicalWorkCardDto,
	V2TypicalWorkNormInputDto,
} from "@smart-anketa/api-contract";
import { collectTypicalWorkPatchValidationErrors } from "@smart-anketa/api-contract";
import { usePatchV2TypicalWork } from "@react-client/common/api/queries/v2-works";
import { parseTypicalWorkPatchError } from "./typicalWorkPatchErrors";
import {
	clearBufferedTypicalWorkPatch,
	readBufferedTypicalWorkPatch,
	saveBufferedTypicalWorkPatch,
} from "./typicalWorkSaveBuffer";

import { reconcileStreamNormPeriods } from "./typicalWorkNormPeriods";

function reconcilePatchDtoNorms(
	dto: PatchV2TypicalWorkRequestDto,
): PatchV2TypicalWorkRequestDto {
	const stream = dto.streamExecutor?.trim();
	if (!stream || !dto.norms?.length) return dto;

	const normsWithId = dto.norms.filter(
		(norm): norm is V2TypicalWorkNormInputDto & { id: string } =>
			Boolean(norm.id),
	);
	const normsWithoutId = dto.norms.filter((norm) => !norm.id);

	const reconciled = reconcileStreamNormPeriods(
		normsWithId.map((norm) => ({
			id: norm.id,
			streamExecutor: stream,
			normValue: norm.normValue,
			validFrom: norm.validFrom,
			validTo: norm.validTo ?? null,
		})),
		stream,
	);

	return {
		...dto,
		norms: [
			...normsWithoutId,
			...reconciled.map(({ id, normValue, validFrom, validTo }) => ({
				id,
				normValue,
				validFrom,
				validTo,
			})),
		],
	};
}

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

type UseDebouncedTypicalWorkSaveOptions = {
	onFormulaLocked?: () => void;
	onSaved?: () => void;
};

export function useDebouncedTypicalWorkSave(
	workId: string | null,
	templateVersionId: string | null,
	options?: UseDebouncedTypicalWorkSaveOptions,
) {
	const patch = usePatchV2TypicalWork();
	const [status, setStatus] = useState<SaveStatus>("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [bufferedRestore, setBufferedRestore] = useState(false);
	const timerRef = useRef<number | null>(null);
	const pendingRef = useRef<PatchV2TypicalWorkRequestDto | null>(null);
	const templateVersionIdRef = useRef(templateVersionId);
	templateVersionIdRef.current = templateVersionId;

	const flush = useCallback(async () => {
		if (!workId || !pendingRef.current) return;
		const dto = reconcilePatchDtoNorms({
			...pendingRef.current,
			templateVersionId:
				templateVersionIdRef.current ?? pendingRef.current.templateVersionId,
		});
		const validationErrors = collectTypicalWorkPatchValidationErrors(dto);
		if (validationErrors.length > 0) {
			const message = validationErrors
				.map((e) => `${e.path}: ${e.message}`)
				.join("; ");
			setStatus("error");
			setErrorMessage(message);
			return;
		}
		pendingRef.current = null;
		setStatus("saving");
		setErrorMessage(null);
		try {
			await patch.mutateAsync({ workId, dto });
			await clearBufferedTypicalWorkPatch(workId);
			setBufferedRestore(false);
			setStatus("saved");
			options?.onSaved?.();
		} catch (error) {
			const parsed = parseTypicalWorkPatchError(error);
			if (parsed.code === "FORMULA_LOCKED") {
				pendingRef.current = dto;
				setStatus("error");
				setErrorMessage(parsed.message);
				options?.onFormulaLocked?.();
				return;
			}
			pendingRef.current = dto;
			setStatus("error");
			setErrorMessage(parsed.message);
			await saveBufferedTypicalWorkPatch({
				workId,
				dto,
				savedAt: new Date().toISOString(),
				errorMessage: parsed.message,
			});
		}
	}, [options, patch, workId]);

	const scheduleSave = useCallback(
		(dto: PatchV2TypicalWorkRequestDto) => {
			pendingRef.current = {
				...pendingRef.current,
				...dto,
				templateVersionId:
					templateVersionIdRef.current ?? dto.templateVersionId,
			};
			setStatus("dirty");
			if (timerRef.current) window.clearTimeout(timerRef.current);
			timerRef.current = window.setTimeout(() => {
				void flush();
			}, 600);
		},
		[flush],
	);

	useEffect(
		() => () => {
			if (timerRef.current) window.clearTimeout(timerRef.current);
		},
		[],
	);

	useEffect(() => {
		if (!workId) {
			setBufferedRestore(false);
			return;
		}
		let cancelled = false;
		void readBufferedTypicalWorkPatch(workId).then((entry) => {
			if (cancelled || !entry) return;
			pendingRef.current = entry.dto;
			setErrorMessage(entry.errorMessage);
			setStatus("error");
			setBufferedRestore(true);
		});
		return () => {
			cancelled = true;
		};
	}, [workId]);

	const retry = useCallback(() => {
		if (pendingRef.current) void flush();
	}, [flush]);

	const hasPending = useCallback(() => pendingRef.current !== null, []);

	const discardBuffer = useCallback(async () => {
		if (!workId) return;
		pendingRef.current = null;
		setBufferedRestore(false);
		setErrorMessage(null);
		setStatus("idle");
		await clearBufferedTypicalWorkPatch(workId);
	}, [workId]);

	return {
		status,
		errorMessage,
		bufferedRestore,
		scheduleSave,
		retry,
		discardBuffer,
		hasPending,
		flushPending: flush,
	};
}

export function cardToPatchDto(
	card: V2TypicalWorkCardDto,
	templateVersionId: string | null,
): PatchV2TypicalWorkRequestDto {
	const stream = card.streamExecutor.trim();
	const reconciledNorms = reconcileStreamNormPeriods(card.norms, stream);
	return {
		streamExecutor: stream,
		templateVersionId: templateVersionId ?? undefined,
		name: card.name,
		archComponentType: card.archComponentType,
		norms: reconciledNorms
			.filter((norm) => norm.streamExecutor === stream)
			.map((norm) => ({
				id: norm.id,
				normValue: norm.normValue,
				validFrom: norm.validFrom,
				validTo: norm.validTo,
			})),
		rules: card.rules
			.filter((rule) => rule.streamExecutor === stream)
			.map((rule) => ({
				id: rule.id,
				schemaFieldUid: rule.schemaFieldUid ?? null,
				paramCode: rule.paramCode,
				paramName: rule.paramName,
				operator: rule.operator,
				valueCode: rule.valueCode,
				valueLabel: rule.valueLabel,
				values: rule.values,
				sortOrder: rule.sortOrder,
			})),
		laborParams: card.laborParams
			.filter(
				(group) =>
					group.coefficients.length === 0 ||
					group.coefficients.every((row) => row.streamExecutor === stream),
			)
			.map((group) => ({
				schemaFieldUid: group.schemaFieldUid ?? null,
				paramCode: group.paramCode,
				paramName: group.paramName,
				kind: group.kind ?? "by_value",
				coefficients: group.coefficients
					.filter((row) => row.streamExecutor === stream)
					.map((row) => ({
						id: row.id,
						paramCode: group.paramCode,
						paramName: group.paramName,
						valueCode: row.valueCode,
						valueLabel: row.valueLabel,
						coefficient: row.coefficient,
					})),
				anyOf: group.anyOf ?? null,
			})),
		formula: card.formula,
		formulaTerms: card.formulaTerms,
		rounding: card.rounding,
	};
}
