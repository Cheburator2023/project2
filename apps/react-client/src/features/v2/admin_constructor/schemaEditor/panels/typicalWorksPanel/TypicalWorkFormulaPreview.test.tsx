import { ThemeProvider, createTheme } from "@mui/material/styles";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { V2_TEMPLATE_EDIT_TEST_IDS as TID } from "@react-client/features/v2/admin_constructor/testIds";
import { TypicalWorkFormulaPreview } from "./TypicalWorkFormulaPreview";

const mutate = vi.fn();

vi.mock("@react-client/common/api/queries/v2-works", () => ({
	usePreviewV2TypicalWork: () => ({
		mutate,
		isPending: false,
		data: {
			formulaSymbolic: "H × P[Сложность]",
			formulaExpanded: "",
			result: 3.5,
			error: null,
			triggerStatus: "appears",
		},
		error: null,
	}),
}));

const theme = createTheme();

describe("TypicalWorkFormulaPreview", () => {
	it("shows local formula before API and calls preview on mount", async () => {
		mutate.mockClear();
		render(
			<ThemeProvider theme={theme}>
				<TypicalWorkFormulaPreview
					workId="work-1"
					streamExecutor="Источники данных"
					laborParams={[
						{
							paramCode: "complexity",
							paramName: "Сложность",
							coefficients: [
								{
									id: "c1",
									streamExecutor: "Источники данных",
									paramCode: "complexity",
									paramName: "Сложность",
									valueCode: "low",
									valueLabel: "Низкая",
									coefficient: 1,
								},
							],
						},
					]}
					rules={[]}
					paramCatalog={[]}
					localFormulaText="H × черновик"
					refreshToken={0}
				/>
			</ThemeProvider>,
		);

		expect(screen.getByTestId(TID.workFormulaPreview)).toBeInTheDocument();
		await waitFor(() => expect(mutate).toHaveBeenCalled());
		expect(screen.getByTestId(TID.workFormulaPreviewSymbolic)).toHaveTextContent(
			/H × P\[Сложность\]|H × черновик/,
		);
		expect(screen.getByTestId(TID.workFormulaPreviewResult)).toHaveTextContent(
			"3.5",
		);
	});

	it("changes answers and re-triggers preview", async () => {
		mutate.mockClear();
		const user = userEvent.setup();
		render(
			<ThemeProvider theme={theme}>
				<TypicalWorkFormulaPreview
					workId="work-1"
					streamExecutor="Источники данных"
					laborParams={[
						{
							paramCode: "complexity",
							paramName: "Сложность",
							coefficients: [
								{
									id: "c1",
									streamExecutor: "Источники данных",
									paramCode: "complexity",
									paramName: "Сложность",
									valueCode: "low",
									valueLabel: "Низкая",
									coefficient: 1,
								},
								{
									id: "c2",
									streamExecutor: "Источники данных",
									paramCode: "complexity",
									paramName: "Сложность",
									valueCode: "high",
									valueLabel: "Высокая",
									coefficient: 2,
								},
							],
						},
					]}
					rules={[]}
					paramCatalog={[]}
				/>
			</ThemeProvider>,
		);

		await waitFor(() => expect(mutate).toHaveBeenCalled());
		const callsBefore = mutate.mock.calls.length;
		await user.click(screen.getByRole("button", { name: "Высокая" }));
		await waitFor(() => expect(mutate.mock.calls.length).toBeGreaterThan(callsBefore));
	});
});
