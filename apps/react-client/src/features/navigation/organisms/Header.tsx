import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import { styled } from "@mui/system";
import { DatePicker } from "@mui/x-date-pickers";
import { Card } from "@react-client/common/muiCustom/Card";
import { SearchInput } from "@react-client/features/navigation/organisms/SearchInput";
import { Flex } from "../../../common/primitives/Flex";
import { useGlobalSettingsStore } from "../../../common/store/globalSettingsStore";
import { ColorModeIconDropdown } from "../../../theme/ColorModeIconDropdown";
import { MenuButton } from "../molecules/MenuButton";
import { NavbarBreadcrumbs } from "../molecules/NavbarBreadcrumbs";

export function Header({ navbarVisible = true }) {
	const { toggleSideMenu } = useGlobalSettingsStore();

	return (
		<>
			<Card padding="2px 3px">
				<StyledFlex
					width="100%"
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
					{navbarVisible ? (
						<Flex flexDirection="row" gap={6} alignItems="center">
							<SearchInput />
							<DatePicker />
							<ColorModeIconDropdown />
						</Flex>
					) : (
						<ColorModeIconDropdown />
					)}
				</StyledFlex>
			</Card>
		</>
	);
}

const StyledFlex = styled(Flex)`
	width: -moz-available;
	width: -webkit-fill-available;
	width: fill-available;
`;
