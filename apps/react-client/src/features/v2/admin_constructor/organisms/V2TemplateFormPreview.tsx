import {
	useV2Template,
	useV2TemplateVersion,
	useV2TemplateVersions,
} from "@react-client/common/api/queries/v2-templates";
import { Flex } from "@react-client/common/primitives/Flex";
import { V2AnketaFormWithModals } from "@react-client/features/v2/anketaCRUD/organisms/V2AnketaFormWithModals";
import { useV2AnketaSchemaEngine } from "@react-client/features/v2/anketaCRUD/hooks/useV2AnketaSchemaEngine";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { useMemo } from "react";
import { V2_TEMPLATE_READ_TEST_IDS } from "../testIds";
import { V2FormWithEvaluationLayout } from "./V2FormWithEvaluationLayout";

type V2TemplateFormPreviewProps = {
	templateId: string;
	initialVersionId?: string | null;
};

export function V2TemplateFormPreview({
	templateId,
	initialVersionId = null,
}: V2TemplateFormPreviewProps) {
	const { data: template } = useV2Template(templateId);
	const { data: versions, isLoading: versionsLoading } =
		useV2TemplateVersions(templateId);

	const latestDraft = useMemo(() => {
		const drafts =
			versions
				?.filter((v) => v.status === "draft")
				.sort((a, b) => b.versionNumber - a.versionNumber) ?? [];
		return drafts[0];
	}, [versions]);

	const previewVersionId = useMemo(
		() =>
			initialVersionId ??
			latestDraft?.id ??
			template?.currentVersionId ??
			null,
		[initialVersionId, latestDraft?.id, template?.currentVersionId],
	);

	const { data: previewVersion, isLoading: previewVersionLoading } =
		useV2TemplateVersion(templateId, previewVersionId);

	const engine = useV2AnketaSchemaEngine(
		previewVersion?.id
			? { templateId, versionId: previewVersionId }
			: null,
	);

	if (versionsLoading || previewVersionLoading || engine.versionLoading) {
		return (
			<Flex
				justifyContent="center"
				alignItems="center"
				flexGrow={1}
				data-test-id={V2_TEMPLATE_READ_TEST_IDS.loading}
			>
				<CircularProgress size={32} />
			</Flex>
		);
	}

	if (!previewVersion) {
		return (
			<Alert
				severity="warning"
				data-test-id={V2_TEMPLATE_READ_TEST_IDS.noDraft}
			>
				Нет версии для предпросмотра. Создайте черновик или выберите версию в
				редакторе.
			</Alert>
		);
	}

	return (
		<>
			{engine.dictionaryEnumsLoading ? (
				<Alert severity="info" sx={{ mb: 2 }}>
					Загрузка справочников…
				</Alert>
			) : null}

			{engine.calculationError ? (
				<Alert severity="error" sx={{ mb: 2 }}>
					Ошибка калькуляции: {engine.calculationError}
				</Alert>
			) : null}
			{engine.logicValidationIssueCount > 0 ? (
				<Alert severity="warning" sx={{ mb: 2 }}>
					Логическая валидация: {engine.logicValidationIssueCount}{" "}
					{engine.logicValidationIssueCount === 1 ? "замечание" : "замечаний"}
				</Alert>
			) : null}

			<Box data-test-id={V2_TEMPLATE_READ_TEST_IDS.form}>
				<V2FormWithEvaluationLayout
					summary={engine.summary}
					calculationLoading={engine.calculationLoading}
				>
					<V2AnketaFormWithModals
						engine={engine}
						data-test-id="template-form-preview"
					/>
				</V2FormWithEvaluationLayout>
			</Box>
		</>
	);
}
