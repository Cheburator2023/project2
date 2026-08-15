import { useCalculateV2Template } from "@react-client/common/api/queries/v2-templates";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { IS_DEV } from "@react-client/common/constants/dev";
import type {
	V2CalculateRequestDto,
	V2CalculationResultDto,
	V2LogicGraphDto,
} from "@smart-anketa/api-contract";
import { useEffect, useRef, useState } from "react";

type Options = {
	templateId: string;
	versionId?: string | null;
	formData: Record<string, unknown>;
	/** Только конструктор/draft preview — runtime анкеты не шлёт схемы. */
	rulesOverride?: V2LogicGraphDto;
	jsonSchema?: Record<string, unknown>;
	uiSchema?: Record<string, unknown>;
	revision?: number;
	debounceMs?: number;
	enabled?: boolean;
};

export function useDebouncedV2Calculation({
	templateId,
	versionId,
	formData,
	rulesOverride,
	jsonSchema,
	uiSchema,
	revision = 0,
	debounceMs = 350,
	enabled = true,
}: Options) {
	const { mutateAsync, isPending } = useCalculateV2Template();
	const [result, setResult] = useState<V2CalculationResultDto | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isDebouncing, setIsDebouncing] = useState(false);
	const requestIdRef = useRef(0);

	useEffect(() => {
		if (!enabled || !templateId || !versionId) {
			setResult(null);
			setError(null);
			setIsDebouncing(false);
			return;
		}

		const requestId = ++requestIdRef.current;
		setError(null);
		setIsDebouncing(true);
		const timer = window.setTimeout(() => {
			setIsDebouncing(false);
			if (IS_DEV) {
				console.debug("[anketa-calc] POST /calculate", {
					templateId,
					versionId,
					formDataKeys: Object.keys(formData),
					hasOverrides: Boolean(rulesOverride || jsonSchema || uiSchema),
				});
			}
			const dto: V2CalculateRequestDto = { formData };
			if (rulesOverride) dto.rulesOverride = rulesOverride;
			if (jsonSchema) dto.jsonSchema = jsonSchema;
			if (uiSchema) dto.uiSchema = uiSchema;
			void mutateAsync({
				templateId,
				versionId,
				dto,
			})
				.then((data) => {
					if (requestId !== requestIdRef.current) return;
					setResult(data);
					setError(null);
				})
				.catch((err) => {
					if (requestId !== requestIdRef.current) return;
					setResult(null);
					setError(apiErrorMessage(err));
				});
		}, debounceMs);

		return () => window.clearTimeout(timer);
	}, [
		templateId,
		versionId,
		formData,
		rulesOverride,
		jsonSchema,
		uiSchema,
		revision,
		debounceMs,
		enabled,
		mutateAsync,
	]);

	return {
		result,
		isLoading: isDebouncing || isPending,
		error,
	};
}
