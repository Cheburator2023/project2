import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { IconButton, IconButtonProps, InputAdornment } from "@mui/material";
import React, {
	MouseEvent,
	ReactNode,
	Ref,
	RefAttributes,
	forwardRef,
	useState,
} from "react";
import { FieldPath, FieldValues } from "react-hook-form";
import TextFieldElement, { TextFieldElementProps } from "./TextFieldElement";

export type PasswordElementProps<
	TFieldValues extends FieldValues = FieldValues,
	TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
	TValue = unknown,
> = TextFieldElementProps<TFieldValues, TName, TValue> & {
	iconColor?: IconButtonProps["color"];
	renderIcon?: (password: boolean) => ReactNode;
};
type PasswordElementComponent = <
	TFieldValues extends FieldValues = FieldValues,
	TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(
	props: PasswordElementProps<TFieldValues, TName> &
		RefAttributes<HTMLDivElement>,
) => React.JSX.Element;
const PasswordElement = forwardRef(function PasswordEl<
	TFieldValues extends FieldValues = FieldValues,
	TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
	TValue = unknown,
>(
	props: PasswordElementProps<TFieldValues, TName, TValue>,
	ref: Ref<HTMLDivElement>,
) {
	const {
		iconColor,
		renderIcon = (password) => (password ? <Visibility /> : <VisibilityOff />),
		InputProps = {},
		slotProps,
		...rest
	} = props;
	const [password, setPassword] = useState<boolean>(true);

	const endAdornment = (
		<InputAdornment position={"end"}>
			<IconButton
				aria-label={password ? "Hide password" : "Show password"}
				onMouseDown={(e: MouseEvent<HTMLButtonElement>) => e.preventDefault()}
				onClick={() => setPassword(!password)}
				tabIndex={-1}
				color={iconColor ?? "default"}
			>
				{renderIcon(password)}
			</IconButton>
		</InputAdornment>
	);

	return (
		<TextFieldElement
			{...(rest as TextFieldElementProps)}
			ref={ref}
			type={password ? "password" : "text"}
			{...(typeof slotProps === "undefined"
				? {
						InputProps: {
							endAdornment,
							...InputProps,
						},
					}
				: {
						slotProps: {
							...slotProps,
							input: {
								endAdornment,
								...InputProps,
								...slotProps?.input,
							},
						} as TextFieldElementProps["slotProps"],
					})}
		/>
	);
});
PasswordElement.displayName = "PasswordElement";
export default PasswordElement as PasswordElementComponent;
