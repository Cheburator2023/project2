import type { ArrayFieldTemplateProps } from "@rjsf/utils";
import type { Sample } from "./Sample";

function ArrayFieldTemplate(props: ArrayFieldTemplateProps) {
	const { className, items, canAdd, onAddClick } = props;
	return (
		<div className={className} data-test-id="custom-array--div-0">
			{items?.map((element: any) => (
				<div
					key={element.key}
					className={element.className}
					data-test-id="custom-array--div-1"
				>
					<div data-test-id="custom-array--div-2">{element.children}</div>
					{element.hasMoveDown && (
						<button
							onClick={element.onReorderClick(element.index, element.index + 1)}
							data-test-id="custom-array--button-0"
						>
							Down
						</button>
					)}
					{element.hasMoveUp && (
						<button
							onClick={element.onReorderClick(element.index, element.index - 1)}
							data-test-id="custom-array--button-1"
						>
							Up
						</button>
					)}
					<button
						onClick={element.onDropIndexClick(element.index)}
						data-test-id="custom-array--button-2"
					>
						Delete
					</button>
					<hr data-test-id="custom-array--hr-0" />
				</div>
			))}
			{canAdd && (
				<div className="row" data-test-id="custom-array--div-3">
					<p
						className="col-xs-3 col-xs-offset-9 array-item-add text-right"
						data-test-id="custom-array--p-0"
					>
						<button
							onClick={onAddClick}
							type="button"
							data-test-id="custom-array--button-3"
						>
							Custom +
						</button>
					</p>
				</div>
			)}
		</div>
	);
}

export const customArray: Sample = {
	schema: {
		title: "Custom array of strings",
		type: "array",
		items: {
			type: "string",
		},
	},
	formData: ["react", "jsonschema", "form"],
	templates: { ArrayFieldTemplate },
};

export default customArray;
