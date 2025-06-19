import { zodResolver } from "@hookform/resolvers/zod";
import {
	AutocompleteElement,
	FormContainer,
	SelectElement,
	TextFieldElement,
} from "@react-client/common/forms";
import { Flex } from "@react-client/common/primitives/Flex";
import { useForm } from "react-hook-form";
import * as z from "zod";

const formSchema = z.object({
	calculationName: z.string().min(1, "Название расчета обязательно"),
	rfd: z.string().optional(),
	streamExecutor: z.string().min(1, "Поле Стрим-исполнитель обязательно"),
	department: z.string().min(1, "Поле Департамент заказчика обязательно"),
	customerName: z.string().optional(),
	comment: z.string().optional(),
	relatedModels: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

const streamExecutorOptions = [
	{ id: "Отсутствует", label: "Отсутствует" },
	{ id: "ДАДМ", label: "ДАДМ" },
	{ id: "IT_DEPT", label: "IT Департамент" },
	{ id: "HR_DEPT", label: "HR Департамент" },
];

const departmentOptions = [
	{ id: "ДАДМ", label: "ДАДМ" },
	{ id: "IT_DEPT", label: "IT Департамент" },
	{ id: "HR_DEPT", label: "HR Департамент" },
];

export const BasicInfoForm = () => {
	const formContext = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		reValidateMode: "onChange",
		mode: "onTouched",
		defaultValues: {
			calculationName: "Значение 1",
			rfd: "Отсутствует",
			streamExecutor: "Отсутствует",
			department: "ДАДМ",
			customerName: "Петров Петр",
			comment: "Значение 6",
			relatedModels: ["model666", "model777"],
		},
	});

	const {
		formState: { errors },
	} = formContext;

	const onSubmit = (data: FormValues) => {
		console.log(data);
	};

	return (
		<FormContainer formContext={formContext} onSuccess={onSubmit}>
			<Flex gap={8} flexDirection="column">
				<TextFieldElement
					name="calculationName"
					label="Название расчета"
					required
					fullWidth
					variant="outlined"
				/>

				<TextFieldElement name="rfd" label="RFD" fullWidth variant="outlined" />

				<SelectElement
					name="streamExecutor"
					label="Стрим-исполнитель"
					options={streamExecutorOptions}
					required
					fullWidth
					variant="outlined"
				/>

				<SelectElement
					name="department"
					label="Департамент заказчика"
					options={departmentOptions}
					required
					fullWidth
					variant="outlined"
				/>

				<TextFieldElement
					name="customerName"
					label="ФИО заказчика"
					fullWidth
					variant="outlined"
				/>

				<TextFieldElement
					name="comment"
					label="Комментарий"
					fullWidth
					variant="outlined"
					multiline
					rows={3}
				/>

				<AutocompleteElement
					name="relatedModels"
					label="Связанные модели"
					multiple
					options={["model666", "model777"]}
				/>
			</Flex>
		</FormContainer>
	);
};
