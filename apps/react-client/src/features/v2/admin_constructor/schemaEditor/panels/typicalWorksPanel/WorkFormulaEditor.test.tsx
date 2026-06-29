import { ThemeProvider, createTheme } from "@mui/material/styles";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {
	V2TypicalWorkFormulaDto,
	V2TypicalWorkLaborParamGroupDto,
	V2TypicalWorkRoundingDto,
} from "@smart-anketa/api-contract";
import { defaultWorkFormula, defaultWorkRounding } from "@smart-anketa/api-contract";
import { V2_TEMPLATE_EDIT_TEST_IDS as TID } from "@react-client/features/v2/admin_constructor/testIds";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { WorkFormulaEditor } from "./WorkFormulaEditor";

const theme = createTheme();

function StatefulWorkFormulaEditor(
	props: Partial<{
		initialFormula: V2TypicalWorkFormulaDto;
		initialRounding: V2TypicalWorkRoundingDto;
		laborParams: V2TypicalWorkLaborParamGroupDto[];
		readOnly: boolean;
	}> = {},
) {
	const [formula, setFormula] = useState(
		props.initialFormula ?? defaultWorkFormula(),
	);
	const [rounding, setRounding] = useState(
		props.initialRounding ?? defaultWorkRounding(),
	);

	return (
		<ThemeProvider theme={theme}>
			<WorkFormulaEditor
				formula={formula}
				rounding={rounding}
				laborParams={props.laborParams ?? []}
				onFormulaChange={setFormula}
				onRoundingChange={setRounding}
				readOnly={props.readOnly}
			/>
		</ThemeProvider>
	);
}

function renderEditor(
	props: Partial<{
		initialFormula: V2TypicalWorkFormulaDto;
		initialRounding: V2TypicalWorkRoundingDto;
		laborParams: V2TypicalWorkLaborParamGroupDto[];
		readOnly: boolean;
	}> = {},
) {
	return render(<StatefulWorkFormulaEditor {...props} />);
}

describe("WorkFormulaEditor (ui)", () => {
	it("shows default general formula H and unit", () => {
		renderEditor();
		expect(screen.getByTestId(TID.workFormulaGeneralSummary)).toHaveTextContent("H");
		expect(screen.getByText("единица: чел.-дн")).toBeInTheDocument();
		expect(screen.getByText("Общая формула норматива")).toBeInTheDocument();
	});

	it("builds H × Кэф-П1 via visual toolbar", async () => {
		const user = userEvent.setup();
		renderEditor({
			initialFormula: { tokens: [{ kind: "norm" }], text: "H" },
			laborParams: [
				{
					paramCode: "complexity",
					paramName: "Сложность",
					coefficients: [],
				},
			],
		});

		await user.click(screen.getByRole("button", { name: "*" }));

		const select = screen.getByTestId(TID.workFormulaParamSelect);
		await user.click(within(select).getByRole("combobox"));
		await user.click(screen.getByRole("option", { name: "Сложность" }));

		expect(screen.getByTestId(TID.workFormulaGeneralSummary)).toHaveTextContent(
			/H.*Кэф-П1/,
		);
	});

	it("clears formula back to H only", async () => {
		const user = userEvent.setup();
		renderEditor({
			initialFormula: {
				tokens: [
					{ kind: "norm" },
					{ kind: "operator", op: "*" },
					{ kind: "number", value: 2 },
				],
				text: "H × 2",
			},
		});

		await user.click(screen.getByTestId(TID.workFormulaClear));
		expect(screen.getByTestId(TID.workFormulaGeneralSummary)).toHaveTextContent("H");
	});

	it("applies manual formula text", async () => {
		const user = userEvent.setup();
		renderEditor();

		await user.click(screen.getByTestId(TID.workFormulaManualMode));
		const input = within(screen.getByTestId(TID.workFormulaManualInput)).getByRole(
			"textbox",
		);
		await user.clear(input);
		await user.type(input, "H * P[test]");
		await user.click(screen.getByTestId(TID.workFormulaApplyManual));

		expect(screen.getByTestId(TID.workFormulaGeneralSummary).textContent).toMatch(
			/H|Кэф/,
		);
	});

	it("switches rounding mode via chips", async () => {
		const user = userEvent.setup();
		renderEditor();

		await user.click(screen.getByRole("button", { name: "вниз" }));
		expect(screen.getByRole("button", { name: "вниз" })).toHaveClass("MuiChip-filled");
	});

	it("read-only hides editing controls", () => {
		renderEditor({ readOnly: true });
		expect(screen.queryByTestId(TID.workFormulaAddNorm)).not.toBeInTheDocument();
		expect(screen.queryByTestId(TID.workFormulaClear)).not.toBeInTheDocument();
	});
});
