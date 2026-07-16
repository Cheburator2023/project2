import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import { Flex } from "@react-client/common/primitives/Flex";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { V2AdminButton } from "@react-client/features/v2/admin/atoms/V2AdminButton";
import {
	V2FormulaRegistryWorkspace,
	type V2FormulaRegistryHeaderState,
} from "@react-client/features/v2/admin/organisms/V2FormulaRegistryWorkspace";
import {
	pathForAdminV2FormulaInSchemaEditor,
	pathForAdminV2TypicalWork,
} from "@react-client/routing/common/pathHelpers";
import { commonRoutes as routes } from "@react-client/routing/common/routes";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

export function AdminV2FormulaRegistryPage() {
	const navigate = useNavigate();
	const [detailHeader, setDetailHeader] =
		useState<V2FormulaRegistryHeaderState | null>(null);
	const [selectedItemMeta, setSelectedItemMeta] = useState<{
		workId: string;
		templateId: string;
		templateVersionId: string;
	} | null>(null);

	const pageTitle = detailHeader?.title ?? routes.adminV2Formulas.name;

	const schemaEditorPath = useMemo(() => {
		if (!selectedItemMeta) return null;
		return pathForAdminV2FormulaInSchemaEditor(
			selectedItemMeta.templateId,
			selectedItemMeta.templateVersionId,
			selectedItemMeta.workId,
		);
	}, [selectedItemMeta]);

	return (
		<Flex
			flexDirection="column"
			flexGrow={1}
			minHeight="0"
			sx={{ height: "100%" }}
		>
			<Header
				title={pageTitle}
				leadingAccessory={
					detailHeader ? (
						<Typography
							component="span"
							variant="caption"
							sx={{ color: "text.secondary" }}
						>
							{detailHeader.subtitle}
						</Typography>
					) : undefined
				}
			>
				<Stack
					direction="row"
					spacing={1}
					alignItems="center"
					flexWrap="wrap"
					useFlexGap
				>
					{selectedItemMeta ? (
						<>
							<V2AdminButton
								variant="outlined"
								onClick={() =>
									navigate(pathForAdminV2TypicalWork(selectedItemMeta.workId))
								}
							>
								Открыть работу
							</V2AdminButton>
							{schemaEditorPath ? (
								<V2AdminButton
									onClick={() => navigate(schemaEditorPath)}
								>
									В редакторе{" "}
									<OpenInNewOutlinedIcon
										fontSize="small"
										sx={{ ml: 0.5, verticalAlign: "middle" }}
									/>
								</V2AdminButton>
							) : null}
						</>
					) : null}
				</Stack>
			</Header>

			<Flex
				flexDirection="column"
				flexGrow={1}
				minHeight="0"
				sx={{ overflow: "hidden" }}
			>
				<V2FormulaRegistryWorkspace
					onHeaderChange={setDetailHeader}
					onSelectedItemMetaChange={setSelectedItemMeta}
				/>
			</Flex>
		</Flex>
	);
}
