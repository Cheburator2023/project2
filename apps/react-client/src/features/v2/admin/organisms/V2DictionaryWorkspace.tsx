import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useV2Dictionaries } from "@react-client/common/api/queries/v2-templates";
import type { V2DictionaryDto } from "@smart-anketa/api-contract";
import { useEffect, useState } from "react";
import {
	V2DictionaryDetail,
	type V2DictionaryHeaderState,
} from "./V2DictionaryDetail";
import { V2DictionaryListPanel } from "./V2DictionaryListPanel";
import { Flex } from "@react-client/common/primitives/Flex";

type V2DictionaryWorkspaceProps = {
	initialDictionaryId?: string | null;
	onCreateRequest?: () => void;
	showListCreateButton?: boolean;
	onSelectedDictionaryChange?: (dictionary: V2DictionaryDto | null) => void;
	onHeaderChange?: (state: V2DictionaryHeaderState | null) => void;
};

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
		<Flex flexDirection="row" height="100%" minHeight="0" gap={12}>
			<V2DictionaryListPanel
				items={dictionaries}
				selectedId={selectedId}
				quickFilter={quickFilter}
				onQuickFilterChange={setQuickFilter}
				onSelect={setSelectedId}
				onCreate={onCreateRequest}
				showCreateButton={showListCreateButton}
			/>
			<Flex flexGrow={1} minHeight="0" sx={{ overflow: "hidden" }} gap={1}>
				{selectedId ? (
					<V2DictionaryDetail
						key={selectedId}
						dictionaryId={selectedId}
						layout="workspace"
						onHeaderChange={onHeaderChange}
					/>
				) : (
					<Box
						sx={{
							height: "100%",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: "#8a93a3",
						}}
					>
						Выберите справочник слева
					</Box>
				)}
			</Flex>
		</Flex>
	);
}
