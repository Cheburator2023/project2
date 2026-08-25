import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import type { PlanningLayoutPresetId } from "./planningDockLayout.util";

type Props = {
	open: boolean;
	confirmReplace?: boolean;
	onClose?: () => void;
	onSelect: (preset: PlanningLayoutPresetId) => void;
};

export function PlanningLayoutPresetDialog({
	open,
	confirmReplace = false,
	onClose,
	onSelect,
}: Props) {
	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>
				{confirmReplace ? "Сменить макет" : "Макет планирования"}
			</DialogTitle>
			<DialogContent>
				<Typography variant="body2" color="text.secondary">
					{confirmReplace
						? "Текущий лейаут будет заменён. Панели можно снова добавить из меню."
						: "Выберите стартовый лейаут. Потом панели можно переставлять и добавлять."}
				</Typography>
				<Spacer space={16} />
				<Flex gap={12}>
					<Card
						padding="16px"
						onClick={() => onSelect("roadmap")}
						sx={{ cursor: "pointer", flex: 1 }}
					>
						<Typography fontWeight={700}>Дорожная карта</Typography>
						<Spacer space={8} />
						<Typography variant="body2" color="text.secondary">
							Таблица и доска сверху, таймлайн снизу; релизы и исполнители
							вкладками.
						</Typography>
					</Card>
					<Card
						padding="16px"
						onClick={() => onSelect("empty")}
						sx={{ cursor: "pointer", flex: 1 }}
					>
						<Typography fontWeight={700}>С нуля</Typography>
						<Spacer space={8} />
						<Typography variant="body2" color="text.secondary">
							Только таблица задач. Остальные панели — из меню «Панели».
						</Typography>
					</Card>
				</Flex>
			</DialogContent>
			{onClose ? (
				<DialogActions>
					<Button onClick={onClose}>Отмена</Button>
				</DialogActions>
			) : null}
		</Dialog>
	);
}
