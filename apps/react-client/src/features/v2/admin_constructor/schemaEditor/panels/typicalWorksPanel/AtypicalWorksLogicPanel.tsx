import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import {
	collectAtypicalWorkArrayPaths,
	resolveStreamBlockExecutorsLabel,
	resolveStreamBlockRolesForTypicalWorkOutputPath,
	resolveStreamBlockRolesLabel,
	resolveStreamExecutorForTypicalWorkOutputPath,
	resolveV2AnketaSectionDisplayTitle,
} from "@smart-anketa/api-contract";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { useCallback, useMemo, useState } from "react";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../../../testIds";
import { useSchemaEditor } from "../../SchemaEditorContext";
import { useSchemaEditorUiStore } from "../../schemaEditorUiStore";
import { ArchWorkStreamRoleSettings } from "../../components/ArchWorkStreamRoleSettings";
import { streamBlockRolesToUiValue } from "../../components/StreamBlockRoleMultiSelect";
import { streamExecutorsToUiValue } from "../../components/StreamExecutorMultiSelect";
import { outputPathToPointer } from "../../typicalWorkBlockBinding";
import {
	patchUiOptionsAtPointer,
	readUiSchemaBranchAtPointer,
	resolveSchemaNode,
} from "../../../utils/schemaMutators";
import { pointerSegments } from "../../../utils/schemaPaths";
import { LogicWorksToolbar } from "./LogicWorksToolbar";
import {
	DEFAULT_SCOPE,
	type LogicWorksScope,
	workMatchesLogicScope,
} from "./typicalWorksAreas";

type AtypicalWorkBlockRow = {
	outputPath: string;
	pointer: string;
	title: string;
	streamExecutors: ReturnType<typeof resolveStreamExecutorForTypicalWorkOutputPath>;
	streamBlockRoles: ReturnType<typeof resolveStreamBlockRolesForTypicalWorkOutputPath>;
};

function resolveAtypicalWorkBlockTitle(
	jsonSchema: RJSFSchema,
	uiSchema: UiSchema | Record<string, unknown>,
	outputPath: string,
): string {
	const pointer = outputPathToPointer(outputPath);
	const segments = pointerSegments(pointer);
	const key = segments[segments.length - 1] ?? outputPath;
	const node = resolveSchemaNode(jsonSchema, segments);
	const base =
		typeof node?.title === "string" && node.title.trim()
			? node.title.trim()
			: key;
	const uiBranch = readUiSchemaBranchAtPointer(uiSchema, pointer);
	return resolveV2AnketaSectionDisplayTitle(base, uiBranch, key);
}

function collectAtypicalWorkBlocks(
	jsonSchema: RJSFSchema,
	uiSchema: UiSchema | Record<string, unknown>,
): AtypicalWorkBlockRow[] {
	return collectAtypicalWorkArrayPaths(uiSchema).map((outputPath) => ({
		outputPath,
		pointer: outputPathToPointer(outputPath),
		title: resolveAtypicalWorkBlockTitle(jsonSchema, uiSchema, outputPath),
		streamExecutors: resolveStreamExecutorForTypicalWorkOutputPath(
			uiSchema,
			outputPath,
		),
		streamBlockRoles: resolveStreamBlockRolesForTypicalWorkOutputPath(
			uiSchema,
			outputPath,
		),
	}));
}

export function AtypicalWorksLogicPanel() {
	const {
		jsonSchema,
		uiSchema,
		patchUiSchema,
		recordDraftHistory,
		setSelectedPointer,
	} = useSchemaEditor();
	const activateMainTab = useSchemaEditorUiStore((s) => s.activateMainTab);
	const [scope, setScope] = useState<LogicWorksScope>(DEFAULT_SCOPE);

	const allBlocks = useMemo(
		() => collectAtypicalWorkBlocks(jsonSchema, uiSchema),
		[jsonSchema, uiSchema],
	);

	const scopedBlocks = useMemo(
		() =>
			allBlocks.filter((block) =>
				workMatchesLogicScope(block.streamExecutors, scope),
			),
		[allBlocks, scope],
	);

	const patchBlockUiOptions = useCallback(
		(pointer: string, patch: Record<string, unknown>) => {
			recordDraftHistory();
			patchUiSchema(
				(prev) =>
					patchUiOptionsAtPointer(
						prev as Record<string, unknown>,
						pointer,
						patch,
					) as UiSchema,
				{ recordHistory: false },
			);
		},
		[patchUiSchema, recordDraftHistory],
	);

	const openBlockOnCanvas = useCallback(
		(pointer: string) => {
			setSelectedPointer(pointer);
			activateMainTab("designer");
		},
		[activateMainTab, setSelectedPointer],
	);

	return (
		<Flex
			flexDirection="column"
			height="100%"
			minHeight="0"
			data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.atypicalWorksPanel}
		>
			<LogicWorksToolbar scope={scope} onScopeChange={setScope} />
			<Box sx={{ flex: 1, minHeight: 0, overflow: "auto", px: 2.25, py: 2 }}>
				{allBlocks.length === 0 ? (
					<Typography variant="body2" color="text.secondary">
						В схеме нет блоков «Нетиповые работы». Добавьте arch-блок
						atypicalWork на холсте конструктора.
					</Typography>
				) : scopedBlocks.length === 0 ? (
					<Typography variant="body2" color="text.secondary">
						Нет блоков нетиповых работ для выбранной области (
						{scope.kind === "all"
							? "все области"
							: resolveStreamBlockExecutorsLabel(scope.streams)}
						).
					</Typography>
				) : (
					<Flex flexDirection="column" gap={12}>
						{scopedBlocks.map((block) => (
							<Card key={block.outputPath} padding="16px">
								<Flex
									alignItems="flex-start"
									justifyContent="space-between"
									gap={12}
									sx={{ flexWrap: "wrap" }}
								>
									<Box sx={{ minWidth: 0, flex: 1 }}>
										<Typography variant="subtitle2">{block.title}</Typography>
										<Typography
											variant="caption"
											color="text.secondary"
											sx={{ display: "block", mt: 0.25 }}
										>
											{block.outputPath}
										</Typography>
										{block.streamExecutors.length > 0 ||
										block.streamBlockRoles.length > 0 ? (
											<Typography
												variant="caption"
												color="text.secondary"
												sx={{ display: "block", mt: 0.5 }}
											>
												{block.streamExecutors.length > 0
													? resolveStreamBlockExecutorsLabel(
															block.streamExecutors,
														)
													: "стрим не задан"}
												{block.streamBlockRoles.length > 0
													? ` · ${resolveStreamBlockRolesLabel(block.streamBlockRoles)}`
													: ""}
											</Typography>
										) : null}
									</Box>
									<Button
										size="small"
										variant="outlined"
										onClick={() => openBlockOnCanvas(block.pointer)}
									>
										На холсте
									</Button>
								</Flex>
								<Spacer space={12} />
								<ArchWorkStreamRoleSettings
									streamExecutors={block.streamExecutors}
									streamBlockRoles={block.streamBlockRoles}
									uiSchema={uiSchema}
									streamHelperText="Стрим-исполнитель блока нетиповых работ."
									roleHelperText="Роли Keycloak для блока нетиповых работ."
									onStreamsChange={(codes) =>
										patchBlockUiOptions(block.pointer, {
											streamExecutor: streamExecutorsToUiValue(codes),
										})
									}
									onRolesChange={(roles) =>
										patchBlockUiOptions(block.pointer, {
											streamBlockRoles: streamBlockRolesToUiValue(roles),
										})
									}
								/>
							</Card>
						))}
					</Flex>
				)}
			</Box>
		</Flex>
	);
}
