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
		normValue: number | null;
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
				normValue={props.normValue ?? 1.15}
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
		normValue: number | null;
		readOnly: boolean;
	}> = {},
) {
	return render(<StatefulWorkFormulaEditor {...props} />);
}

describe("WorkFormulaEditor (ui)", () => {
	it("shows calculator header, mode badge and footer", () => {
		renderEditor();
		expect(screen.getByText("Калькулятор формулы")).toBeInTheDocument();
		expect(screen.getByTestId(TID.workFormulaModeBadge)).toHaveTextContent(
			"фиксированная",
		);
		expect(screen.getByTestId(TID.workFormulaGeneralSummary)).toHaveTextContent("N");
		expect(screen.getByText("единица: чел.-дн.")).toBeInTheDocument();
		expect(screen.getByText("Общая формула норматива")).toBeInTheDocument();
	});

	it("builds N × Кэф-П1 via param autocomplete", async () => {
		const user = userEvent.setup();
		renderEditor({
			initialFormula: { tokens: [{ kind: "norm" }], text: "N" },
			laborParams: [
				{
					paramCode: "complexity",
					paramName: "Сложность",
					coefficients: [],
				},
			],
		});

		await user.click(screen.getByTestId(`${TID.workFormulaEditor}-op-mul`));

		const paramSelect = within(screen.getByTestId(TID.workFormulaParamSelect)).getByRole(
			"combobox",
		);
		await user.click(paramSelect);
		await user.click(screen.getByRole("option", { name: /Сложность/ }));

		expect(screen.getByTestId(TID.workFormulaGeneralSummary)).toHaveTextContent(
			/N.*Кэф-П1/,
		);
	});

	it("clears formula after confirm", async () => {
		const user = userEvent.setup();
		renderEditor({
			initialFormula: {
				tokens: [
					{ kind: "norm" },
					{ kind: "operator", op: "*" },
					{ kind: "number", value: 2 },
				],
				text: "N × 2",
			},
		});

		await user.click(screen.getByTestId(TID.workFormulaClear));
		await user.click(screen.getByTestId(TID.workFormulaClearConfirm));
		expect(screen.getByTestId(TID.workFormulaGeneralSummary)).toHaveTextContent("—");
	});

	it("switches to manual mode and parses formula text", async () => {
		const user = userEvent.setup();
		renderEditor();

		await user.click(screen.getByTestId(TID.workFormulaManualMode));
		const input = within(screen.getByTestId(TID.workFormulaManualInput)).getByRole(
			"textbox",
		);
		await user.clear(input);
		await user.type(input, "N * коэф(test)");
		await user.click(screen.getByTestId(TID.workFormulaVisualMode));

		expect(screen.getByTestId(TID.workFormulaGeneralSummary).textContent).toMatch(
			/N|Кэф/,
		);
	});

	it("round-trips visual → manual → visual with param names containing parentheses", async () => {
		const user = userEvent.setup();
		const paramName = "Базовая оценка по стриму (СФЕРА)";
		renderEditor({
			laborParams: [
				{
					paramCode: "field_sphere",
					paramName,
					kind: "by_value",
					coefficients: [],
				},
			],
			initialFormula: {
				tokens: [
					{ kind: "norm" },
					{ kind: "operator", op: "*" },
					{
						kind: "param_coeff",
						paramCode: "field_sphere",
						paramName,
					},
				],
				// устаревший текст с неэкранированными скобками в имени
				text: `N × коэф(${paramName})`,
			},
		});

		await user.click(screen.getByTestId(TID.workFormulaManualMode));
		await user.click(screen.getByTestId(TID.workFormulaVisualMode));

		expect(screen.queryByText(/Проверьте скобки/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/отсутствует в блоке/i)).not.toBeInTheDocument();
		expect(screen.getByTestId(TID.workFormulaGeneralSummary).textContent).toMatch(
			/Кэф-П1/,
		);
	});

	it("switches rounding mode via segment bar", async () => {
		const user = userEvent.setup();
		renderEditor();

		await user.click(screen.getByRole("button", { name: "вниз" }));
		expect(screen.getByTestId(TID.workFormulaFooter)).toHaveTextContent(/вниз/);
	});

	it("keeps calculator visible in transitive mode", () => {
		renderEditor({
			initialFormula: {
				tokens: [
					{
						kind: "work_ref",
						assignmentId: "a1",
						workName: "Другая работа",
					},
				],
				text: "работа(a1)",
			},
		});
		expect(screen.getByTestId(TID.workFormulaModeBadge)).toHaveTextContent(
			"транзитивная",
		);
		expect(screen.getByTestId(TID.workFormulaEditor)).toBeInTheDocument();
		expect(screen.getByTestId(TID.workFormulaWorkRefSelect)).toBeInTheDocument();
		expect(screen.getByText("Добавить:")).toBeInTheDocument();
	});

	it("shows alert inside popover when labor params are missing", async () => {
		const user = userEvent.setup();
		renderEditor({ laborParams: [] });

		const paramSelect = within(screen.getByTestId(TID.workFormulaParamSelect)).getByRole(
			"combobox",
		);
		await user.click(paramSelect);

		expect(
			screen.getByText(/Добавьте параметр с режимом «По значениям»/),
		).toBeInTheDocument();
	});

	it("lists any-of params before values are selected and warns in picker", async () => {
		const user = userEvent.setup();
		renderEditor({
			laborParams: [
				{
					paramCode: "flag",
					paramName: "Флаг",
					kind: "any_of",
					coefficients: [],
					anyOf: {
						valueCodes: [],
						valueLabels: [],
						coeffOn: 1,
						coeffOff: 0.5,
					},
				},
			],
		});

		const anyOfSelect = within(
			screen.getByTestId(TID.workFormulaAnyOfSelect),
		).getByRole("combobox");
		await user.click(anyOfSelect);

		expect(screen.getByRole("option", { name: /Флаг/ })).toBeInTheDocument();
		expect(
			screen.getByText(/множества значений пусты/i),
		).toBeInTheDocument();

		await user.click(screen.getByRole("option", { name: /Флаг/ }));

		const ribbon = screen.getByTestId(TID.workFormulaRibbon);
		expect(within(ribbon).getByText("any-of")).toBeInTheDocument();
		expect(within(ribbon).getByText(/нет значений/i)).toBeInTheDocument();
	});

	it("inserts operator after clicked token", async () => {
		const user = userEvent.setup();
		renderEditor({
			initialFormula: {
				tokens: [{ kind: "norm" }, { kind: "number", value: 2 }],
				text: "N 2",
			},
		});

		const ribbon = screen.getByTestId(TID.workFormulaRibbon);
		await user.click(within(ribbon).getByText("Норма N"));
		await user.click(screen.getByTestId(`${TID.workFormulaEditor}-op-mul`));

		expect(screen.getByTestId(TID.workFormulaGeneralSummary).textContent).toMatch(
			/N.*\*.*2|N.*×.*2/,
		);
	});

	it("keeps cursor after backspace at end of ribbon", async () => {
		const user = userEvent.setup();
		renderEditor({
			initialFormula: {
				tokens: [{ kind: "norm" }, { kind: "number", value: 2 }],
				text: "N 2",
			},
		});

		const ribbon = screen.getByTestId(TID.workFormulaRibbon);
		ribbon.focus();
		await user.keyboard("{Backspace}");

		expect(within(ribbon).getByTestId(TID.workFormulaCursor)).toBeInTheDocument();
		expect(screen.getByTestId(TID.workFormulaGeneralSummary)).toHaveTextContent("N");
		expect(screen.queryByText("2")).not.toBeInTheDocument();
	});

	it("inserts operator at end of formula", async () => {
		const user = userEvent.setup();
		renderEditor({
			initialFormula: {
				tokens: [{ kind: "norm" }, { kind: "number", value: 2 }],
				text: "N 2",
			},
		});

		// Курсор стартует в конце (tokens.length === 2)
		await user.click(screen.getByTestId(`${TID.workFormulaEditor}-op-mul`));

		expect(screen.getByTestId(TID.workFormulaGeneralSummary).textContent).toMatch(
			/N.*2.*\*|N.*2.*×/,
		);
	});

	it("single click on number sets cursor without opening editor", async () => {
		const user = userEvent.setup();
		renderEditor({
			initialFormula: {
				tokens: [{ kind: "norm" }, { kind: "number", value: 2 }],
				text: "N 2",
			},
		});

		const ribbon = screen.getByTestId(TID.workFormulaRibbon);
		await user.click(within(ribbon).getByText("2"));
		expect(within(ribbon).queryByRole("textbox")).not.toBeInTheDocument();
		expect(within(ribbon).getByTestId(TID.workFormulaCursor)).toBeInTheDocument();
	});

	it("changes operator inline in the ribbon via double-click", async () => {
		const user = userEvent.setup();
		renderEditor({
			initialFormula: {
				tokens: [
					{ kind: "norm" },
					{ kind: "operator", op: "*" },
					{ kind: "number", value: 2 },
				],
				text: "N × 2",
			},
		});

		const ribbon = screen.getByTestId(TID.workFormulaRibbon);
		await user.dblClick(screen.getByTestId(TID.workFormulaOperatorChip));
		const picker = within(ribbon).getByTestId(TID.workFormulaOperatorSelect);
		await user.click(within(picker).getByRole("button", { name: "+" }));

		expect(screen.getByTestId(TID.workFormulaGeneralSummary)).toHaveTextContent(
			"N + 2",
		);
	});

	it("inserts closing parenthesis without implicit multiply", async () => {
		const user = userEvent.setup();
		renderEditor({
			initialFormula: {
				tokens: [
					{ kind: "norm" },
					{ kind: "operator", op: "*" },
					{ kind: "number", value: 2 },
				],
				text: "N × 2",
			},
		});

		await user.click(screen.getByRole("button", { name: ")" }));

		expect(screen.getByTestId(TID.workFormulaGeneralSummary).textContent).toMatch(
			/N.*[×*].*2\)/,
		);
	});

	it("still inserts implicit multiply after closing parenthesis", async () => {
		const user = userEvent.setup();
		renderEditor({
			initialFormula: {
				tokens: [
					{ kind: "paren_open" },
					{ kind: "norm" },
					{ kind: "paren_close" },
				],
				text: "(N)",
			},
		});

		await user.click(screen.getByRole("button", { name: "число" }));

		expect(screen.getByTestId(TID.workFormulaGeneralSummary).textContent).toMatch(
			/\(N\).*\*.*1|\(N\).*×.*1/,
		);
	});

	it("read-only hides editing controls", () => {
		renderEditor({ readOnly: true });
		expect(screen.queryByTestId(TID.workFormulaAddNorm)).not.toBeInTheDocument();
		expect(screen.queryByTestId(TID.workFormulaClear)).not.toBeInTheDocument();
	});
});
