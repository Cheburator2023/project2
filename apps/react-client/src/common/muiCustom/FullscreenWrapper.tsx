import React from "react";

export const FullscreenWrapper = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	return (
		<div
			style={{
				width: "100%",
				height: "inherit",
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
