import {
	type V2EditorHeaderActions,
	type V2EditorHeaderMeta,
	V2TemplateSchemaEditor,
} from "@react-client/features/v2_constructor/organisms/V2TemplateSchemaEditor";
import { Flex } from "@react-client/common/primitives/Flex";
import { Header } from "@react-client/features/navigation/organisms/Header";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "@react-client/features/v2_constructor/testIds";
import {
	pathForAdminV2TemplateRead,
	pathForPlaygroundV2TemplateRead,
	routes,
} from "@react-client/routing/routes";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { useCallback, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { Spacer } from "@react-client/common/primitives/Spacer";

function statusChipColor(
	status: string,
): "default" | "success" | "warning" {
	if (status === "published") return "success";
	if (status === "draft") return "warning";
	return "default";
}

export const V2TemplateSchemaEditorPage = () => {
	const { templateId } = useParams<{ templateId: string }>();
	const navigate = useNavigate();
	const { pathname } = useLocation();

	const [headerMeta, setHeaderMeta] = useState<V2EditorHeaderMeta | null>(null);
	const [headerActions, setHeaderActions] = useState<V2EditorHeaderActions | null>(
		null,
	);
	const onHeaderMetaChange = useCallback((m: V2EditorHeaderMeta | null) => {
		setHeaderMeta(m);
	}, []);
	const onHeaderActionsChange = useCallback((a: V2EditorHeaderActions | null) => {
		setHeaderActions(a);
	}, []);

	const listHref =
		pathname.includes(`${routes.admin.rootPath}/`) || pathname.startsWith(routes.admin.rootPath)
			? routes.adminV2Schemas.rootPath
			: routes.playground.rootPath;

	const isAdminContext =
		pathname.includes(`${routes.admin.rootPath}/`) ||
		pathname.startsWith(routes.admin.rootPath);

	if (!templateId) {
		return (
			<Flex flexDirection="column">
				<Header />
				<Typography variant="body2">
					{isAdminContext
						? "Не указан идентификатор схемы"
						: "Не указан идентификатор шаблона"}
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
			data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.page}
		>
			<Box data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.header}>
				<Header
				leadingAccessory={
					headerMeta ? (
						<Flex
							gap={1}
							alignItems="center"
							wrap="wrap"
							minWidth="0"
							data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.headerMeta}
						>
							<Typography variant="subtitle2" component="span" fontWeight={600} noWrap>
								{headerMeta.title}
							</Typography>
							<Spacer space={1} />
							<Chip
								size="small"
								variant="outlined"
								label={`Черновик v${headerMeta.versionNumber}`}
							/>
						</Flex>
					) : null
				}
			>
				{headerActions ? (
					<Flex
						gap={4}
						alignItems="center"
						wrap="wrap"
						data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.headerActions}
					>
						<Button
							variant="outlined"
							startIcon={<OpenInNewIcon />}
							data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.btnPreview}
							onClick={() => {
								const path = isAdminContext
									? pathForAdminV2TemplateRead(templateId)
									: pathForPlaygroundV2TemplateRead(templateId);
								window.open(
									`${window.location.origin}${path}`,
									"_blank",
									"noopener,noreferrer",
								);
							}}
						>
							Предпросмотр
						</Button>

						<Button
							variant="outlined"
							disabled={headerActions.publishPending}
							data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.btnPublish}
							onClick={headerActions.onPublish}
						>
							Опубликовать
						</Button>
						<Button
							variant="contained"
							disabled={headerActions.savePending}
							data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.btnSave}
							onClick={headerActions.onSave}
						>
							Сохранить
						</Button>
					</Flex>
				) : null}
				</Header>
			</Box>
			<Flex flexDirection="column" flexGrow={1} minHeight="0" sx={{ minHeight: 480 }}>
				<V2TemplateSchemaEditor
					templateId={templateId}
					wording={isAdminContext ? "adminSchema" : "playgroundTemplate"}
					onHeaderMetaChange={onHeaderMetaChange}
					onHeaderActionsChange={onHeaderActionsChange}
				/>
			</Flex>
		</Flex>
	);
};
