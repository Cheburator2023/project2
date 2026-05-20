import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import type { V2DictionaryBulkFailureDto } from "@smart-anketa/api-contract";

type Props = {
	open: boolean;
	title: string;
	successCount: number;
	successLabel: string;
	failed: V2DictionaryBulkFailureDto[];
	onClose: () => void;
};

export function V2DictionaryBulkResultDialog({
	open,
	title,
	successCount,
	successLabel,
	failed,
	onClose,
}: Props) {
	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>{title}</DialogTitle>
			<DialogContent>
				<DialogContentText sx={{ mb: failed.length ? 2 : 0 }}>
					{successLabel}: {successCount}
				</DialogContentText>
				{failed.length > 0 ? (
					<>
						<DialogContentText color="error">
							Не выполнено ({failed.length}):
						</DialogContentText>
						<List dense disablePadding>
							{failed.map((f) => (
								<ListItem key={f.id} disableGutters>
									<ListItemText
										primary={f.code ?? f.id}
										secondary={f.message}
									/>
								</ListItem>
							))}
						</List>
					</>
				) : null}
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} variant="contained">
					Закрыть
				</Button>
			</DialogActions>
		</Dialog>
	);
}
