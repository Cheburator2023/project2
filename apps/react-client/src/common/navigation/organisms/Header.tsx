import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseRoundedIcon from "@mui/icons-material/MenuOpen";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import Box from "@mui/material/Box";
import { IconButton, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Card } from "@react-client/common/muiCustom/Card";
import { useNavigate } from "react-router";
import { Flex } from "../../primitives/Flex";
import { useGlobalSettingsStore } from "../../store/globalSettingsStore";
import { ColorModeIconDropdown } from "../../../theme/ColorModeIconDropdown";
import { MenuButton } from "../molecules/MenuButton";
import { NavbarBreadcrumbs } from "@react-client/common/navigation/molecules/NavbarBreadcrumbs";
import { useLayoutEffect, useRef, useState } from "react";
import { Spacer } from "@react-client/common/primitives/Spacer";

const DRAWER_WIDTH = 260;
const MAIN_PADDING = 8;
const HEADER_BOTTOM_GAP = 6;

export function Header({
	children,
	title,
	calcId,
	leadingAccessory,
	fixed = false,
}: {
	children?: React.ReactNode;
	calcId?: string;
	title?: string;
	leadingAccessory?: React.ReactNode;
	fixed?: boolean;
}) {
	const theme = useTheme();
	const { toggleSideMenu, isSideMenuVisible } = useGlobalSettingsStore();
	const navigate = useNavigate();
	const headerRef = useRef<HTMLDivElement>(null);
	const [spacerHeight, setSpacerHeight] = useState(52);

	const id1 = new URLSearchParams(window.location.search).get("id1");
	const id2 = new URLSearchParams(window.location.search).get("id2");

	useLayoutEffect(() => {
		const el = headerRef.current;
		if (!el) return;

		const update = () => {
			setSpacerHeight(el.offsetHeight + HEADER_BOTTOM_GAP);
		};

		update();
		const observer = new ResizeObserver(update);
		observer.observe(el);
		window.addEventListener("resize", update);

		return () => {
			observer.disconnect();
			window.removeEventListener("resize", update);
		};
	}, [children, title, calcId, isSideMenuVisible, leadingAccessory]);

	return (
		<>
			<Box
				ref={headerRef}
				component="header"
				data-test-id="header--fixed-shell-0"
				sx={
					fixed
						? {
								position: "fixed",
								top: MAIN_PADDING,
								left: isSideMenuVisible
									? DRAWER_WIDTH + MAIN_PADDING
									: MAIN_PADDING,
								right: "18px",
								zIndex: theme.zIndex.appBar,
								transition: theme.transitions.create("left", {
									easing: theme.transitions.easing.sharp,
									duration: theme.transitions.duration.enteringScreen,
								}),
							}
						: {
								left: isSideMenuVisible ? DRAWER_WIDTH : MAIN_PADDING,
							}
				}
			>
				<Card
					data-test-id="header--Card-0"
					zoom={0.8}
					uuid="header_uuid"
					sx={{ bgcolor: "background.paper" }}
					style={{ overflow: "visible", padding: "4px" }}
				>
					<Flex
						width="fill-available"
						gap={16}
						alignItems="center"
						justifyContent="space-between"
						position="relative"
						data-test-id="header--Flex-0"
					>
						<Flex
							flexDirection="row"
							gap={8}
							alignItems="center"
							flexShrink={0}
							data-test-id="header--Flex-1"
						>
							<MenuButton
								aria-label="menu"
								onClick={() => toggleSideMenu()}
								title={isSideMenuVisible ? "Закртыть меню" : "Открыть меню"}
								data-test-id="header--MenuButton-0"
							>
								{!isSideMenuVisible ? (
									<MenuRoundedIcon data-test-id="header--MenuRoundedIcon-0" />
								) : (
									<CloseRoundedIcon data-test-id="header--CloseRoundedIcon-0" />
								)}
							</MenuButton>
							{(history.state?.idx ?? 0) > 0 && (
								<IconButton
									size="small"
									onClick={() => navigate(-1)}
									title="Вернуться назад"
								>
									<ArrowBackIcon />
								</IconButton>
							)}
							{title ? (
								<b>{title}</b>
							) : (
								<>
									<NavbarBreadcrumbs data-test-id="header--NavbarBreadcrumbs-0" />
									{leadingAccessory}
								</>
							)}
							{calcId ||
								((id1 || id2) && (
									<Typography data-test-id="header--Typography-0">
										- {calcId || `${id1} / ${id2}`}
									</Typography>
								))}
						</Flex>
						<Flex
							flexDirection="row"
							gap={6}
							alignItems="center"
							justifyContent="flex-end"
							width="fill-available"
							data-test-id="header--Flex-2"
						>
							{children}
							<ColorModeIconDropdown data-test-id="header--ColorModeIconDropdown-0" />
						</Flex>
					</Flex>
				</Card>
			</Box>
			{fixed ? (
				<Box
					aria-hidden
					data-test-id="header--spacer-0"
					sx={{ height: spacerHeight, flexShrink: 0 }}
				/>
			) : (
				<Spacer height={8} />
			)}
		</>
	);
}
