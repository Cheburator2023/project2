import { styled, useColorScheme } from "@mui/material/styles";
import { useGlobalSettingsStore } from "@react-client/common/store/globalSettingsStore";
import {Outlet} from "react-router";
import {SideMenu} from "@react-client/version/v2/navigation/organisms/SideMenu";
import {Flex} from "@react-client/common/primitives/Flex";

const MainWrapper = styled("div", {
	shouldForwardProp: (prop) => prop !== "open",
})<{
	open?: boolean;
	mode?: string;
}>(({ theme, mode }) => ({
	flexGrow: 1,
	minHeight: "100vh",
	padding: "8px",
	transition: theme.transitions.create("margin", {
		easing: theme.transitions.easing.sharp,
		duration: theme.transitions.duration.leavingScreen,
	}),
	"& > div": {
		height: "100%",
		display: "flex",
		flexDirection: "column",
	},
	marginLeft: `-${260}px`,
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
	onLogout,
	navbarVisible = true,
}: {
	children?: React.ReactNode;
	navbarVisible?: boolean;
	onLogout?: () => void;
}) {
	const store = useGlobalSettingsStore();
	const { mode, systemMode, setMode } = useColorScheme();

	return (
		<Flex id="main_layout_container" data-test-id="main-layout--Flex-0">
			<SideMenu
				open={store.isSideMenuVisible}
				onLogout={onLogout}
				data-test-id="main-layout--SideMenu-0"
			/>
			<MainWrapper
				id="main_layout_content"
				open={store.isSideMenuVisible}
				mode={mode}
				data-test-id="main-layout--MainWrapper-0"
			>
				<Outlet />
			</MainWrapper>
		</Flex>
	);
}
