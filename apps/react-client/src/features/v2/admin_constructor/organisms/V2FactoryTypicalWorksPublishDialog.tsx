import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { usePublishV2FactoryTypicalWorks } from "@react-client/common/api/queries/v2-templates";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { downloadSchemaEditorSnapshotJson } from "@react-client/features/v2/admin_constructor/schemaEditor/schemaEditorSnapshotJson";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "@react-client/features/v2/admin_constructor/testIds";
import type { V2FactoryPublishTypicalWorksResponseDto } from "@smart-anketa/api-contract";
import { useEffect, useState } from "react";

type Props = {
	open: boolean;
	onClose: () => void;
	templateId: string;
	versionId: string | null;
};

function downloadJson(value: unknown, filename: string) {
	downloadSchemaEditorSnapshotJson(
		`${JSON.stringify(value, null, "\t")}\n`,
		filename,
	);
}

export function V2FactoryTypicalWorksPublishDialog({
	open,
	onClose,
	templateId,
	versionId,
}: Props) {
	const publish = usePublishV2FactoryTypicalWorks();
	const [result, setResult] =
		useState<V2FactoryPublishTypicalWorksResponseDto | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) {
			setResult(null);
			setError(null);
			return;
		}
		if (!versionId) return;

		let cancelled = false;
		setError(null);
		void publish
			.mutateAsync({ templateId, versionId, write: false })
			.then((data) => {
				if (!cancelled) setResult(data);
			})
			.catch((e: unknown) => {
				if (cancelled) return;
				setResult(null);
				setError(apiErrorMessage(e) || "Ошибка publish");
			});

		return () => {
			cancelled = true;
		};
		// Только при открытии / смене версии — не при каждом mutate identity.
		// eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
	}, [open, templateId, versionId]);

	const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
	const idPart = templateId.slice(0, 8);

	const handleWrite = async () => {
		if (!versionId) return;
		setError(null);
		try {
			const data = await publish.mutateAsync({
				templateId,
				versionId,
				write: true,
			});
			setResult(data);
			if (data.writeDisabledReason) {
				setError(data.writeDisabledReason);
			}
		} catch (e) {
			setError(apiErrorMessage(e) || "Ошибка записи");
		}
	};

	const report = result?.report;
	const pending = publish.isPending;

	return (
		<Dialog
			open={open}
			onClose={pending ? undefined : onClose}
			maxWidth="sm"
			fullWidth
			data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.factoryPublishDialog}
		>
			<DialogTitle>Publish типовых работ → factory</DialogTitle>
			<DialogContent>
				<Typography variant="body2" color="text.secondary">
					Аналог{" "}
					<code>npm run publish:factory-typical-works</code>: карточки активной
					версии → registry + catalog. Сначала dry-run, затем скачайте JSON или
					запишите на диск сервера (нужен{" "}
					<code>V2_FACTORY_PUBLISH_WRITE=1</code>).
				</Typography>
				<Spacer space={12} />
				{!versionId ? (
					<Alert severity="warning">Не выбрана версия схемы</Alert>
				) : null}
				{error ? (
					<>
						<Alert severity="error">{error}</Alert>
						<Spacer space={8} />
					</>
				) : null}
				{pending && !result ? (
					<Flex alignItems="center" gap={8}>
						<CircularProgress size={18} />
						<Typography variant="body2">Считаем dry-run…</Typography>
					</Flex>
				) : null}
				{report ? (
					<Flex flexDirection="column" gap={6}>
						<Typography variant="body2">
							Registry works: <strong>{report.registryWorks}</strong>
						</Typography>
						<Typography variant="body2">
							Catalog: +{report.catalogAdded} / ~{report.catalogUpdated} / ={" "}
							{report.catalogUnchanged} / preserved {report.catalogPreserved}
						</Typography>
						<Typography variant="body2">
							Dropped fields: {report.dropped.length}
							{report.legacyStreamCatalogRows
								? ` · legacy stream rows: ${report.legacyStreamCatalogRows}`
								: ""}
						</Typography>
						{result?.wrote ? (
							<>
								<Spacer space={8} />
								<Alert severity="success">
									Записано на диск сервера (registry + catalog).
								</Alert>
							</>
						) : null}
						{report.dropped.length > 0 ? (
							<>
								<Spacer space={8} />
								<Alert severity="warning">
									Есть потери при конвертации — скачайте отчёт и проверьте
									dropped.
								</Alert>
							</>
						) : null}
					</Flex>
				) : null}
			</DialogContent>
			<DialogActions sx={{ flexWrap: "wrap", gap: 1, px: 3, pb: 2 }}>
				<Button
					onClick={onClose}
					disabled={pending}
					data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.factoryPublishClose}
				>
					Закрыть
				</Button>
				<Button
					variant="outlined"
					startIcon={<FileDownloadOutlinedIcon />}
					disabled={!result || pending}
					onClick={() => {
						if (!result) return;
						downloadJson(
							{
								templateId,
								versionId,
								write: false,
								report: result.report,
								droppedSample: result.report.dropped.slice(0, 40),
							},
							`publish-factory-typical-works-report-${idPart}-${stamp}.json`,
						);
					}}
				>
					Отчёт
				</Button>
				<Button
					variant="outlined"
					startIcon={<FileDownloadOutlinedIcon />}
					disabled={!result || pending}
					onClick={() => {
						if (!result) return;
						downloadJson(
							result.registry,
							`v2-factory-template-typical-works.registry-${idPart}-${stamp}.json`,
						);
						downloadJson(
							result.catalog,
							`v2-factory-typical-works.snapshot-${idPart}-${stamp}.json`,
						);
					}}
					data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.factoryPublishDownload}
				>
					Скачать JSON
				</Button>
				<Button
					variant="contained"
					color="secondary"
					disabled={!versionId || pending}
					onClick={() => void handleWrite()}
					title={
						result?.writeAllowed
							? "Записать registry + catalog на диск сервера"
							: "Нужен V2_FACTORY_PUBLISH_WRITE=1 на сервере"
					}
					startIcon={
						pending ? <CircularProgress size={16} color="inherit" /> : undefined
					}
					data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.factoryPublishWrite}
				>
					Записать на диск
				</Button>
			</DialogActions>
		</Dialog>
	);
}
