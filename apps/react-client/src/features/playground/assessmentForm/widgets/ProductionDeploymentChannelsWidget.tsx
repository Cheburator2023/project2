import {
	Checkbox,
	FormControl,
	FormControlLabel,
	FormGroup,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import { WidgetProps } from "@rjsf/utils";
import React from "react";

const deploymentChannels = [
	"Батч",
	"Батч+загрузка данных потребителю",
	"Батч + Онлайн",
	"Онлайн",
	"Онлайн gpu",
	"Стриминг",
	"Мобильные устройства",
	"LLM",
	"Гео-сервисы",
	"Внедрение в облаке",
	"Графовая платформа",
];

const ProductionDeploymentChannelsWidget: React.FC<WidgetProps> = ({
	value = [],
	onChange,
	disabled,
	readonly,
}) => {
	const handleChange = (channel: string) => {
		const newValue = value.includes(channel)
			? value.filter((v: string) => v !== channel)
			: [...value, channel];
		onChange(newValue);
	};

	const getSummaryText = () => {
		if (!value || value.length === 0) {
			return "Не требуется";
		}
		return `Выбрано каналов внедрения: ${value.length}`;
	};

	return (
		<Stack spacing={2}>
			<FormControl fullWidth>
				<Typography variant="subtitle1" gutterBottom>
					Каналы внедрения моделей
				</Typography>

				{/* Summary input */}
				<TextField
					value={getSummaryText()}
					disabled
					fullWidth
					variant="outlined"
					size="small"
					sx={{ mb: 2 }}
				/>

				{/* Checkboxes */}
				<FormGroup>
					{deploymentChannels.map((channel) => (
						<FormControlLabel
							key={channel}
							control={
								<Checkbox
									checked={value.includes(channel)}
									onChange={() => handleChange(channel)}
									disabled={disabled || readonly}
								/>
							}
							label={channel}
						/>
					))}
				</FormGroup>
			</FormControl>
		</Stack>
	);
};

export default ProductionDeploymentChannelsWidget;
