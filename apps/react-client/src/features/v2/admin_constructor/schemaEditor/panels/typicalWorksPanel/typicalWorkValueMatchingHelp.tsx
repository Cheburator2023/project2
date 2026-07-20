import Alert from "@mui/material/Alert";
import type { SxProps, Theme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";

export type TypicalWorkValueMatchingInfoVariant =
	| "triggers"
	| "labor"
	| "formula";

const COPY: Record<
	TypicalWorkValueMatchingInfoVariant,
	{ title: string; lines: string[] }
> = {
	triggers: {
		title: "Как сопоставляются значения в триггерах",
		lines: [
			"Значение в анкете сравнивается с кодом и подписью из настроек — подойдёт и код справочника, и отображаемый текст.",
			"Чекбокс: отмечено = «Да» / true, снято = «Нет» / false (та же логика, что для коэффициентов).",
			"Операторы ≥ ≤ > < сравнивают числа; «вид контроля» ищется в тексте строки.",
		],
	},
	labor: {
		title: "Как считаются коэффициенты трудоёмкости",
		lines: [
			"«По значениям» — отдельный коэффициент на каждый вариант (справочник, enum, чекбокс Да/Нет). Сопоставление кода и подписи такое же, как в триггерах.",
			"Числовые параметры (метрики, витрины, инициативы, контроли): режим «По значениям», подпись строки — точное число или диапазон («до 20», «20–50», «>50»).",
			"Any-of — coeffOn, если значение попало в отмеченное множество, иначе coeffOff.",
			"Поля схемы (field_…) не проверяются по глобальному CSV — берутся значения из вашей анкеты. Параметр привязывается к полю (@ field_…); без токена в формуле (коэф / anyof) итоговый коэффициент останется 1.",
		],
	},
	formula: {
		title: "Параметры в формуле",
		lines: [
			"коэф(П) — множитель из режима «По значениям»: какое значение выбрано в анкете.",
			"anyof(П) — множитель из режима Any-of: попало ли значение в отмеченное множество.",
			"Только норма H без параметров даёт коэффициент 1, даже если трудоёмкость настроена.",
		],
	},
};

type TypicalWorkValueMatchingInfoProps = {
	variant: TypicalWorkValueMatchingInfoVariant;
	sx?: SxProps<Theme>;
};

export function TypicalWorkValueMatchingInfo({
	variant,
	sx,
}: TypicalWorkValueMatchingInfoProps) {
	const { title, lines } = COPY[variant];
	return null;
	//  (
	// 	<Alert severity="info" sx={{ mb: 1.5, py: 0.75, ...sx }}>
	// 		<Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.5 }}>
	// 			{title}
	// 		</Typography>
	// 		{lines.map((line) => (
	// 			<Typography
	// 				key={line}
	// 				component="div"
	// 				sx={{ fontSize: 11.5, lineHeight: 1.45, color: "inherit" }}
	// 			>
	// 				{line}
	// 			</Typography>
	// 		))}
	// 	</Alert>
	// );
}
