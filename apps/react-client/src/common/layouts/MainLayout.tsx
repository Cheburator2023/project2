import { styled, useColorScheme } from "@mui/material/styles";
import type {} from "@mui/material/themeCssVarsAugmentation";
import type {} from "@mui/x-charts/themeAugmentation";
import type {} from "@mui/x-data-grid-pro/themeAugmentation";
import type {} from "@mui/x-date-pickers/themeAugmentation";
import type {} from "@mui/x-tree-view/themeAugmentation";
import { useGlobalSettingsStore } from "@react-client/common/store/globalSettingsStore";
import { Header } from "../../features/navigation/organisms/Header";
import { SideMenu } from "../../features/navigation/organisms/SideMenu";
import { Flex } from "../primitives/Flex";

import { Spacer } from "@react-client/common/primitives/Spacer";

const MainWrapper = styled("div", {
	shouldForwardProp: (prop) => prop !== "open",
})<{
	open?: boolean;
	mode?: string;
}>(({ theme, mode }) => ({
	flexGrow: 1,
	padding: "6px 12px",
	transition: theme.transitions.create("margin", {
		easing: theme.transitions.easing.sharp,
		duration: theme.transitions.duration.leavingScreen,
	}),
	marginLeft: `-${240}px`,
	variants: [
		{
			props: ({ open }) => open,
			style: {
				transition: theme.transitions.create("margin", {
					easing: theme.transitions.easing.easeOut,
					duration: theme.transitions.duration.enteringScreen,
				}),
				marginLeft: 0,
			},
		},
	],
}));

export function MainLayout({
	children,
	navbarVisible = true,
}: { children: React.ReactNode; navbarVisible?: boolean }) {
	const store = useGlobalSettingsStore();
	const { mode, systemMode, setMode } = useColorScheme();

	return (
		<Flex id="main_layout_container">
			<SideMenu open={store.isSideMenuVisible} />

			<MainWrapper
				id="main_layout_content"
				open={store.isSideMenuVisible}
				mode={mode}
			>
				{children}
			</MainWrapper>
		</Flex>
	);
}
