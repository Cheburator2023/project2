import { useCallback, useEffect, useRef, useState } from "react";
import type {
	PatchV2TypicalWorkRequestDto,
	V2TypicalWorkCardDto,
} from "@smart-anketa/api-contract";
import { collectTypicalWorkPatchValidationErrors } from "@smart-anketa/api-contract";
import { usePatchV2TypicalWork } from "@react-client/common/api/queries/v2-works";
import { parseTypicalWorkPatchError } from "./typicalWorkPatchErrors";
import {
	clearBufferedTypicalWorkPatch,
	readBufferedTypicalWorkPatch,
	saveBufferedTypicalWorkPatch,
} from "./typicalWorkSaveBuffer";

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

type UseDebouncedTypicalWorkSaveOptions = {
	onFormulaLocked?: () => void;
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
		const dto = {
			...pendingRef.current,
			templateVersionId:
				templateVersionIdRef.current ?? pendingRef.current.templateVersionId,
		};
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
		hasPending: () => pendingRef.current !== null,
		flushPending: flush,
	};
}

export function cardToPatchDto(
	card: V2TypicalWorkCardDto,
	templateVersionId: string | null,
): PatchV2TypicalWorkRequestDto {
	return {
		streamExecutor: card.streamExecutor,
		templateVersionId: templateVersionId ?? undefined,
		name: card.name,
		archComponentType: card.archComponentType,
		norms: card.norms.map((norm) => ({
			id: norm.id,
			normValue: norm.normValue,
			validFrom: norm.validFrom,
			validTo: norm.validTo,
		})),
		rules: card.rules.map((rule) => ({
			id: rule.id,
			paramCode: rule.paramCode,
			paramName: rule.paramName,
			operator: rule.operator,
			valueCode: rule.valueCode,
			valueLabel: rule.valueLabel,
		})),
		laborCoefficients: card.laborParams.flatMap((group) =>
			group.coefficients.map((row) => ({
				id: row.id,
				paramCode: group.paramCode,
				paramName: group.paramName,
				valueCode: row.valueCode,
				valueLabel: row.valueLabel,
				coefficient: row.coefficient,
			})),
		),
		formula: card.formula,
		rounding: card.rounding,
	};
}
