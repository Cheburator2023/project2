import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { resolveEffectiveWorkArchComponentType } from "@react-client/features/v2/admin_constructor/schemaEditor/panels/typicalWorksPanel/schemaWorkParameters";
import type { V2TypicalWorkListItemDto } from "@smart-anketa/api-contract";
import { useEffect } from "react";

export type V2TypicalWorkHeaderState = {
	title: string;
	archComponentType: string;
};

type V2TypicalWorkDetailProps = {
	work: V2TypicalWorkListItemDto;
	layout?: "workspace";
	onHeaderChange?: (state: V2TypicalWorkHeaderState | null) => void;
};

export function V2TypicalWorkDetail({
	work,
	layout = "workspace",
	onHeaderChange,
}: V2TypicalWorkDetailProps) {
	useEffect(() => {
		onHeaderChange?.({
			title: work.name,
			archComponentType: work.archComponentType,
		});
	}, [onHeaderChange, work.archComponentType, work.name]);

	useEffect(() => {
		return () => onHeaderChange?.(null);
	}, [onHeaderChange]);

	return (
		<Card
			height="100%"
			width="100%"
			padding={layout === "workspace" ? "16px" : "12px"}
			sx={{ overflow: "auto" }}
		>
			<Flex flexDirection="column" gap={16}>
				<Box>
					<Typography variant="overline" color="text.secondary">
						Карточка работы
					</Typography>
					<Typography variant="h6" fontWeight={700} sx={{ mt: 0.5 }}>
						{work.name}
					</Typography>
				</Box>

				<Divider />

				<Box>
					<Typography variant="subtitle2" fontWeight={700} gutterBottom>
						Атрибуты
					</Typography>
					<Flex flexDirection="column" gap={1.25}>
						<Flex justifyContent="space-between" gap={8}>
							<Typography variant="body2" color="text.secondary">
								Тип компонента
							</Typography>
							<Typography variant="body2" textAlign="right">
								{resolveEffectiveWorkArchComponentType(work.archComponentType)}
							</Typography>
						</Flex>
						<Flex justifyContent="space-between" gap={8}>
							<Typography variant="body2" color="text.secondary">
								Тип работы
							</Typography>
							<Typography variant="body2" textAlign="right">
								{work.workType ?? "—"}
							</Typography>
						</Flex>
					</Flex>
				</Box>

				<Box>
					<Typography variant="subtitle2" fontWeight={700} gutterBottom>
						Стримы
					</Typography>
					{work.streams.length === 0 ? (
						<Typography variant="body2" color="text.secondary">
							Работа ещё не назначена ни на один стрим. Назначение выполняется в
							редакторе логики шаблона.
						</Typography>
					) : (
						<Flex gap={0.75} wrap="wrap">
							{work.streams.map((stream) => (
								<Chip
									key={stream}
									size="small"
									label={stream}
									variant="outlined"
									sx={{ opacity: 0.85 }}
								/>
							))}
						</Flex>
					)}
				</Box>

				<Alert severity="info">
					Нормы, формула, параметры трудоёмкости и триггеры настраиваются в редакторе
					логики шаблона (вкладка «Логика») для каждого стрима отдельно.
				</Alert>
			</Flex>
		</Card>
	);
}
