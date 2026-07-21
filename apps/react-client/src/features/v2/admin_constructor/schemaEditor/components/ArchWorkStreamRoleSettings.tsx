import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import type {
	V2ImplementationStreamCode,
	V2StreamBlockRoleCode,
} from "@smart-anketa/api-contract";
import { ExecutorStreamPresenceHint } from "../panels/typicalWorksPanel/ExecutorStreamPresenceLabel";
import { StreamBlockRoleMultiSelect } from "./StreamBlockRoleMultiSelect";
import { StreamExecutorMultiSelect } from "./StreamExecutorMultiSelect";

type ArchWorkStreamRoleSettingsProps = {
	streamExecutors: V2ImplementationStreamCode[];
	streamBlockRoles: V2StreamBlockRoleCode[];
	uiSchema?: unknown;
	streamHelperText: string;
	roleHelperText: string;
	onStreamsChange: (codes: V2ImplementationStreamCode[]) => void;
	onRolesChange: (roles: V2StreamBlockRoleCode[]) => void;
	streamPresence?: { all: boolean };
	onCreateStreamBlock?: () => void;
};

export function ArchWorkStreamRoleSettings({
	streamExecutors,
	streamBlockRoles,
	uiSchema,
	streamHelperText,
	roleHelperText,
	onStreamsChange,
	onRolesChange,
	streamPresence,
	onCreateStreamBlock,
}: ArchWorkStreamRoleSettingsProps) {
	return (
		<Box sx={{ mb: 1 }}>
			<StreamExecutorMultiSelect
				value={streamExecutors}
				uiSchema={uiSchema}
				allowEmpty
				onChange={onStreamsChange}
				helperText={streamHelperText}
			/>
			<StreamBlockRoleMultiSelect
				value={streamBlockRoles}
				onChange={onRolesChange}
				helperText={roleHelperText}
			/>
			{streamExecutors.length > 0 && streamPresence && onCreateStreamBlock ? (
				<Box sx={{ mt: 1 }}>
					<ExecutorStreamPresenceHint present={streamPresence.all} />
					{!streamPresence.all ? (
						<Button
							size="small"
							variant="outlined"
							sx={{ mt: 1 }}
							onClick={onCreateStreamBlock}
						>
							Создать стримовый блок
						</Button>
					) : null}
				</Box>
			) : null}
		</Box>
	);
}
