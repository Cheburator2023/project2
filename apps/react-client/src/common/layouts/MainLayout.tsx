import { styled } from "@mui/material/styles";
import { useGlobalSettingsStore } from "@react-client/common/store/globalSettingsStore";
import { SideMenu } from "@react-client/common/navigation/organisms/SideMenu";
import { SuspenseOutlet } from "@react-client/common/layouts/SuspenseOutlet";
import type { MainLayoutOutletContext } from "@react-client/common/layouts/mainLayoutOutletContext";
import { Flex } from "../primitives/Flex";

export type { MainLayoutOutletContext } from "@react-client/common/layouts/mainLayoutOutletContext";

/** Ширина persistent drawer — должна совпадать с SideMenu. */
export const MAIN_LAYOUT_DRAWER_WIDTH = 260;
export const MAIN_LAYOUT_PADDING = 8;

const MainLayoutContainer = styled(Flex)`
	width: 100%;
	max-width: 100vw;
	min-width: 0;
	height: 100vh;
	max-height: 100dvh;
	overflow: hidden;
	box-sizing: border-box;
`;

const MainWrapper = styled("div", {
	shouldForwardProp: (prop) => prop !== "open",
})<{
	open?: boolean;
}>(({ theme, open }) => {
	const contentWidthClosed = `calc(100vw)`;
	const contentWidthOpen = `calc(100vw)`;

	return {
		minWidth: 0,
		minHeight: 0,
		maxHeight: "100%",
		padding: `${MAIN_LAYOUT_PADDING}px`,
		boxSizing: "border-box",
		overflow: "hidden",
		transition: theme.transitions.create("margin", {
			easing: theme.transitions.easing.sharp,
			duration: theme.transitions.duration.leavingScreen,
		}),
		...(open
			? {
					// flex: "1 1 0px",
					width: contentWidthClosed,
					maxWidth: contentWidthOpen,
					marginLeft: 0,
				}
			: {
					// flex: "0 0 auto",
					width: contentWidthClosed,
					maxWidth: contentWidthClosed,
					marginLeft: `-${MAIN_LAYOUT_DRAWER_WIDTH}px`,
				}),
		"& > *": {
			height: "100%",
			minHeight: 0,
			minWidth: 0,
			maxWidth: "100%",
			display: "flex",
			flexDirection: "column",
			overflow: "hidden",
			boxSizing: "border-box",
		},
	};
});

export function MainLayout({
	children,
	onLogout,
}: {
	children?: React.ReactNode;
	navbarVisible?: boolean;
	onLogout?: () => void;
}) {
	const { isSideMenuVisible } = useGlobalSettingsStore();
	const outletContext: MainLayoutOutletContext = { onLogout };

	return (
		<MainLayoutContainer
			id="main_layout_container"
			data-test-id="main-layout--Flex-0"
		>
			<SideMenu
				open={isSideMenuVisible}
				onLogout={onLogout}
				data-test-id="main-layout--SideMenu-0"
			/>
			<MainWrapper
				id="main_layout_content"
				open={isSideMenuVisible}
				data-test-id="main-layout--MainWrapper-0"
			>
				{children ?? <SuspenseOutlet context={outletContext} />}
			</MainWrapper>
		</MainLayoutContainer>
	);
}
