import SearchIcon from "@mui/icons-material/Search";
import { InputAdornment, TextField } from "@mui/material";
import type { GridApi } from "ag-grid-community";
import { useGlobalSettingsStore } from "@react-client/common/store/globalSettingsStore";
import type { ChangeEvent } from "react";

const filterInputId = "grid_quick_filter_text_box_home";

type SearchInputProps = {
	/** Локальный API грида (предпочтительно для v1 — не зависит от чужого setGridApi). */
	gridApi?: GridApi | null;
	placeholder?: string;
	inputId?: string;
};

export function SearchInput({
	gridApi: gridApiProp,
	placeholder = "Поиск",
	inputId = filterInputId,
}: SearchInputProps = {}) {
	const storeGridApi = useGlobalSettingsStore((s) => s.gridApi);
	const gridApi = gridApiProp ?? storeGridApi;

	const onFilterTextBoxChanged = (event: ChangeEvent<HTMLInputElement>) => {
		gridApi?.setGridOption("quickFilterText", event.target.value);
	};

	return (
		<TextField
			id={inputId}
			onChange={onFilterTextBoxChanged}
			placeholder={placeholder}
			fullWidth
			slotProps={{
				input: {
					startAdornment: (
						<InputAdornment
							position="start"
							data-test-id="search-input--InputAdornment-0"
						>
							<SearchIcon data-test-id="search-input--SearchIcon-0" />
						</InputAdornment>
					),
				},
			}}
			data-test-id="search-input--TextField-0"
		/>
	);
}
