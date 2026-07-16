import Typography from "@mui/material/Typography";
import { useV2FormulaRegistry } from "@react-client/common/api/queries/v2-works";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { useTypicalWorksListDetailSplit } from "@react-client/features/v2/admin/hooks/useDictionaryListPanelWidth";
import { useEffect, useMemo, useState } from "react";
import {
	buildFormulaRegistryQuickFilterText,
	V2FormulaRegistryListPanel,
} from "./V2FormulaRegistryListPanel";
import { V2FormulaRegistryDetail } from "./V2FormulaRegistryDetail";

export type V2FormulaRegistryHeaderState = {
	title: string;
	subtitle: string;
};

type V2FormulaRegistryWorkspaceProps = {
	onHeaderChange?: (state: V2FormulaRegistryHeaderState | null) => void;
	onSelectedItemMetaChange?: (
		meta: {
			workId: string;
			templateId: string;
			templateVersionId: string;
		} | null,
	) => void;
};

function FormulaSplitResizeHandle({
	onResizeStart,
	active,
}: {
	onResizeStart: (event: React.MouseEvent) => void;
	active: boolean;
}) {
	return (
		<Flex
			role="separator"
			aria-orientation="vertical"
			aria-label="Изменить ширину панели формул"
			title="Потяните, чтобы изменить ширину"
			onMouseDown={onResizeStart}
			flexShrink={0}
			width="10px"
			height="100%"
			position="relative"
			zIndex={2}
			sx={{
				cursor: "col-resize",
				mx: "-4px",
				"&::after": {
					content: '""',
					position: "absolute",
					left: "50%",
					top: 0,
					bottom: 0,
					width: 2,
					transform: "translateX(-50%)",
					borderRadius: 1,
					bgcolor: "divider",
					opacity: active ? 0.55 : 0.2,
					transition: "opacity 0.15s",
				},
				"&:hover::after": {
					opacity: 0.45,
				},
			}}
		/>
	);
}

export function V2FormulaRegistryWorkspace({
	onHeaderChange,
	onSelectedItemMetaChange,
}: V2FormulaRegistryWorkspaceProps) {
	const [templateFilter, setTemplateFilter] = useState("");
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [quickFilter, setQuickFilter] = useState("");
	const { data, isLoading } = useV2FormulaRegistry({
		templateId: templateFilter || null,
	});
	const items = data?.items ?? [];
	const templateOptions = data?.templateOptions ?? [];
	const filteredItems = useMemo(() => {
		const query = quickFilter.trim().toLowerCase();
		if (!query) return items;
		return items.filter((item) =>
			buildFormulaRegistryQuickFilterText(item).toLowerCase().includes(query),
		);
	}, [items, quickFilter]);
	const {
		containerRef,
		listWidth,
		isResizing,
		onResizeStart,
	} = useTypicalWorksListDetailSplit();

	const selectedItem =
		filteredItems.find((item) => item.id === selectedId) ??
		items.find((item) => item.id === selectedId) ??
		null;

	useEffect(() => {
		if (!filteredItems.length) {
			setSelectedId(null);
			return;
		}
		if (!selectedId || !filteredItems.some((item) => item.id === selectedId)) {
			setSelectedId(filteredItems[0]?.id ?? null);
		}
	}, [filteredItems, selectedId]);

	useEffect(() => {
		if (!selectedItem) {
			onHeaderChange?.(null);
			onSelectedItemMetaChange?.(null);
			return;
		}
		onHeaderChange?.({
			title: selectedItem.workName,
			subtitle: `${selectedItem.templateName} · v${selectedItem.versionNumber} (${selectedItem.versionStatus}) · ${selectedItem.streamExecutor}`,
		});
		onSelectedItemMetaChange?.({
			workId: selectedItem.workId,
			templateId: selectedItem.templateId,
			templateVersionId: selectedItem.templateVersionId,
		});
	}, [onHeaderChange, onSelectedItemMetaChange, selectedItem]);

	useEffect(() => {
		return () => onHeaderChange?.(null);
	}, [onHeaderChange]);

	if (isLoading) {
		return (
			<Typography variant="body2" sx={{ p: 2 }}>
				Загрузка реестра формул…
			</Typography>
		);
	}

	return (
		<Flex
			ref={containerRef}
			flexDirection="row"
			height="100%"
			minHeight="0"
			width="100%"
			gap={4}
		>
			<Flex
				flexDirection="column"
				flexShrink={0}
				height="100%"
				minHeight="0"
				width={listWidth}
				minWidth="320px"
			>
				<V2FormulaRegistryListPanel
					items={filteredItems}
					totalCount={items.length}
					selectedId={selectedId}
					quickFilter={quickFilter}
					onQuickFilterChange={setQuickFilter}
					onSelect={setSelectedId}
					templateFilter={templateFilter}
					onTemplateFilterChange={setTemplateFilter}
					templateOptions={templateOptions}
				/>
			</Flex>

			<FormulaSplitResizeHandle
				onResizeStart={onResizeStart}
				active={isResizing}
			/>

			<Flex
				flexGrow={1}
				flexShrink={1}
				minWidth="260px"
				minHeight="0"
				height="100%"
			>
				{selectedItem ? (
					<V2FormulaRegistryDetail
						key={selectedItem.id}
						item={selectedItem}
						allItems={items}
						onSelectItem={setSelectedId}
						layout="workspace"
					/>
				) : (
					<Card height="100%" width="100%">
						<Flex
							height="100%"
							alignItems="center"
							justifyContent="center"
							sx={{ p: 3 }}
						>
							<Typography variant="body2" color="text.secondary" textAlign="center">
								{items.length === 0
									? "Формулы появятся после настройки типовых работ в схемах"
									: "Выберите формулу в списке слева"}
							</Typography>
						</Flex>
					</Card>
				)}
			</Flex>
		</Flex>
	);
}
