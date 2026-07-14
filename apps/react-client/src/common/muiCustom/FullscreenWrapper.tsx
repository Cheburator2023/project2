import React from "react";

export const FullscreenWrapper = ({
	children,
	height = "inherit",
}: {
	children: React.ReactNode;
	height?: string;
}) => {
	return (
		<div
			style={{
				width: "100%",
				height,
				justifyContent: "center",
				alignItems: "center",
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
			}}
		>
			{children}
		</div>
	);
};
