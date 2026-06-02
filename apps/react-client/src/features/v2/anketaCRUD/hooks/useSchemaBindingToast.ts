import { toast } from "@react-client/common/toasts";
import type { V2SchemaBindingDto } from "@smart-anketa/api-contract";
import { useEffect, useRef } from "react";

function toastForSchemaBinding(binding: V2SchemaBindingDto): void {
	const message = binding.message?.trim();
	if (!message) return;

	switch (binding.status) {
		case "aligned":
			toast.info(message);
			break;
		case "superseded":
			toast.warning(message);
			break;
		case "unavailable":
			toast.error(message);
			break;
	}
}

/**
 * Показывает schemaBinding.message тостом один раз при открытии анкеты.
 */
export function useSchemaBindingToast(
	schemaBinding: V2SchemaBindingDto | null | undefined,
	questionnaireId: string | undefined,
	enabled: boolean,
): void {
	const lastShownKeyRef = useRef<string | null>(null);

	useEffect(() => {
		if (!enabled || !schemaBinding?.message) return;

		const key = [
			questionnaireId ?? "no-id",
			schemaBinding.status,
			schemaBinding.boundTemplateVersionId,
			schemaBinding.currentTemplateVersionId ?? "",
		].join(":");

		if (lastShownKeyRef.current === key) return;
		lastShownKeyRef.current = key;

		toastForSchemaBinding(schemaBinding);
	}, [enabled, questionnaireId, schemaBinding]);
}
