import {
	type V2EditorHeaderActions,
	type V2EditorHeaderMeta,
	V2TemplateSchemaEditor,
} from "@react-client/features/v2/admin_constructor/organisms/V2TemplateSchemaEditor";
import { Flex } from "@react-client/common/primitives/Flex";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "@react-client/features/v2/admin_constructor/testIds";
import { openV2TemplateLogicPage } from "@react-client/features/v2/admin_constructor/utils/v2TemplateLogicPaths";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { V2TemplateVersionHeaderControls } from "@react-client/features/v2/admin_constructor/molecules/V2TemplateVersionHeaderControls";
import { v2TemplateVersionChipLabel } from "@react-client/features/v2/admin_constructor/utils/v2TemplateVersionLabels";
import { useCallback, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import {
	V2_TEMPLATE_VERSION_QUERY,
	pathForAdminV2TemplateRead,
	pathForPlaygroundV2TemplateRead,
} from "@react-client/routing/common/pathHelpers";
import { commonRoutes as routes } from "@react-client/routing/common/routes";
import { Spacer } from "@react-client/common/primitives/Spacer";

export const V2TemplateSchemaEditorPage = () => {
	const { templateId } = useParams<{ templateId: string }>();
	const navigate = useNavigate();
	const { pathname } = useLocation();
	const [searchParams, setSearchParams] = useSearchParams();
	const versionId = searchParams.get(V2_TEMPLATE_VERSION_QUERY);

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
							startIcon={<AccountTreeIcon />}
							data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.btnLogic}
							onClick={() =>
								openV2TemplateLogicPage({
									templateId,
									versionId,
									pathname,
								})
							}
						>
							Логика
						</Button>

						{isAdminContext && headerActions.canActivateAsCurrent ? (
							<Button
								variant="outlined"
								disabled={headerActions.activatePending}
								data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.btnActivate}
								title="Опубликует черновик при необходимости и сделает версию актуальной схемой системы"
								onClick={headerActions.onActivateAsCurrent}
							>
								Сделать актуальной
							</Button>
						) : null}
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
					initialVersionId={versionId}
					onVersionIdChange={setVersionId}
					wording={isAdminContext ? "adminSchema" : "playgroundTemplate"}
					onHeaderMetaChange={onHeaderMetaChange}
					onHeaderActionsChange={onHeaderActionsChange}
				/>
			</Flex>
		</Flex>
	);
};
