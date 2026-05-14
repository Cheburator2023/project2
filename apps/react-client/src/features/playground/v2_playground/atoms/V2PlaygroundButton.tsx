import { Button } from "@mui/material";

interface V2PlaygroundButtonProps {
	children: React.ReactNode;
	onClick?: () => void;
	variant?: "text" | "contained" | "outlined";
	color?: "primary" | "secondary" | "error" | "info" | "success" | "warning";
	disabled?: boolean;
	type?: "button" | "submit" | "reset";
}

export const V2PlaygroundButton = ({
	children,
	onClick,
	variant = "contained",
	color = "primary",
	disabled = false,
	type = "button",
}: V2PlaygroundButtonProps) => {
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
