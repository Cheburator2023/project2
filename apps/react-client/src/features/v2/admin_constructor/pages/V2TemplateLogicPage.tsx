import {
	type V2EditorHeaderActions,
	type V2EditorHeaderMeta,
	V2TemplateSchemaEditor,
} from "@react-client/features/v2/admin_constructor/organisms/V2TemplateSchemaEditor";
import { Flex } from "@react-client/common/primitives/Flex";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { V2_TEMPLATE_LOGIC_TEST_IDS } from "@react-client/features/v2/admin_constructor/testIds";
import {
	V2_TEMPLATE_VERSION_QUERY,
	pathForAdminV2Template,
	pathForPlaygroundV2Template,
	routes,
} from "@react-client/routing/version/v1/routing/routes";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { useCallback, useMemo, useState } from "react";
import { useLocation, useParams, useSearchParams } from "react-router";
import { Spacer } from "@react-client/common/primitives/Spacer";

export const V2TemplateLogicPage = () => {
	const { templateId } = useParams<{ templateId: string }>();
	const { pathname } = useLocation();
	const [searchParams, setSearchParams] = useSearchParams();

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

	const isAdminContext =
		pathname.includes(`${routes.admin.rootPath}/`) ||
		pathname.startsWith(routes.admin.rootPath);

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

	const editorHref = useMemo(() => {
		if (!templateId) return null;
		return isAdminContext
			? pathForAdminV2Template(templateId, versionId)
			: pathForPlaygroundV2Template(templateId, versionId);
	}, [isAdminContext, templateId, versionId]);

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
			data-test-id={V2_TEMPLATE_LOGIC_TEST_IDS.page}
		>
		
				<Header
					leadingAccessory={
						headerMeta ? (
							<Flex
								gap={1}
								alignItems="center"
								wrap="wrap"
								minWidth="0"
								data-test-id={V2_TEMPLATE_LOGIC_TEST_IDS.headerMeta}
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
									label="Редактор логики"
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
							data-test-id={V2_TEMPLATE_LOGIC_TEST_IDS.headerActions}
						>
							{editorHref ? (
								<Button
									variant="outlined"
									component="a"
									href={editorHref}
									data-test-id={V2_TEMPLATE_LOGIC_TEST_IDS.btnEditor}
								>
									Конструктор
								</Button>
							) : null}
							<Button
								variant="contained"
								disabled={headerActions.savePending}
								data-test-id={V2_TEMPLATE_LOGIC_TEST_IDS.btnSave}
								onClick={headerActions.onSave}
							>
								Сохранить
							</Button>
						</Flex>
					) : null}
				</Header>

				<V2TemplateSchemaEditor
					templateId={templateId}
					initialVersionId={versionId}
					onVersionIdChange={setVersionId}
					wording={isAdminContext ? "adminSchema" : "playgroundTemplate"}
					layoutMode="logic-only"
					initialRuleId={initialRuleId}
					initialPointer={initialPointer}
					onHeaderMetaChange={onHeaderMetaChange}
					onHeaderActionsChange={onHeaderActionsChange}
				/>
		</Flex>
	);
};
