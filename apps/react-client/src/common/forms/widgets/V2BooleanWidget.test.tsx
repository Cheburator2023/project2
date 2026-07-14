import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { V2BooleanWidget } from "./V2BooleanWidget";

describe("V2BooleanWidget", () => {
	it("renders schema description under the checkbox label", () => {
		render(
			<V2BooleanWidget
				id="test-bool"
				name="testBool"
				value={false}
				label="Логический"
				onChange={() => {}}
				onBlur={() => {}}
				onFocus={() => {}}
				schema={{ type: "boolean", title: "Логический", description: "Пояснение" }}
				options={{}}
				uiSchema={{}}
				formContext={{}}
				disabled={false}
				readonly={false}
				required={false}
				registry={{} as never}
			/>,
		);

		expect(screen.getByText("Пояснение")).toBeTruthy();
	});

	it("does not render validation errors inside the widget", () => {
		const { container } = render(
			<V2BooleanWidget
				id="test-bool"
				name="testBool"
				value={false}
				label="Логический"
				onChange={() => {}}
				onBlur={() => {}}
				onFocus={() => {}}
				schema={{ type: "boolean", title: "Логический" }}
				options={{}}
				uiSchema={{}}
				formContext={{}}
				disabled={false}
				readonly={false}
				required
				rawErrors={["Поле обязательно для заполнения"]}
				registry={{} as never}
			/>,
		);

		expect(container.querySelector(".MuiFormHelperText-root")).toBeNull();
	});
});
