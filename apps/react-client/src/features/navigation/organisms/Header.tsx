import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "../../../common/primitives/Flex";
import { useGlobalSettingsStore } from "../../../common/store/globalSettingsStore";
import { ColorModeIconDropdown } from "../../../theme/ColorModeIconDropdown";
import { MenuButton } from "../molecules/MenuButton";
import { NavbarBreadcrumbs } from "../molecules/NavbarBreadcrumbs";

export function Header({ children }: { children?: React.ReactNode }) {
	const { toggleSideMenu, isSideMenuVisible } = useGlobalSettingsStore();

	return (
		<>
			<Card padding="2px 3px">
				<Flex
					width="fill-available"
					pad="2px 3px"
					gap={16}
					alignItems="center"
					justifyContent="space-between"
					position="relative"
					zIndex={1000}
				>
					<Flex flexDirection="row" gap={8} alignItems="center" flexShrink={0}>
						<MenuButton aria-label="menu" onClick={() => toggleSideMenu()}>
							{!isSideMenuVisible ? <MenuRoundedIcon /> : <CloseRoundedIcon />}
						</MenuButton>
						<NavbarBreadcrumbs />
					</Flex>
					<Flex
						flexDirection="row"
						gap={6}
						alignItems="center"
						justifyContent="flex-end"
						width="fill-available"
					>
						{children}
						<ColorModeIconDropdown />
					</Flex>
				</Flex>
			</Card>
		</>
	);
}
