import { Card, CardContent, InputLabel, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { WidgetProps } from "@rjsf/utils";
import { mainCalcSchema } from "../../../schemas";

export interface ArrayCustomCardListsWidgetProps extends WidgetProps {
	translationMap?: Record<string, string>;
}

const buildTranslationMapFromSchema = (schema: any): Record<string, string> => {
	const translationMap: Record<string, string> = {
		id: "ID",
	};

	const extractTranslations = (obj: any, _prefix = "") => {
		if (typeof obj !== "object" || obj === null) return;

		if (obj.properties) {
			Object.entries(obj.properties).forEach(([key, value]: [string, any]) => {
				if (value.title) {
					translationMap[key] = value.title;
				}
				extractTranslations(value, key);
			});
		}

		if (obj.items?.properties) {
			Object.entries(obj.items.properties).forEach(
				([key, value]: [string, any]) => {
					if (value.title) {
						translationMap[key] = value.title;
					}
					extractTranslations(value, key);
				},
			);
		}

		if (obj.enum && obj.enumNames) {
			obj.enum.forEach((enumValue: string, index: number) => {
				if (obj.enumNames[index]) {
					translationMap[enumValue] = obj.enumNames[index];
				}
			});
		}
	};

	extractTranslations(schema);
	return translationMap;
};

const _translationMap = buildTranslationMapFromSchema(mainCalcSchema);

const StyledCard = styled(Card)(({ theme }) => ({
	marginBottom: theme.spacing(2),
	border: `1px solid ${theme.palette.divider}`,
	borderRadius: theme.shape.borderRadius,
	"&:hover": {
		boxShadow: theme.shadows[2],
	},
}));

const StyledCardContent = styled(CardContent)(({ theme }) => ({
	padding: theme.spacing(2),
	"&:last-child": {
		paddingBottom: theme.spacing(2),
	},
}));

const PropertyLabel = styled(Typography)(({ theme }) => ({
	fontWeight: 600,
	color: theme.palette.text.secondary,
	marginBottom: theme.spacing(0.5),
}));

const PropertyValue = styled(Typography)(({ theme }) => ({
	color: theme.palette.text.primary,
	marginBottom: theme.spacing(1),
	wordBreak: "break-word",
}));

const renderValue = (
	value: any,
	translationMap?: Record<string, string>,
): string => {
	if (value === null || value === undefined) {
		return "—";
	}
	if (typeof value === "object") {
		return JSON.stringify(value, null, 2);
	}
	const stringValue = String(value);
	return translationMap?.[stringValue] || stringValue;
};

const renderObjectCard = (
	item: any,
	index: number,
	translationMap?: Record<string, string>,
) => {
	if (typeof item !== "object" || item === null) {
		return (
			<StyledCard key={index} variant="outlined">
				<StyledCardContent>
					<PropertyValue variant="body2">
						{renderValue(item, translationMap)}
					</PropertyValue>
				</StyledCardContent>
			</StyledCard>
		);
	}

	const entries = Object.entries(item);

	return (
		<StyledCard key={index} variant="outlined">
			<StyledCardContent>
				{entries.map(([key, value]) => {
					const translatedKey = translationMap?.[key] || key;
					return (
						<div key={key}>
							<PropertyLabel variant="caption">{translatedKey}</PropertyLabel>
							<PropertyValue variant="body2">
								{renderValue(value, translationMap)}
							</PropertyValue>
						</div>
					);
				})}
			</StyledCardContent>
		</StyledCard>
	);
};

export const ArrayCustomCardListsWidget = ({
	value,
	label,
	readonly,
	options,
}: ArrayCustomCardListsWidgetProps) => {
	const items = Array.isArray(value) ? value : [];
	const translationMap = (options?.translationMap as
		| Record<string, string>
		| undefined) || {
		..._translationMap,
		algorithmType: "Модель",
		type: "Фактор",
	};

	return (
		<>
			<InputLabel
				size="small"
				disabled={readonly}
				sx={{ fontSize: "1.25rem", fontWeight: "bold", color: "text.primary" }}
			>
				{label}
			</InputLabel>

			<Spacer space={4} />

			{items.length === 0 ? (
				<Typography variant="body2" color="text.secondary">
					Пусто
				</Typography>
			) : (
				items.map((item, index) =>
					renderObjectCard(item, index, translationMap),
				)
			)}
		</>
	);
};
