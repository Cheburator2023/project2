import {
	type V2EditorHeaderActions,
	type V2EditorHeaderMeta,
	V2TemplateSchemaEditor,
} from "@react-client/features/v2/admin_constructor/organisms/V2TemplateSchemaEditor";
import { V2FactoryTypicalWorksPublishDialog } from "@react-client/features/v2/admin_constructor/organisms/V2FactoryTypicalWorksPublishDialog";
import { Flex } from "@react-client/common/primitives/Flex";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "@react-client/features/v2/admin_constructor/testIds";
import { toAbsoluteAppUrl } from "@react-client/routing/basename";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { V2TemplateVersionHeaderControls } from "@react-client/features/v2/admin_constructor/molecules/V2TemplateVersionHeaderControls";
import { v2TemplateVersionChipLabel } from "@react-client/features/v2/admin_constructor/utils/v2TemplateVersionLabels";
import { useCallback, useState } from "react";
import { useLocation, useParams, useSearchParams } from "react-router";
import { V2_TEMPLATE_VERSION_QUERY } from "@react-client/routing/common/pathHelpers";
import { commonRoutes as routes } from "@react-client/routing/common/routes";
import { Spacer } from "@react-client/common/primitives/Spacer";

export const V2TemplateSchemaEditorPage = () => {
	const { templateId } = useParams<{ templateId: string }>();
	const { pathname } = useLocation();
	const [searchParams, setSearchParams] = useSearchParams();
	const versionId = searchParams.get(V2_TEMPLATE_VERSION_QUERY);
	const initialRuleId = searchParams.get("ruleId");
	const initialPointer = searchParams.get("pointer");

	const setVersionId = useCallback(
		(id: string) => {
			setSearchParams(
				(prev) => {
					const next = new URLSearchParams(prev);
					next.set(V2_TEMPLATE_VERSION_QUERY, id);
					return next;
				},
				{ replace: true },
			);
		},
		[setSearchParams],
	);

	const [headerMeta, setHeaderMeta] = useState<V2EditorHeaderMeta | null>(null);
	const [headerActions, setHeaderActions] =
		useState<V2EditorHeaderActions | null>(null);
	const [factoryPublishOpen, setFactoryPublishOpen] = useState(false);
	const onHeaderMetaChange = useCallback((m: V2EditorHeaderMeta | null) => {
		setHeaderMeta(m);
	}, []);
	const onHeaderActionsChange = useCallback(
		(a: V2EditorHeaderActions | null) => {
			setHeaderActions(a);
		},
		[],
	);

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
					backTo={
						isAdminContext
							? routes.adminV2Schemas.rootPath
							: routes.playground.rootPath
					}
					leadingAccessory={
						headerMeta ? (
							<Flex
								gap={1}
								alignItems="center"
								wrap="wrap"
								minWidth="0"
								data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.headerMeta}
							>
								<Typography
									variant="subtitle2"
									component="span"
									fontWeight={600}
									noWrap
								>
									{headerMeta.title}
								</Typography>
								<Spacer space={1} />
								<Chip
									size="small"
									variant="outlined"
									color={
										headerMeta.status === "published"
											? "success"
											: headerMeta.status === "draft"
												? "warning"
												: "default"
									}
									label={v2TemplateVersionChipLabel(
										headerMeta.versionNumber,
										headerMeta.status,
										headerMeta.isSystemCurrent,
									)}
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
							{isAdminContext ? (
								<V2TemplateVersionHeaderControls
									templateId={templateId}
									versionId={versionId}
									onVersionIdChange={setVersionId}
								/>
							) : null}
							{isAdminContext ? (
								<>
									<Button
										variant="outlined"
										startIcon={<FileDownloadOutlinedIcon />}
										disabled={!headerActions.fullExportReady}
										data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.btnFullExport}
										title={
											headerActions.fullExportReady
												? "Скачать полный dump: schema + dictionaries + typicalWorks"
												: "Загрузка карточек типовых работ…"
										}
										onClick={headerActions.onFullExport}
									>
										Полный экспорт
									</Button>
									<Button
										variant="outlined"
										startIcon={<Inventory2OutlinedIcon />}
										disabled={!versionId}
										data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.btnFactoryPublish}
										title="Dry-run / запись registry + catalog (publish:factory-typical-works)"
										onClick={() => setFactoryPublishOpen(true)}
									>
										В factory…
									</Button>
								</>
							) : null}
							<Button
								variant="outlined"
								startIcon={<OpenInNewIcon />}
								data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.btnPreview}
								disabled={!headerActions.getExternalPreviewPath()}
								title="Открывает предпросмотр сохранённой версии на сервере"
								onClick={() => {
									const path = headerActions.getExternalPreviewPath();
									if (!path) return;
									window.open(
										toAbsoluteAppUrl(path),
										"_blank",
										"noopener,noreferrer",
									);
								}}
							>
								Превью
							</Button>

							{isAdminContext && headerActions.canActivateAsCurrent ? (
								<Button
									variant="outlined"
									disabled={headerActions.activatePending}
									data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.btnActivate}
									title="Опубликует черновик при необходимости и сделает версию актуальной схемой системы"
									onClick={headerActions.onActivateAsCurrent}
									startIcon={
										headerActions.activatePending ? (
											<CircularProgress size={16} color="inherit" />
										) : undefined
									}
								>
									{headerActions.activatePending
										? "Публикация…"
										: "Сделать актуальной"}
								</Button>
							) : null}
							<Button
								variant="contained"
								disabled={headerActions.savePending}
								data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.btnSave}
								onClick={headerActions.onSave}
								startIcon={
									headerActions.savePending ? (
										<CircularProgress size={16} color="inherit" />
									) : undefined
								}
							>
								{headerActions.savePending ? "Сохранение…" : "Сохранить"}
							</Button>
						</Flex>
					) : null}
				</Header>
			</Box>
			<Flex
				flexDirection="column"
				flexGrow={1}
				minHeight="0"
				sx={{ minHeight: 480 }}
			>
				<V2TemplateSchemaEditor
					templateId={templateId}
					initialVersionId={versionId}
					initialRuleId={initialRuleId}
					initialPointer={initialPointer}
					onVersionIdChange={setVersionId}
					wording={isAdminContext ? "adminSchema" : "playgroundTemplate"}
					onHeaderMetaChange={onHeaderMetaChange}
					onHeaderActionsChange={onHeaderActionsChange}
				/>
			</Flex>
			{isAdminContext ? (
				<V2FactoryTypicalWorksPublishDialog
					open={factoryPublishOpen}
					onClose={() => setFactoryPublishOpen(false)}
					templateId={templateId}
					versionId={versionId}
				/>
			) : null}
		</Flex>
	);
};
