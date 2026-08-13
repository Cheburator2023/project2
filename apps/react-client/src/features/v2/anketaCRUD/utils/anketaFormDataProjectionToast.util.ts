import type { V2FormDataProjectionReportDto } from "@smart-anketa/api-contract";
import { toast } from "@react-client/common/toasts";

/** Показывает предупреждение о расхождениях параметров после версии/копии. */
export function toastFormDataProjectionReport(
	report: V2FormDataProjectionReportDto | undefined,
): void {
	if (!report?.summary) return;
	toast.warning("Расхождения при переносе данных", {
		description: report.summary,
	});
}

/** Нужен ли диалог выбора актуальной схемы. */
export function needsSchemaCurrencyChoice(schemaBinding: {
	status: string;
	currentTemplateVersionId?: string | null;
}): boolean {
	return (
		schemaBinding.status === "superseded" &&
		Boolean(schemaBinding.currentTemplateVersionId)
	);
}
