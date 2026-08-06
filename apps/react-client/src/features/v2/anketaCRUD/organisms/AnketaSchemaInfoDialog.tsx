import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import {
	formatV2SchemaBindingStatus,
	type V2SchemaBindingDto,
} from "@smart-anketa/api-contract";

type Props = {
	open: boolean;
	onClose: () => void;
	templateName?: string | null;
	schemaBinding?: V2SchemaBindingDto | null;
	"data-test-id"?: string;
};

function formatRuDateTime(value: string | null | undefined): string {
	if (!value) return "—";
	const date = new Date(value);
	if (!Number.isFinite(date.getTime())) return "—";
	return date.toLocaleString("ru-RU");
}

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<Flex flexDirection="column" gap={4}>
			<Typography variant="caption" color="text.secondary">
				{label}
			</Typography>
			<Typography variant="body2">{value}</Typography>
		</Flex>
	);
}

/** Информация о схеме, по которой создана анкета. */
export function AnketaSchemaInfoDialog({
	open,
	onClose,
	templateName,
	schemaBinding,
	"data-test-id": dataTestId = "anketa-schema-info-dialog",
}: Props) {
	const versionNumber = schemaBinding?.boundTemplateVersionNumber;
	const versionLabel =
		versionNumber != null ? `v${versionNumber}` : "—";
	const bindingStatus = schemaBinding?.status
		? formatV2SchemaBindingStatus(schemaBinding.status)
		: "—";

	return (
		<Dialog
			open={open}
			onClose={onClose}
			fullWidth
			maxWidth="sm"
			data-test-id={dataTestId}
		>
			<DialogTitle>Схема анкеты</DialogTitle>
			<DialogContent>
				<Flex flexDirection="column" gap={16}>
					<InfoRow
						label="Название схемы"
						value={templateName?.trim() || "—"}
					/>
					<InfoRow label="Версия схемы" value={versionLabel} />
					<InfoRow
						label="Дата создания схемы"
						value={formatRuDateTime(
							schemaBinding?.boundTemplateVersionCreatedAt,
						)}
					/>
					<InfoRow
						label="Дата изменения схемы"
						value={formatRuDateTime(
							schemaBinding?.boundTemplateVersionUpdatedAt,
						)}
					/>
					<InfoRow label="Привязка" value={bindingStatus || "—"} />
				</Flex>
				{schemaBinding?.message?.trim() ? (
					<>
						<Spacer space={16} />
						<Typography variant="body2" color="text.secondary">
							{schemaBinding.message}
						</Typography>
					</>
				) : null}
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Закрыть</Button>
			</DialogActions>
		</Dialog>
	);
}
