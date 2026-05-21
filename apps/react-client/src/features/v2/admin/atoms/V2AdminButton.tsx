import { Button } from "@mui/material";

interface V2AdminButtonProps {
	children: React.ReactNode;
	onClick?: () => void;
	variant?: "text" | "contained" | "outlined";
	color?: "primary" | "secondary" | "error" | "success";
	disabled?: boolean;
	type?: "button" | "submit" | "reset";
}

export const V2AdminButton = ({
	children,
	onClick,
	variant = "contained",
	color = "primary",
	disabled = false,
	type = "button",
}: V2AdminButtonProps) => {
	return (
		<Button
			type={type}
			onClick={onClick}
			disabled={disabled}
			variant={variant}
			color={color}
		>
			{children}
		</Button>
	);
};
