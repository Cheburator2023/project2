import { describe, expect, it } from "vitest";
import { v2AnketaFormWidgets } from "./v2PreviewFormWidgets";
import { TextFieldCustomWidget } from "@react-client/common/forms/widgets/TextFieldCustomWidget";
import { NumberInputWidget } from "@react-client/common/forms/widgets/NumberInputWidget";
import { V2BooleanWidget } from "@react-client/common/forms/widgets/V2BooleanWidget";

describe("v2AnketaFormWidgets", () => {
	it("maps default RJSF widget aliases to tooltip-capable widgets", () => {
		expect(v2AnketaFormWidgets.text).toBe(TextFieldCustomWidget);
		expect(v2AnketaFormWidgets.TextWidget).toBe(TextFieldCustomWidget);
		expect(v2AnketaFormWidgets.textarea).toBeTypeOf("function");
		expect(v2AnketaFormWidgets.updown).toBe(NumberInputWidget);
		expect(v2AnketaFormWidgets.UpDownWidget).toBe(NumberInputWidget);
		expect(v2AnketaFormWidgets.checkbox).toBe(V2BooleanWidget);
		expect(v2AnketaFormWidgets.select).toBeTypeOf("function");
	});
});
