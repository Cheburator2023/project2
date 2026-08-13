import type { ICellRendererParams } from "ag-grid-community";
import Link from "@mui/material/Link";
import {
	formatV2SchemaBindingStatus,
	formatV2TemplateVersionDisplayName,
} from "@smart-anketa/api-contract";
import { pathForAdminV2Template } from "@react-client/routing/common/pathHelpers";
import { Link as RouterLink } from "react-router";
import type { V2QuestionnaireGridRow } from "../types/v2QuestionnaireGrid.types";
import { resolveVersionRow } from "../utils/v2QuestionnaireGridValue";

export function V2SchemaBindingStatusCell(
	params: ICellRendererParams<V2QuestionnaireGridRow>,
) {
	const row = resolveVersionRow(params.data);
	if (!row) return null;

	const { schemaBinding, templateId, templateName } = row;
	const text = formatV2TemplateVersionDisplayName(
		templateName,
		schemaBinding.boundTemplateVersionNumber,
	);
	if (!text) return null;

	const statusLabel = formatV2SchemaBindingStatus(schemaBinding.status);
	const titleParts = [
		schemaBinding.message?.trim() || null,
		statusLabel || null,
		"Открыть привязанную схему",
	].filter(Boolean);

	if (!templateId) {
		return <span title={titleParts.join(" · ") || undefined}>{text}</span>;
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
			title={titleParts.join(" · ")}
			onClick={(e) => e.stopPropagation()}
			onContextMenu={(e) => e.stopPropagation()}
			sx={{ fontSize: "inherit", lineHeight: "inherit" }}
		>
			{text}
		</Link>
	);
}
