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
		<Flex
			className="nav nav-pills"
			wrap="wrap"
			gap={8}
			data-test-id="sample-selector--Flex-0"
		>
			{Object.keys(samples).map((label, i) => {
				return (
					<div
						key={i}
						role="presentation"
						className={selectedSample === label ? "active" : ""}
						data-test-id="sample-selector--div-0"
					>
						<a
							href="#"
							onClick={onLabelClick(label)}
							data-test-id="sample-selector--a-0"
						>
							{label}
						</a>
					</div>
				);
			})}
		</Flex>
	);
}
