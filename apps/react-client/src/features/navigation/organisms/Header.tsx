import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "../../../common/primitives/Flex";
import { useGlobalSettingsStore } from "../../../common/store/globalSettingsStore";
import { ColorModeIconDropdown } from "../../../theme/ColorModeIconDropdown";
import { MenuButton } from "../molecules/MenuButton";
import { NavbarBreadcrumbs } from "../molecules/NavbarBreadcrumbs";

export function Header({ children }: { children?: React.ReactNode }) {
	const { toggleSideMenu } = useGlobalSettingsStore();

	return (
		<>
			<Card padding="2px 3px">
				<Flex
					width="fill-available"
					pad="2px 3px"
					gap={2}
					alignItems="center"
					justifyContent="space-between"
					position="relative"
					zIndex={1000}
				>
					<Flex flexDirection="row" gap={10} alignItems="center">
						<MenuButton aria-label="menu" onClick={() => toggleSideMenu()}>
							<MenuRoundedIcon />
						</MenuButton>
						<NavbarBreadcrumbs />
					</Flex>
					<Flex flexDirection="row" gap={6} alignItems="center">
						{children}
						<ColorModeIconDropdown />
					</Flex>
				</Flex>
			</Card>
		</>
	);
}
