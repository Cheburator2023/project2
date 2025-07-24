import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseRoundedIcon from "@mui/icons-material/MenuOpen";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import { IconButton, Typography } from "@mui/material";
import { Card } from "@react-client/common/muiCustom/Card";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { useNavigate } from "react-router";
import { Flex } from "../../../common/primitives/Flex";
import { useGlobalSettingsStore } from "../../../common/store/globalSettingsStore";
import { ColorModeIconDropdown } from "../../../theme/ColorModeIconDropdown";
import { MenuButton } from "../molecules/MenuButton";
import { NavbarBreadcrumbs } from "../molecules/NavbarBreadcrumbs";

export function Header({
	children,
	title,
	calcId,
}: {
	children?: React.ReactNode;
	calcId?: string;
	title?: string;
}) {
	const { toggleSideMenu, isSideMenuVisible } = useGlobalSettingsStore();
	const navigate = useNavigate();

	const id1 = new URLSearchParams(window.location.search).get("id1");
	const id2 = new URLSearchParams(window.location.search).get("id2");

	return (
		<>
			<Card
				data-test-id="header--Card-0"
				zoom={0.8}
				uuid="header_uuid"
				style={{ overflow: "visible", padding: "4px" }}
			>
				<Flex
					width="fill-available"
					gap={16}
					alignItems="center"
					justifyContent="space-between"
					position="relative"
					zIndex={1000}
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
						{!!history.state.idx && (
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
							<NavbarBreadcrumbs data-test-id="header--NavbarBreadcrumbs-0" />
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
			<Spacer height={6} data-test-id="anketa-create-page--Spacer-1" />
		</>
	);
}
