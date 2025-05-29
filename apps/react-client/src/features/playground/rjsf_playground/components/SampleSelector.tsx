import { Flex } from "@react-client/common/primitives/Flex";
import { MouseEvent } from "react";
import { samples } from "../samples";

export interface SampleSelectorProps {
	onSelected: (sampleName: string) => void;
	selectedSample: string;
}

export default function SampleSelector({
	onSelected,
	selectedSample,
}: SampleSelectorProps) {
	function onLabelClick(label: string) {
		return (event: MouseEvent) => {
			event.preventDefault();
			setTimeout(() => onSelected(label), 0);
		};
	}

	return (
		<Flex className="nav nav-pills" wrap="wrap" gap={8}>
			{Object.keys(samples).map((label, i) => {
				return (
					<div
						key={i}
						role="presentation"
						className={selectedSample === label ? "active" : ""}
					>
						<a href="#" onClick={onLabelClick(label)}>
							{label}
						</a>
					</div>
				);
			})}
		</Flex>
	);
}
