import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useV2Dictionaries } from "@react-client/common/api/queries/v2-templates";
import { useEffect, useState } from "react";
import { V2DictionaryDetail } from "./V2DictionaryDetail";
import { V2DictionaryListPanel } from "./V2DictionaryListPanel";

type V2DictionaryWorkspaceProps = {
	initialDictionaryId?: string | null;
	onCreateRequest: () => void;
};

export function V2DictionaryWorkspace({
	initialDictionaryId,
	onCreateRequest,
}: V2DictionaryWorkspaceProps) {
	const { data: dictionaries = [], isLoading } = useV2Dictionaries();
	const [selectedId, setSelectedId] = useState<string | null>(
		initialDictionaryId ?? null,
	);
	const [quickFilter, setQuickFilter] = useState("");

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

	if (isLoading) {
		return (
			<Typography variant="body2" sx={{ p: 2 }}>
				Загрузка справочников…
			</Typography>
		);
	}

	return (
		<Box sx={{ display: "flex", height: "100%", minHeight: 0 }}>
			<V2DictionaryListPanel
				items={dictionaries}
				selectedId={selectedId}
				quickFilter={quickFilter}
				onQuickFilterChange={setQuickFilter}
				onSelect={setSelectedId}
				onCreate={onCreateRequest}
			/>
			<Box sx={{ flex: 1, minWidth: 0, minHeight: 0, overflow: "hidden" }}>
				{selectedId ? (
					<V2DictionaryDetail
						key={selectedId}
						dictionaryId={selectedId}
						layout="workspace"
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
			</Box>
		</Box>
	);
}
