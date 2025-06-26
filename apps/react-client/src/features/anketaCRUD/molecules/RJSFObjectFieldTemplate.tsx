import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { ObjectFieldTemplateProps } from "@rjsf/utils";

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
				<Typography
					variant="h5"
					component="h2"
					gutterBottom
					data-test-id="r-j-s-f-object-field-template--Typography-0"
				>
					{title}
				</Typography>
			)}
			{/* Render the description of the object/form, if provided */}
			{description && (
				<Typography
					variant="body1"
					paragraph
					data-test-id="r-j-s-f-object-field-template--Typography-1"
				>
					{description}
				</Typography>
			)}
			{/* Use MUI Grid to lay out the properties */}
			<Grid
				container
				spacing={2}
				data-test-id="r-j-s-f-object-field-template--Grid-0"
			>
				{properties.map((element, index) => (
					<Grid
						size={6}
						key={index}
						style={{ marginBottom: "10px" }}
						data-test-id="r-j-s-f-object-field-template--Grid-1"
					>
						{/* element.content contains the fully rendered RJSF field */}
						{element.content}
					</Grid>
				))}
			</Grid>
		</>
	);
};
