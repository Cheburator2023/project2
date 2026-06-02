import { useV2Template } from "@react-client/common/api/queries/v2-templates";
import { AnketaFormShell } from "@react-client/features/v2/anketaCRUD/templates/AnketaFormShell";
import { useV2AnketaSchemaEngine } from "@react-client/features/v2/anketaCRUD/hooks/useV2AnketaSchemaEngine";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router";
import { V2_TEMPLATE_VERSION_QUERY } from "@react-client/routing/common/pathHelpers";
import { V2_TEMPLATE_READ_TEST_IDS } from "@react-client/features/v2/admin_constructor/testIds";
import {
	useV2TemplateVersions,
} from "@react-client/common/api/queries/v2-templates";

export const V2TemplatePreviewPage = () => {
	const { templateId } = useParams<{ templateId: string }>();
	const [searchParams] = useSearchParams();
	const versionId = searchParams.get(V2_TEMPLATE_VERSION_QUERY);
	const { data: template } = useV2Template(templateId ?? "");
	const { data: versions } = useV2TemplateVersions(templateId ?? "");

	const previewVersionId = useMemo(() => {
		if (versionId) return versionId;
		const drafts =
			versions
				?.filter((v) => v.status === "draft")
				.sort((a, b) => b.versionNumber - a.versionNumber) ?? [];
		return drafts[0]?.id ?? template?.currentVersionId ?? null;
	}, [versionId, versions, template?.currentVersionId]);

	const source = useMemo(
		() =>
			templateId && previewVersionId
				? { templateId, versionId: previewVersionId }
				: null,
		[templateId, previewVersionId],
	);

	const engine = useV2AnketaSchemaEngine(source);

	if (!templateId) {
		return (
			<Alert severity="warning" sx={{ m: 2 }}>
				Не указан идентификатор шаблона
			</Alert>
		);
	}

	return (
		<AnketaFormShell
			data-test-id={V2_TEMPLATE_READ_TEST_IDS.page}
			source={source}
			engine={engine}
			headerExtra={
				<>
					<Typography variant="subtitle2" fontWeight={600} sx={{ mr: 1 }} noWrap>
						{template?.name ?? "Предпросмотр"}
					</Typography>
					<Chip size="small" variant="outlined" label="Предпросмотр схемы" />
					<Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
						Режим админки — без сохранения в реестр анкет
					</Typography>
				</>
			}
		/>
	);
};
