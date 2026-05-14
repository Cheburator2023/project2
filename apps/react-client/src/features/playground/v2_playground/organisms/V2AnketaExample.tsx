import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { validatorRu } from "@react-client/common/forms/rjsfLocaleRu";
import Form from "@rjsf/mui";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";

const EXAMPLE_SCHEMA: RJSFSchema = {
	title: "Анкета V2 — пример каркаса",
	type: "object",
	required: ["applicant"],
	properties: {
		applicant: {
			type: "string",
			title: "Заявитель",
			description: "Статический пример без бэкенда",
		},
		program: {
			type: "string",
			title: "Программа",
			enum: ["Оценка модели", "Валидация", "Эксперимент"],
		},
		amountMm: {
			type: "number",
			title: "Бюджет, млн ₽",
			minimum: 0,
			default: 10,
		},
		needsReview: {
			type: "boolean",
			title: "Требуется экспертиза",
			default: true,
		},
		notes: {
			type: "string",
			title: "Комментарий",
		},
	},
};

const UI: UiSchema = {
	notes: { "ui:widget": "textarea", "ui:options": { rows: 4 } },
};

export function V2AnketaExample() {
	const [formData, setFormData] = useState<Record<string, unknown>>({
		applicant: "ЗАО ПримерКлиент",
		program: "Оценка модели",
		amountMm: 42,
	});

	const clonedSchema = useMemo(() => structuredClone(EXAMPLE_SCHEMA), []);

	return (
		<Flex flexDirection="column" gap={8}>
			<Typography variant="body2" color="text.secondary">
				Live-превью RJSF без сохранения: такой же стек валидатора локали, как в конструкторе.
			</Typography>
			<Card>
				<Form
					schema={clonedSchema}
					uiSchema={UI}
					formData={formData}
					validator={validatorRu}
					onChange={(e) => setFormData(e.formData)}
					showErrorList={false}
					liveValidate
				/>
			</Card>
			<pre
				style={{
					fontSize: 12,
					margin: 0,
					overflow: "auto",
					maxHeight: 280,
				}}
			>
				{JSON.stringify(formData, null, 2)}
			</pre>
		</Flex>
	);
}
