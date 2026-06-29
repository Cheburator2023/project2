import {
	Box,
	Button,
	Divider,
	FormControl,
	MenuItem,
	Typography,
} from "@mui/material";
import { SelectWithPlaceholder } from "@react-client/common/muiCustom/SelectWithPlaceholder";
import { AnketaSectionAccordion } from "@react-client/features/v2/anketaCRUD/molecules/AnketaSectionAccordion";
import { TableItem } from "@react-client/features/v2/anketaCRUD/organisms/TableItem";
import { useState } from "react";

const formGridSx = {
	display: "grid",
	gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
	gap: 2,
	width: "100%",
	maxWidth: "100%",
	minWidth: 0,
} as const;

export const GeneralInfo = () => {
	const [complexity, setComplexity] = useState("3");
	const [pilotRequired, setPilotRequired] = useState("Требуется MVP");
	const [serviceCreation, setServiceCreation] = useState("Нет");

	return (
		<AnketaSectionAccordion title="Общая информация">
			<Box
				sx={{
					p: 2,
					backgroundColor: "#fafafa",
					borderRadius: 3,
					width: "100%",
					maxWidth: "100%",
					minWidth: 0,
					boxSizing: "border-box",
				}}
			>
				<Box sx={formGridSx}>
					<FormControl fullWidth size="small">
						<SelectWithPlaceholder
							placeholder="Сложность постановки"
							value={complexity}
							onChange={(e) => setComplexity(e.target.value)}
							renderSelected={(selected) => {
								if (selected === "1") return "1 — Низкая ×1.00";
								if (selected === "2") return "2 — Средняя ×1.25";
								return "3 — Повышенная ×1.50";
							}}
						>
							<MenuItem value="1">1 — Низкая ×1.00</MenuItem>
							<MenuItem value="2">2 — Средняя ×1.25</MenuItem>
							<MenuItem value="3">3 — Повышенная ×1.50</MenuItem>
						</SelectWithPlaceholder>
					</FormControl>

					<FormControl fullWidth size="small">
						<SelectWithPlaceholder
							placeholder="Необходимость пилота"
							value={pilotRequired}
							onChange={(e) => setPilotRequired(e.target.value)}
						>
							<MenuItem value="Требуется MVP">Требуется MVP</MenuItem>
							<MenuItem value="Не требуется">Не требуется</MenuItem>
						</SelectWithPlaceholder>
					</FormControl>

					<FormControl fullWidth size="small">
						<SelectWithPlaceholder
							placeholder="Требуется создание ИС"
							value="Нет"
							disabled
						>
							<MenuItem value="Нет">Нет</MenuItem>
						</SelectWithPlaceholder>
					</FormControl>

					<FormControl fullWidth size="small">
						<SelectWithPlaceholder
							placeholder="Требуется создание сервиса"
							value={serviceCreation}
							onChange={(e) => setServiceCreation(e.target.value)}
						>
							<MenuItem value="Да">Да</MenuItem>
							<MenuItem value="Нет">Нет</MenuItem>
						</SelectWithPlaceholder>
					</FormControl>
				</Box>

				<Box
					sx={{
						display: "flex",
						flexWrap: "wrap",
						alignItems: "center",
						justifyContent: "space-between",
						gap: 1.5,
						mt: 2,
					}}
				>
					<Typography variant="caption">
						Общая неопределенность: Средняя ×1.14
					</Typography>
					<Button variant="outlined" color="primary" size="small" sx={{ flexShrink: 0 }}>
						Рассчитать неопределенность
					</Button>
				</Box>
			</Box>

			<Divider sx={{ my: 2 }} />

			<Box sx={{ minWidth: 0, maxWidth: "100%" }}>
				<Typography variant="h6" mb={1}>
					Модельный сервис
				</Typography>
				<Box
					sx={{
						p: { xs: 1.5, sm: 2 },
						backgroundColor: "#F9FAFB",
						borderRadius: 2,
						width: "100%",
						maxWidth: "100%",
						minWidth: 0,
						overflow: "hidden",
					}}
				>
					<TableItem
						name="model1827-v3"
						workType="Разработка"
						channels={["Батч", "Онлайн", "LLM"]}
						pilotRequired
						modelClass="Розничные модели CRM"
						controls={["КД", "ТМ", "ОК", "АК"]}
					/>
				</Box>
			</Box>

			<Box sx={{ mt: 2 }}>
				<Button variant="contained" color="primary" size="small">
					Завершить заполнение общей информации
				</Button>
			</Box>
		</AnketaSectionAccordion>
	);
};
