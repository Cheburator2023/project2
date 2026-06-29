import Typography from "@mui/material/Typography";
import { useV2Dictionaries } from "@react-client/common/api/queries/v2-templates";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { useDictionaryListPanelWidth } from "@react-client/features/v2/admin/hooks/useDictionaryListPanelWidth";
import type { V2DictionaryDto } from "@smart-anketa/api-contract";
import { useEffect, useState } from "react";
import {
	V2DictionaryDetail,
	type V2DictionaryHeaderState,
} from "./V2DictionaryDetail";
import { V2DictionaryListPanel } from "./V2DictionaryListPanel";

type V2DictionaryWorkspaceProps = {
	initialDictionaryId?: string | null;
	onCreateRequest?: () => void;
	showListCreateButton?: boolean;
	onSelectedDictionaryChange?: (dictionary: V2DictionaryDto | null) => void;
	onHeaderChange?: (state: V2DictionaryHeaderState | null) => void;
};

function DictionarySplitResizeHandle({
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
			aria-label="Изменить ширину панели справочников"
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

export function V2DictionaryWorkspace({
	initialDictionaryId,
	onCreateRequest,
	showListCreateButton = true,
	onSelectedDictionaryChange,
	onHeaderChange,
}: V2DictionaryWorkspaceProps) {
	const { data: dictionaries = [], isLoading } = useV2Dictionaries();
	const [selectedId, setSelectedId] = useState<string | null>(
		initialDictionaryId ?? null,
	);
	const [quickFilter, setQuickFilter] = useState("");
	const {
		width: listWidth,
		isResizing,
		onResizeStart,
	} = useDictionaryListPanelWidth();

	const selectedDictionary =
		dictionaries.find((d) => d.id === selectedId) ?? null;

	useEffect(() => {
		if (initialDictionaryId) setSelectedId(initialDictionaryId);
	}, [initialDictionaryId]);

	useEffect(() => {
		if (!dictionaries.length) {
			setSelectedId(null);
			return;
		}
		if (!selectedId || !dictionaries.some((d) => d.id === selectedId)) {
			setSelectedId(dictionaries[0]?.id ?? null);
		}
	}, [dictionaries, selectedId]);

	useEffect(() => {
		onSelectedDictionaryChange?.(selectedDictionary);
	}, [onSelectedDictionaryChange, selectedDictionary]);

	if (isLoading) {
		return (
			<Typography variant="body2" sx={{ p: 2 }}>
				Загрузка справочников…
			</Typography>
		);
	}

	return (
		<Flex flexDirection="row" height="100%" minHeight="0" width="100%" gap={4}>
			<Flex
				flexDirection="column"
				flexShrink={0}
				height="100%"
				minHeight="0"
				width={`${listWidth}px`}
			>
				<V2DictionaryListPanel
					items={dictionaries}
					selectedId={selectedId}
					quickFilter={quickFilter}
					onQuickFilterChange={setQuickFilter}
					onSelect={setSelectedId}
					onCreate={onCreateRequest}
					showCreateButton={showListCreateButton}
				/>
			</Flex>

			<DictionarySplitResizeHandle
				onResizeStart={onResizeStart}
				active={isResizing}
			/>

			<Flex flexGrow={1} minWidth="0" minHeight="0" height="100%">
				{selectedId ? (
					<V2DictionaryDetail
						key={selectedId}
						dictionaryId={selectedId}
						layout="workspace"
						onHeaderChange={onHeaderChange}
					/>
				) : (
					<Card height="100%" width="100%">
						<Flex
							height="100%"
							alignItems="center"
							justifyContent="center"
							sx={{ color: "text.secondary" }}
						>
							<Typography variant="body2">Выберите справочник слева</Typography>
						</Flex>
					</Card>
				)}
			</Flex>
		</Flex>
	);
}
