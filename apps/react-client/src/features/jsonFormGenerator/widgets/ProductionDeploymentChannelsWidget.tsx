import {
	Checkbox,
	FormControl,
	FormControlLabel,
	FormGroup,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import type { WidgetProps } from "@rjsf/utils";
import type React from "react";

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
		<Stack
			spacing={2}
			data-test-id="production-deployment-channels-widget--Stack-0"
		>
			<FormControl
				fullWidth
				data-test-id="production-deployment-channels-widget--FormControl-0"
			>
				<Typography
					variant="subtitle1"
					gutterBottom
					data-test-id="production-deployment-channels-widget--Typography-0"
				>
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
					slotProps={{ input: { readOnly: readonly } }}
					data-test-id="production-deployment-channels-widget--TextField-0"
				/>
				{/* Checkboxes */}
				<FormGroup data-test-id="production-deployment-channels-widget--FormGroup-0">
					{deploymentChannels.map((channel) => (
						<FormControlLabel
							key={channel}
							control={
								<Checkbox
									checked={value.includes(channel)}
									onChange={() => handleChange(channel)}
									disabled={disabled || readonly}
									data-test-id="production-deployment-channels-widget--Checkbox-0"
								/>
							}
							label={channel}
							data-test-id="production-deployment-channels-widget--FormControlLabel-0"
						/>
					))}
				</FormGroup>
			</FormControl>
		</Stack>
	);
};

export default ProductionDeploymentChannelsWidget;
