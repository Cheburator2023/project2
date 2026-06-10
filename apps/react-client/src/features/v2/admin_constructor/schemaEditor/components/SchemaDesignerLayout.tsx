import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import Box from "@mui/material/Box";
import type { ReactNode } from "react";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { useSchemaEditor } from "../SchemaEditorContext";
import { SchemaPropertiesPanelColumn } from "../panels/SchemaPropertiesPanel";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../../testIds";
import { SchemaCanvasPanel, SchemaPalettePanel } from "./SchemaCanvasDnd";
import { SchemaPaletteDragLayer } from "./SchemaPaletteDragLayer";

const PALETTE_WIDTH = 250;

function DesignerSidebarHeader({
	title,
	action,
}: {
	title: string;
	action: ReactNode;
}) {
	return (
		<Box
			sx={{
				flexShrink: 0,
				px: 1,
				py: 0.75,
				borderBottom: 1,
				borderColor: "divider",
				display: "flex",
				alignItems: "center",
				gap: 0.5,
				minHeight: 40,
			}}
		>
			<Typography
				variant="caption"
				fontWeight={700}
				sx={{ flex: 1, minWidth: 0 }}
			>
				{title}
			</Typography>
			{action}
		</Box>
	);
}

/** Конструктор: palette слева (сворачивается), холст по центру, properties справа при выборе поля. */
export function SchemaDesignerLayout() {
	const { selectedPointer, setSelectedPointer } = useSchemaEditor();
	const [paletteOpen, setPaletteOpen] = useState(true);

	const showProperties = Boolean(selectedPointer);

	return (
		<>
			<SchemaPaletteDragLayer />
			<Box
				sx={{
					flex: 1,
					minHeight: 0,
					display: "flex",
					overflow: "hidden",
				}}
			>
			{!paletteOpen ? (
				<Box
					sx={{
						flexShrink: 0,
						width: 28,
						borderRight: 1,
						borderColor: "divider",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						pt: 0.5,
					}}
				>
					<IconButton
						size="small"
						title="Показать типы полей"
						onClick={() => setPaletteOpen(true)}
						aria-label="Показать палитру"
					>
						<ChevronRightIcon fontSize="small" />
					</IconButton>
				</Box>
			) : (
				<Box
					data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.panelPalette}
					sx={{
						flexShrink: 0,
						width: PALETTE_WIDTH,
						display: "flex",
						flexDirection: "column",
						minHeight: 0,
						borderRight: 1,
						borderColor: "divider",
						bgcolor: "background.default",
					}}
				>
					<DesignerSidebarHeader
						title="Типы полей"
						action={
							<IconButton
								size="small"
								title="Скрыть палитру"
								onClick={() => setPaletteOpen(false)}
								aria-label="Скрыть палитру"
							>
								<ChevronLeftIcon fontSize="small" />
							</IconButton>
						}
					/>
					<Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
						<SchemaPalettePanel embedded />
					</Box>
				</Box>
			)}

			<Box
				sx={{
					flex: 1,
					minWidth: 0,
					minHeight: 0,
					display: "flex",
					flexDirection: "column",
					overflow: "hidden",
				}}
			>
				<SchemaCanvasPanel embedded />
			</Box>

			{showProperties ? (
				<SchemaPropertiesPanelColumn
					header={
						<DesignerSidebarHeader
							title="Свойства"
							action={
								<IconButton
									size="small"
									title="Закрыть и снять выделение"
									onClick={() => setSelectedPointer(null)}
									aria-label="Закрыть свойства"
								>
									<CloseIcon fontSize="small" />
								</IconButton>
							}
						/>
					}
				/>
			) : null}
			</Box>
		</>
	);
}
