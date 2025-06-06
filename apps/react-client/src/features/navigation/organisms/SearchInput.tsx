import SearchIcon from "@mui/icons-material/Search";
import { InputAdornment, TextField } from "@mui/material";
import { useGlobalSettingsStore } from "@react-client/common/store/globalSettingsStore";

const filterInputId = "grid_quick_filter_text_box_home";

export function SearchInput() {
	const { gridApi } = useGlobalSettingsStore();

	const onFilterTextBoxChanged = () => {
		gridApi?.setGridOption(
			"quickFilterText",
			(document.getElementById(filterInputId) as HTMLInputElement).value,
		);
	};

	return (
		<TextField
			id={filterInputId}
			onChange={onFilterTextBoxChanged}
			placeholder="Поиск"
			fullWidth
			slotProps={{
				input: {
					startAdornment: (
						<InputAdornment position="start">
							<SearchIcon />
						</InputAdornment>
					),
				},
			}}
		/>
	);
}
