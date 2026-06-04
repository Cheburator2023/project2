import Chip from "@mui/material/Chip";
import {
	V2_ANKETA_GLOBAL_STATUS_CHIP_COLOR,
	V2_ANKETA_SECTION_STATUS_CHIP_COLOR,
	type V2AnketaGlobalStatus,
	type V2AnketaSectionStatus,
} from "@smart-anketa/api-contract";
import { ANKETA_MOLECULE_TEST_IDS } from "./testIds";

type Props =
	| { kind: "global"; status: V2AnketaGlobalStatus }
	| { kind: "section"; status: V2AnketaSectionStatus };

export function AnketaSectionStatusChip(props: Props) {
	if (props.kind === "global") {
		return (
			<Chip
				size="small"
				label={props.status}
				color={V2_ANKETA_GLOBAL_STATUS_CHIP_COLOR[props.status]}
				variant="outlined"
				data-test-id={ANKETA_MOLECULE_TEST_IDS.statusChipGlobal}
				data-status={props.status}
			/>
		);
	}
	return (
		<Chip
			size="small"
			label={props.status}
			color={V2_ANKETA_SECTION_STATUS_CHIP_COLOR[props.status]}
			variant="outlined"
			data-test-id={ANKETA_MOLECULE_TEST_IDS.statusChipSection}
			data-status={props.status}
		/>
	);
}
