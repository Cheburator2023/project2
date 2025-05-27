import SearchIcon from "@mui/icons-material/Search";
import { Autocomplete, InputAdornment, TextField } from "@mui/material";
import { useState } from "react";

export function Search() {
	const [initialed, setInitialed] = useState(false);
	const [open, setOpen] = useState(false);
	const [inputValue, setInputValue] = useState("");
	const [items, setItems] = useState<any[]>([]);

	const searchHandler = (value: string) => {
		return window.worker?.searchInView(value);
	};

	const onSearch = (val: string) => {
		(async () => {
			const items = (await Promise.resolve(searchHandler(val))) ?? [];
			setItems(items);
			setOpen(true);
		})();
	};

	const [value, setValue] = useState<string | null>(items[0]);

	return (
		<Autocomplete
			value={value}
			onChange={(event: any, newValue: string | null) => {
				setValue(newValue);
			}}
			inputValue={inputValue}
			onInputChange={(event, newInputValue) => {
				onSearch(newInputValue);
				setInputValue(newInputValue);
			}}
			fullWidth
			options={items}
			renderOption={(props, option) => {
				return <div key={option.id} {...option} />;
			}}
			sx={{ width: 300 }}
			renderInput={(params) => (
				<TextField
					{...params}
					variant="outlined"
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
			)}
		/>
	);
}
