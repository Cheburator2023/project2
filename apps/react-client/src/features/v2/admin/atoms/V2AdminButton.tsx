import { Button } from "@mui/material";

interface V2AdminButtonProps {
	children: React.ReactNode;
	onClick?: () => void;
	variant?: "text" | "contained" | "outlined";
	color?: "primary" | "secondary" | "error" | "success";
	disabled?: boolean;
	type?: "button" | "submit" | "reset";
	"data-test-id"?: string;
}

export const V2AdminButton = ({
	children,
	onClick,
	variant = "contained",
	color = "primary",
	disabled = false,
	type = "button",
	"data-test-id": dataTestId,
}: V2AdminButtonProps) => {
	return (
		<Button
			type={type}
			onClick={onClick}
			disabled={disabled}
			variant={variant}
			color={color}
			data-test-id={dataTestId}
		>
			{children}
		</Button>
	);
};
