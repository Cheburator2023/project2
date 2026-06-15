import {
	useV2Template,
	useV2TemplateVersion,
	useV2TemplateVersions,
} from "@react-client/common/api/queries/v2-templates";
import { Flex } from "@react-client/common/primitives/Flex";
import { AnketaFormShell } from "@react-client/features/v2/anketaCRUD/templates/AnketaFormShell";
import { useV2AnketaSchemaEngine } from "@react-client/features/v2/anketaCRUD/hooks/useV2AnketaSchemaEngine";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router";
import { V2_TEMPLATE_VERSION_QUERY } from "@react-client/routing/common/pathHelpers";
import { V2_TEMPLATE_READ_TEST_IDS } from "@react-client/features/v2/admin_constructor/testIds";

export const V2TemplatePreviewPage = () => {
	const { templateId } = useParams<{ templateId: string }>();
	const [searchParams] = useSearchParams();
	const versionId = searchParams.get(V2_TEMPLATE_VERSION_QUERY);
	const { data: template } = useV2Template(templateId ?? "");
	const { data: versions, isLoading: versionsLoading } = useV2TemplateVersions(
		templateId ?? "",
	);

	const previewVersionId = useMemo(() => {
		if (versionId) return versionId;
		const drafts =
			versions
				?.filter((v) => v.status === "draft")
				.sort((a, b) => b.versionNumber - a.versionNumber) ?? [];
		if (drafts[0]?.id) return drafts[0].id;
		if (template?.currentVersionId) return template.currentVersionId;
		const latest =
			versions?.slice().sort((a, b) => b.versionNumber - a.versionNumber)[0];
		return latest?.id ?? null;
	}, [versionId, versions, template?.currentVersionId]);

	const { data: previewVersion, isLoading: previewVersionLoading } =
		useV2TemplateVersion(templateId ?? "", previewVersionId);

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

	if (versionsLoading || previewVersionLoading) {
		return (
			<Flex
				justifyContent="center"
				alignItems="center"
				flexGrow={1}
				minHeight="min(480px, 60vh)"
				data-test-id={V2_TEMPLATE_READ_TEST_IDS.loading}
			>
				<CircularProgress color="info" />
			</Flex>
		);
	}

	if (!previewVersion) {
		return (
			<Alert
				severity="warning"
				sx={{ m: 2 }}
				data-test-id={V2_TEMPLATE_READ_TEST_IDS.noDraft}
			>
				Нет версии для предпросмотра. Создайте черновик или выберите версию в
				редакторе.
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
