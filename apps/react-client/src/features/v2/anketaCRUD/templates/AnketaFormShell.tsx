import SaveIcon from "@mui/icons-material/Save";
import { CircularProgress, IconButton, Typography } from "@mui/material";
import type { V2SchemaBindingDto } from "@smart-anketa/api-contract";
import { useMemo, type ReactNode } from "react";
import { FinalScoreCard } from "../organisms/FinalScoreCard";
import { V2AnketaSchemaForm } from "../organisms/V2AnketaSchemaForm";
import {
	useV2AnketaSchemaEngine,
	type V2AnketaSchemaEngineSource,
} from "../hooks/useV2AnketaSchemaEngine";
import { AnketaFormPageLayout } from "./AnketaFormPageLayout";

type Engine = ReturnType<typeof useV2AnketaSchemaEngine>;

type Props = {
	title?: string;
	source: V2AnketaSchemaEngineSource | null;
	engine?: Engine;
	schemaBinding?: V2SchemaBindingDto | null;
	readOnly?: boolean;
	onSave?: () => void;
	saveDisabled?: boolean;
	savePending?: boolean;
	headerExtra?: ReactNode;
	"data-test-id"?: string;
};

/** Общая оболочка анкеты: layout по макету + RJSF + итоговая оценка. */
export function AnketaFormShell({
	title,
	source,
	engine: engineProp,
	schemaBinding,
	readOnly,
	onSave,
	saveDisabled,
	savePending,
	headerExtra,
	"data-test-id": dataTestId = "anketa-form-shell",
}: Props) {
	const internalEngine = useV2AnketaSchemaEngine(engineProp ? null : source);
	const engine = engineProp ?? internalEngine;

	const headerActions = useMemo(
		() => (
			<>
				{headerExtra}
				{onSave ? (
					<IconButton
						onClick={onSave}
						disabled={saveDisabled || savePending}
						title="Сохранить"
					>
						{savePending ? (
							<CircularProgress size={20} />
						) : (
							<SaveIcon />
						)}
					</IconButton>
				) : null}
			</>
		),
		[headerExtra, onSave, saveDisabled, savePending],
	);

	return (
		<AnketaFormPageLayout
			data-test-id={dataTestId}
			headerActions={
				<>
					{title ? (
						<Typography
							variant="subtitle2"
							fontWeight={600}
							sx={{ mr: 1 }}
							noWrap
						>
							{title}
						</Typography>
					) : null}
					{headerActions}
				</>
			}
			main={
				<V2AnketaSchemaForm
					source={source}
					engine={engine}
					schemaBinding={schemaBinding}
					readOnly={readOnly}
				/>
			}
			sidebar={
				<FinalScoreCard
					summary={engine.summary}
					isLoading={engine.calculationLoading}
				/>
			}
		/>
	);
}

export function useAnketaFormEngine(source: V2AnketaSchemaEngineSource | null) {
	return useV2AnketaSchemaEngine(source);
}
