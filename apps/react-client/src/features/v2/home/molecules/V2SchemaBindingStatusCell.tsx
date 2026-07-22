import type { ICellRendererParams } from "ag-grid-community";
import Link from "@mui/material/Link";
import { formatV2SchemaBindingStatus } from "@smart-anketa/api-contract";
import { pathForAdminV2Template } from "@react-client/routing/common/pathHelpers";
import { Link as RouterLink } from "react-router";
import type { V2QuestionnaireGridRow } from "../types/v2QuestionnaireGrid.types";
import { resolveVersionRow } from "../utils/v2QuestionnaireGridValue";

export function V2SchemaBindingStatusCell(
	params: ICellRendererParams<V2QuestionnaireGridRow>,
) {
	const row = resolveVersionRow(params.data);
	if (!row) return null;

	const { schemaBinding, templateId } = row;
	const label = formatV2SchemaBindingStatus(schemaBinding.status);
	if (!label) return null;

	const versionNumber = schemaBinding.boundTemplateVersionNumber;
	const text =
		versionNumber != null ? `${label} (v${versionNumber})` : label;

	if (!templateId) {
		return (
			<span title={schemaBinding.message || undefined}>{text}</span>
		);
	}

	const to = pathForAdminV2Template(
		templateId,
		schemaBinding.boundTemplateVersionId || null,
	);

	return (
		<Link
			component={RouterLink}
			to={to}
			underline="hover"
			title={schemaBinding.message || "Открыть привязанную схему"}
			onClick={(e) => e.stopPropagation()}
			sx={{ fontSize: "inherit", lineHeight: "inherit" }}
		>
			{text}
		</Link>
	);
}
