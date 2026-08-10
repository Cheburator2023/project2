import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import type { V2TypicalWorkSchemaSyncAffectedWorkDto } from "@smart-anketa/api-contract";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";

/** Правка схемы, из-за которой понадобилась синхронизация. */
export type SchemaWorkSyncChangeDto = {
	/** «Класс моделей» — название поля. */
	fieldName: string;
	/** «перенесено: Модельный сервис → Система-источник». */
	summary: string;
};

type SchemaWorkSyncConfirmDialogProps = {
	open: boolean;
	pending?: boolean;
	changes: SchemaWorkSyncChangeDto[];
	affectedWorks: V2TypicalWorkSchemaSyncAffectedWorkDto[];
	onConfirm: () => void;
	onDismiss: () => void;
};

export function describeAffectedWorkImpact(
	work: V2TypicalWorkSchemaSyncAffectedWorkDto,
): string {
	const parts: string[] = [];
	if (work.rulesUpdated > 0) {
		parts.push(`условия появления обновлены: ${work.rulesUpdated}`);
	}
	if (work.rulesRemoved > 0) {
		parts.push(`условия появления удалены: ${work.rulesRemoved}`);
	}
	if (work.laborParamsUpdated > 0) {
		parts.push(`параметры трудоёмкости обновлены: ${work.laborParamsUpdated}`);
	}
	if (work.laborParamsRemoved > 0) {
		parts.push(`параметры трудоёмкости удалены: ${work.laborParamsRemoved}`);
	}
	if (work.formulaInvalidated) {
		parts.push("формулу потребуется проверить");
	}
	return parts.length > 0 ? parts.join(" · ") : "привязки к полям обновятся";
}

export function SchemaWorkSyncConfirmDialog({
	open,
	pending = false,
	changes,
	affectedWorks,
	onConfirm,
	onDismiss,
}: SchemaWorkSyncConfirmDialogProps) {
	return (
		<Dialog
			open={open}
			onClose={pending ? undefined : onDismiss}
			maxWidth="sm"
			fullWidth
		>
			<DialogTitle>Обновить типовые работы под изменённую схему?</DialogTitle>
			<DialogContent>
				<Typography variant="body2" color="text.secondary">
					Изменения в схеме затрагивают настройки типовых работ. Без обновления
					работы потеряют привязку к полям и перестанут срабатывать.
				</Typography>

				{changes.length > 0 ? (
					<>
						<Spacer height={12} />
						<Typography variant="subtitle2">Что изменилось в схеме</Typography>
						<Spacer height={4} />
						<Flex flexDirection="column" gap={4}>
							{changes.map((change) => (
								<Typography
									key={`${change.fieldName}:${change.summary}`}
									variant="body2"
								>
									«{change.fieldName}» — {change.summary}
								</Typography>
							))}
						</Flex>
					</>
				) : null}

				<Spacer height={12} />
				<Typography variant="subtitle2">
					Затронутые работы: {affectedWorks.length}
				</Typography>
				<Spacer height={4} />
				<Flex flexDirection="column" gap={6}>
					{affectedWorks.map((work) => (
						<Card
							key={`${work.workId}:${work.streamExecutor}`}
							padding="8px 10px"
						>
							<Typography variant="body2" fontWeight={600}>
								{work.workName}
							</Typography>
							<Typography variant="caption" color="text.secondary">
								{work.streamExecutor} · {describeAffectedWorkImpact(work)}
							</Typography>
						</Card>
					))}
				</Flex>
			</DialogContent>
			<DialogActions>
				<Button
					onClick={onDismiss}
					disabled={pending}
					title="Схема останется изменённой, работы — прежними. Синхронизировать можно позже."
				>
					Оставить как есть
				</Button>
				<Button variant="contained" disabled={pending} onClick={onConfirm}>
					Обновить работы
				</Button>
			</DialogActions>
		</Dialog>
	);
}
