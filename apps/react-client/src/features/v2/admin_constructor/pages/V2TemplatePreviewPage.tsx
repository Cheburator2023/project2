import { useV2Template } from "@react-client/common/api/queries/v2-templates";
import { Flex } from "@react-client/common/primitives/Flex";
import { V2TemplateFormPreview } from "@react-client/features/v2/admin_constructor/organisms/V2TemplateFormPreview";

import { Header } from "@react-client/common/navigation/organisms/Header";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { useParams, useSearchParams } from "react-router";
import { V2_TEMPLATE_VERSION_QUERY } from "@react-client/routing/common/pathHelpers";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { V2_TEMPLATE_READ_TEST_IDS } from "@react-client/features/v2/admin_constructor/testIds";

export const V2TemplatePreviewPage = () => {
	const { templateId } = useParams<{ templateId: string }>();
	const [searchParams] = useSearchParams();
	const versionId = searchParams.get(V2_TEMPLATE_VERSION_QUERY);
	const { data: template } = useV2Template(templateId ?? "");

	if (!templateId) {
		return (
			<Flex flexDirection="column">
				<Header />
				<Typography variant="body2" sx={{ p: 2 }}>
					Не указан идентификатор шаблона
				</Typography>
			</Flex>
		);
	}

	return (
		<Flex
			flexDirection="column"
			flexGrow={1}
			minHeight="0"
			gap={0}
			data-test-id={V2_TEMPLATE_READ_TEST_IDS.page}
		>
			<Box data-test-id={V2_TEMPLATE_READ_TEST_IDS.header}>
				<Header
				leadingAccessory={
					<Flex gap={1} alignItems="center" wrap="wrap" minWidth="0">
						<Typography variant="subtitle2" component="span" fontWeight={600} noWrap>
							{template?.name ?? "Предпросмотр"}
						</Typography>
						<Spacer space={1} />
						<Chip size="small" variant="outlined" label="Предпросмотр формы" />
					</Flex>
				}
				/>
			</Box>
			<Flex
				flexDirection="column"
				flexGrow={1}
				minHeight="0px"
				sx={{ overflow: "auto", mx: "auto", width: "100%" }}
				data-test-id={V2_TEMPLATE_READ_TEST_IDS.formPreview}
			>
				<V2TemplateFormPreview
					templateId={templateId}
					initialVersionId={versionId}
				/>
			</Flex>
		</Flex>
	);
};
