import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Typography,
	type AccordionProps,
} from "@mui/material";
import type { ReactNode } from "react";
import { ANKETA_MOLECULE_TEST_IDS } from "./testIds";

export function AnketaSectionAccordion({
	title,
	titleVariant = "h6",
	children,
	defaultExpanded = true,
	...accordionProps
}: {
	title: ReactNode;
	titleVariant?: "h5" | "h6";
	children: ReactNode;
	defaultExpanded?: boolean;
} & Omit<AccordionProps, "children" | "defaultExpanded">) {
	return (
		<Accordion
			data-test-id={ANKETA_MOLECULE_TEST_IDS.sectionAccordion}
			defaultExpanded={defaultExpanded}
			sx={{
				width: "100%",
				maxWidth: "100%",
				minWidth: 0,
				height: "auto !important",
				borderRadius: 3,
				boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
				overflow: "hidden",
				"&:before": { display: "none" },
			}}
			{...accordionProps}
		>
			<AccordionSummary
				expandIcon={<ExpandMoreIcon />}
				data-test-id={ANKETA_MOLECULE_TEST_IDS.sectionAccordionSummary}
			>
				{/* Вес заголовка единый, titleVariant влияет только на размер. */}
				<Typography variant={titleVariant} fontWeight={600}>
					{title}
				</Typography>
			</AccordionSummary>
			<AccordionDetails
				data-test-id={ANKETA_MOLECULE_TEST_IDS.sectionAccordionDetails}
				sx={{ minWidth: 0, maxWidth: "100%", overflow: "hidden" }}
			>
				{children}
			</AccordionDetails>
		</Accordion>
	);
}
