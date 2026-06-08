import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import {
	useV2Templates,
	useV2TemplateVersions,
} from "@react-client/common/api/queries/v2-templates";
import { Flex } from "@react-client/common/primitives/Flex";
import { v2TemplateVersionChipLabel } from "@react-client/features/v2/admin_constructor/utils/v2TemplateVersionLabels";
import { useMemo } from "react";

type V2TemplateVersionHeaderControlsProps = {
	templateId: string;
	versionId: string | null;
	onVersionIdChange: (versionId: string) => void;
};

export function V2TemplateVersionHeaderControls({
	templateId,
	versionId,
	onVersionIdChange,
}: V2TemplateVersionHeaderControlsProps) {
	const { data: versions } = useV2TemplateVersions(templateId);
	const { data: templates } = useV2Templates();

	const systemCurrentVersionId = useMemo(() => {
		const holder = templates?.find((t) => t.currentVersionId);
		return holder?.currentVersionId ?? null;
	}, [templates]);

	const sortedVersions = useMemo(
		() =>
			[...(versions ?? [])].sort((a, b) => b.versionNumber - a.versionNumber),
		[versions],
	);

	return (
		<Flex gap={1} alignItems="center" wrap="wrap">
			<FormControl size="small" sx={{ minWidth: 220 }}>
				<Select
					labelId="v2-template-version-select-label"
					label="Версия схемы"
					value={versionId ?? ""}
					onChange={(e) => onVersionIdChange(String(e.target.value))}
					disabled={!sortedVersions.length}
				>
					{sortedVersions.map((v) => (
						<MenuItem key={v.id} value={v.id}>
							{v2TemplateVersionChipLabel(
								v.versionNumber,
								v.status,
								v.id === systemCurrentVersionId,
							)}
						</MenuItem>
					))}
				</Select>
			</FormControl>
		</Flex>
	);
}
