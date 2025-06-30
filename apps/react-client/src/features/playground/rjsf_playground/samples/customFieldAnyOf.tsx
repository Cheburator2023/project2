import type { FieldProps } from "@rjsf/utils";
import type { Sample } from "./Sample";

function UiField(props: FieldProps) {
	const {
		idSchema: { $id },
		formData,
		onChange,
	} = props;
	const changeHandlerFactory = (fieldName: string) => (event: any) => {
		onChange(
			formData
				? { ...formData, [fieldName]: event.target.value }
				: { [fieldName]: event.target.value },
		);
	};
	return (
		<>
			<h4 data-test-id="custom-field-any-of--h4-0">Location</h4>
			<div
				style={{ display: "flex" }}
				data-test-id="custom-field-any-of--div-0"
			>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						width: "50%",
						margin: "1rem",
					}}
					data-test-id="custom-field-any-of--div-1"
				>
					<div
						className="form-group field field-string"
						data-test-id="custom-field-any-of--div-2"
					>
						<label
							className="control-label"
							htmlFor={`${$id}-city`}
							data-test-id="custom-field-any-of--label-0"
						>
							City
						</label>
						<input
							className="form-control"
							id={`${$id}-city`}
							required={false}
							placeholder=""
							type="text"
							value={formData?.city || ""}
							onChange={changeHandlerFactory("city")}
							data-test-id="custom-field-any-of--input-0"
						/>
					</div>
				</div>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						width: "50%",
						margin: "1rem",
					}}
					data-test-id="custom-field-any-of--div-3"
				>
					<div
						className="form-group field field-string"
						data-test-id="custom-field-any-of--div-4"
					>
						<label
							className="control-label"
							htmlFor={`${$id}-lat`}
							data-test-id="custom-field-any-of--label-1"
						>
							Latitude
						</label>
						<input
							className="form-control"
							id={`${$id}-lat`}
							type="number"
							value={formData?.lat || 0}
							onChange={changeHandlerFactory("lat")}
							data-test-id="custom-field-any-of--input-1"
						/>
					</div>
					<div
						className="form-group field field-string"
						data-test-id="custom-field-any-of--div-5"
					>
						<label
							className="control-label"
							htmlFor={`${$id}-lon`}
							data-test-id="custom-field-any-of--label-2"
						>
							Longitude
						</label>
						<input
							className="form-control"
							id={`${$id}-lon`}
							type="number"
							value={formData?.lon || 0}
							onChange={changeHandlerFactory("lon")}
							data-test-id="custom-field-any-of--input-2"
						/>
					</div>
				</div>
			</div>
		</>
	);
}

const customFieldAnyOf: Sample = {
	schema: {
		title: "Location",
		type: "object",
		anyOf: [
			{
				title: "City",
				properties: {
					city: {
						type: "string",
					},
				},
				required: ["city"],
			},
			{
				title: "Coordinates",
				properties: {
					lat: {
						type: "number",
					},
					lon: {
						type: "number",
					},
				},
				required: ["lat", "lon"],
			},
		],
	},
	uiSchema: {
		"ui:field": UiField,
	},
	formData: {},
};

export default customFieldAnyOf;
