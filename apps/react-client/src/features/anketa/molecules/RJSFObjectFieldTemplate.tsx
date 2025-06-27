import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import type { ObjectFieldTemplateProps } from "@rjsf/utils";

export const RJSFObjectFieldTemplate = ({
	title,
	description,
	properties,
	required,
	uiSchema,
}: ObjectFieldTemplateProps) => {
	return (
		<>
			{/* Render the title of the object/form, if provided */}
			{(uiSchema?.["ui:title"] || title) && (
				<Typography variant="h5" component="h2" gutterBottom>
					{title}
				</Typography>
			)}

			{/* Render the description of the object/form, if provided */}
			{description && (
				<Typography variant="body1" paragraph>
					{description}
				</Typography>
			)}

			{/* Use MUI Grid to lay out the properties */}
			<Grid container spacing={2}>
				{properties.map((element, index) => (
					// Each field is wrapped in a Grid item.
					// - xs={12}: Takes up the full width on extra-small screens (mobile).
					// - md={6}: Takes up half the width (6/12 columns) on medium screens and larger.
					<Grid size={6} key={index} style={{ marginBottom: "10px" }}>
						{/* element.content contains the fully rendered RJSF field */}
						{element.content}
					</Grid>
				))}
			</Grid>
		</>
	);
};
