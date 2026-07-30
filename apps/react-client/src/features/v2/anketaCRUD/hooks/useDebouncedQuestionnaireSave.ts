import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type {
	UpdateV2QuestionnaireRequestDto,
	V2QuestionnaireDto,
	V2QuestionnaireFormPackageDto,
} from "@smart-anketa/api-contract";
import { apiClient } from "@react-client/common/api/helpers/apiClient";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";

export type QuestionnaireSaveStatus =
	| "idle"
	| "dirty"
	| "saving"
	| "saved"
	| "error";

const ROOT_KEY = ["v2-questionnaires"] as const;
const DEFAULT_DEBOUNCE_MS = 800;

function stableFormDataKey(formData: Record<string, unknown>): string {
	try {
		return JSON.stringify(formData);
	} catch {
		return String(Date.now());
	}
}

type Options = {
	questionnaireId: string | null | undefined;
	calcName: string | null | undefined;
	formData: Record<string, unknown> | null | undefined;
	enabled?: boolean;
	debounceMs?: number;
};

/**
 * Автосохранение анкеты с debounce. Не инвалидирует form-package
 * (только soft-update кэша), чтобы не было флешей/ремонта формы.
 */
export function useDebouncedQuestionnaireSave({
	questionnaireId,
	calcName,
	formData,
	enabled = true,
	debounceMs = DEFAULT_DEBOUNCE_MS,
}: Options) {
	const qc = useQueryClient();
	const [status, setStatus] = useState<QuestionnaireSaveStatus>("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const timerRef = useRef<number | null>(null);
	const lastSavedKeyRef = useRef<string | null>(null);
	const savingRef = useRef(false);
	const pendingRef = useRef<{
		calcName: string;
		formData: Record<string, unknown>;
		key: string;
	} | null>(null);
	const idRef = useRef(questionnaireId);
	idRef.current = questionnaireId;

	const clearTimer = () => {
		if (timerRef.current != null) {
			window.clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	};

	const applySoftCache = useCallback(
		(id: string, dto: V2QuestionnaireDto, formDataSaved: Record<string, unknown>) => {
			qc.setQueryData<V2QuestionnaireDto>([...ROOT_KEY, id], dto);
			qc.setQueryData<V2QuestionnaireFormPackageDto>(
				[...ROOT_KEY, id, "form-package"],
				(prev) => {
					if (!prev) return prev;
					return {
						...prev,
						questionnaire: {
							...prev.questionnaire,
							...dto,
							formData: formDataSaved,
						},
					};
				},
			);
			void qc.invalidateQueries({ queryKey: ROOT_KEY, exact: true });
		},
		[qc],
	);

	const flush = useCallback(async () => {
		const id = idRef.current;
		const pending = pendingRef.current;
		if (!id || !pending || savingRef.current) return;
		savingRef.current = true;
		setStatus("saving");
		setErrorMessage(null);
		try {
			const body: UpdateV2QuestionnaireRequestDto = {
				calcName: pending.calcName,
				formData: pending.formData,
				finalCoefficient: null,
			};
			const dto = await apiClient<V2QuestionnaireDto>({
				url: `/v2/questionnaires/${id}`,
				method: "PATCH",
				data: body,
			});
			lastSavedKeyRef.current = pending.key;
			if (pendingRef.current?.key === pending.key) {
				pendingRef.current = null;
			}
			applySoftCache(id, dto, pending.formData);
			setStatus("saved");
		} catch (err) {
			setStatus("error");
			setErrorMessage(apiErrorMessage(err));
		} finally {
			savingRef.current = false;
			if (pendingRef.current && pendingRef.current.key !== lastSavedKeyRef.current) {
				clearTimer();
				timerRef.current = window.setTimeout(() => {
					void flush();
				}, debounceMs);
			}
		}
	}, [applySoftCache, debounceMs]);

	const saveNow = useCallback(() => {
		clearTimer();
		void flush();
	}, [flush]);

	useEffect(() => {
		if (!enabled || !questionnaireId || !calcName || !formData) return;
		const key = `${calcName}\0${stableFormDataKey(formData)}`;
		if (lastSavedKeyRef.current == null) {
			lastSavedKeyRef.current = key;
			setStatus("idle");
			return;
		}
		if (key === lastSavedKeyRef.current) return;

		pendingRef.current = {
			calcName,
			formData,
			key,
		};
		setStatus((prev) => (prev === "saving" ? prev : "dirty"));
		clearTimer();
		timerRef.current = window.setTimeout(() => {
			void flush();
		}, debounceMs);

		return clearTimer;
	}, [calcName, debounceMs, enabled, flush, formData, questionnaireId]);

	useEffect(() => () => clearTimer(), []);

	useEffect(() => {
		const onLeave = () => {
			if (!pendingRef.current || savingRef.current) return;
			clearTimer();
			void flush();
		};
		window.addEventListener("pagehide", onLeave);
		return () => window.removeEventListener("pagehide", onLeave);
	}, [flush]);

	return {
		status,
		errorMessage,
		saveNow,
		isSaving: status === "saving",
	};
}
