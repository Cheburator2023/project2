import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";

type Props = {
	questionnaireTitle?: string | null;
	resuming?: boolean;
	onReturnToAnketa: () => void;
	onGoToRegistry: () => void;
};

/**
 * Экран после авто-выхода из анкеты по бездействию (occupancy / edit-lock).
 * Пользователь остаётся на маршруте анкеты, пока не выберет действие.
 */
export function AnketaEditSessionTimeoutScreen({
	questionnaireTitle,
	resuming = false,
	onReturnToAnketa,
	onGoToRegistry,
}: Props) {
	const title = questionnaireTitle?.trim();

	return (
		<Flex
			flexDirection="column"
			flexGrow={1}
			minHeight="0"
			height="100%"
			alignItems="center"
			justifyContent="center"
			padding="24px"
		>
			<Card padding="32px" width="100%" sx={{ maxWidth: 520 }}>
				<Flex flexDirection="column" gap={8}>
					<Typography variant="h5" fontWeight={700}>
						Сессия редактирования завершена
					</Typography>
					<Typography variant="body1" color="text.secondary">
						Вы были неактивны 30 минут
						{title ? (
							<>
								{" "}
								в анкете «{title}»
							</>
						) : null}
						. Блокировка редактирования снята, чтобы другие пользователи могли
						открыть анкету.
					</Typography>
					<Spacer space={16} />
					<Flex gap={12} wrap="wrap">
						<Button
							variant="contained"
							disabled={resuming}
							onClick={onReturnToAnketa}
						>
							{resuming ? "Открываем…" : "Вернуться в анкету"}
						</Button>
						<Button
							variant="outlined"
							disabled={resuming}
							onClick={onGoToRegistry}
						>
							В реестр
						</Button>
					</Flex>
				</Flex>
			</Card>
		</Flex>
	);
}
