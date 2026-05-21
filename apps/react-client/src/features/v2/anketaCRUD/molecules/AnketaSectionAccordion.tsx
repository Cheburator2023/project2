import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Typography,
	type AccordionProps,
} from "@mui/material";
import type { ReactNode } from "react";

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
			<AccordionSummary expandIcon={<ExpandMoreIcon />}>
				<Typography variant={titleVariant} fontWeight={titleVariant === "h5" ? 700 : 600}>
					{title}
				</Typography>
			</AccordionSummary>
			<AccordionDetails sx={{ minWidth: 0, maxWidth: "100%", overflow: "hidden" }}>
				{children}
			</AccordionDetails>
		</Accordion>
	);
}
