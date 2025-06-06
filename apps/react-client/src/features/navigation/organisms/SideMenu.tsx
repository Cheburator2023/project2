import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import MuiDrawer, { drawerClasses } from "@mui/material/Drawer";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { styled, useColorScheme } from "@mui/material/styles";
import { Flex } from "@react-client/common/primitives/Flex";
import { MenuContent } from "../molecules/MenuContent";
import { OptionsMenu } from "../molecules/OptionsMenu";

const drawerWidth = 240;

const Drawer = styled(MuiDrawer)<{ mode?: string }>(({ mode }) => {
	return {
		width: drawerWidth,
		flexShrink: 0,
		boxSizing: "border-box",
		[`& .${drawerClasses.paper}`]: {
			width: drawerWidth,
			backgroundColor: mode === "light" ? "#F5F6FA" : "#191b25",
			boxSizing: "border-box",
		},
	};
});

export function SideMenu({ open = false }) {
	const { mode, systemMode, setMode } = useColorScheme();

	return (
		<Drawer variant="persistent" open={open} mode={mode}>
			<Flex pad="32px 10px 0" justifyContent="center" alignItems="center">
				<svg
					width="244"
					height="16"
					viewBox="0 0 244 16"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M8.45394 13.208H7.34994C1.10994 13.208 0.389938 10.52 0.389938 8.952V8.776H4.27794C4.32594 9.496 4.74194 10.664 7.81394 10.664H8.03794C11.1739 10.664 11.5259 10.04 11.5259 9.4C11.5259 8.712 11.1579 8.28 8.40594 8.2L6.35794 8.152C1.90994 8.024 0.549938 6.52 0.549938 4.664V4.52C0.549938 2.744 1.60594 0.888 7.02994 0.888H8.13394C13.7659 0.888 15.0459 2.856 15.0459 4.648V4.808H11.1739C11.0939 4.36 10.8539 3.384 7.73394 3.384H7.47794C4.59794 3.384 4.38994 3.896 4.38994 4.408C4.38994 4.92 4.70994 5.384 7.14194 5.432L9.14194 5.464C13.6219 5.544 15.4299 6.632 15.4299 9V9.224C15.4299 11.192 14.4379 13.208 8.45394 13.208ZM24.5102 13.176H23.9342C17.5502 13.176 16.5102 9.112 16.5102 6.872V1.096H20.2542V6.648C20.2542 8.184 20.9422 10.088 24.1902 10.088C27.3902 10.088 28.0942 8.184 28.0942 6.648V1.096H31.8222V6.872C31.8222 9.112 30.6062 13.176 24.5102 13.176ZM33.4979 13V1.096H38.7939L42.9059 8.504L47.0339 1.096H52.1379V13H48.4579V4.76L43.7699 13H41.7699L37.0819 4.76V13H33.4979Z"
						fill="#6380C1"
					/>
					<path
						d="M62.1107 13.208H61.4547C54.5587 13.208 53.4867 9.352 53.4867 7.24V6.776C53.4867 4.616 54.4147 0.888 61.4547 0.888H62.1107C69.0067 0.888 70.0787 4.184 70.0787 5.576V5.752H66.1267C66.0307 5.432 65.5507 3.768 61.7747 3.768C58.2067 3.768 57.3907 5.368 57.3907 6.856V7.048C57.3907 8.456 58.3347 10.312 61.8067 10.312C65.6627 10.312 66.0467 8.472 66.1427 8.2H70.0947V8.376C70.0947 9.88 68.9107 13.208 62.1107 13.208ZM71.2948 13V1.096H76.5908L80.7028 8.504L84.8308 1.096H89.9348V13H86.2548V4.76L81.5668 13H79.5668L74.8788 4.76V13H71.2948ZM101.206 8.136L98.9018 3.672L96.6938 8.136H101.206ZM103.702 13L102.582 10.824H95.3658L94.2938 13H90.5018L96.5178 1.096H101.35L107.718 13H103.702ZM117.207 9.032H112.007V13H108.279V1.096H117.207C121.495 1.096 122.759 2.792 122.759 4.968V5.128C122.759 7.256 121.463 9.032 117.207 9.032ZM112.007 3.8V6.36H117.143C118.311 6.36 118.871 5.928 118.871 5.112V5.064C118.871 4.248 118.343 3.8 117.143 3.8H112.007ZM128.513 13V3.912H123.393V1.096H137.409V3.912H132.273V13H128.513ZM137.493 15.416V13.32H150.533V15.416H137.493ZM161.034 8.136L158.73 3.672L156.522 8.136H161.034ZM163.53 13L162.41 10.824H155.194L154.122 13H150.33L156.346 1.096H161.178L167.546 13H163.53ZM168.059 13V1.096H171.787V5.432H179.787V1.096H183.515V13H179.787V8.312H171.787V13H168.059ZM195.263 13L188.975 7.384V13H185.247V1.096H188.975V6.056L195.071 1.096H199.807L192.959 6.536L200.127 13H195.263ZM200.685 1.096H213.229V3.8H204.365V5.56H213.021V8.28H204.365V10.232H213.389V13H200.685V1.096ZM219.341 13V3.912H214.221V1.096H228.237V3.912H223.101V13H219.341ZM236.753 8.136L234.449 3.672L232.241 8.136H236.753ZM239.249 13L238.129 10.824H230.913L229.841 13H226.049L232.065 1.096H236.897L243.265 13H239.249Z"
						fill={mode === "light" ? "black" : "white"}
					/>
				</svg>
			</Flex>
			<Box
				sx={{
					overflow: "auto",
					height: "100%",
					display: "flex",
					flexDirection: "column",
				}}
			>
				<MenuContent />
			</Box>
			<Stack
				direction="row"
				sx={{
					p: 2,
					gap: 1,
					alignItems: "center",
					borderTop: "1px solid",
					borderColor: "divider",
				}}
			>
				<Avatar
					sizes="small"
					alt="Useroslav Userov"
					src="/static/images/avatar/7.jpg"
					sx={{ width: 36, height: 36 }}
				/>
				<Box sx={{ mr: "auto" }}>
					<Typography
						variant="body2"
						sx={{ fontWeight: 500, lineHeight: "16px" }}
					>
						Useroslav Userov
					</Typography>
					<Typography variant="caption" sx={{ color: "text.secondary" }}>
						ssUserov@vtb.com
					</Typography>
				</Box>
				<OptionsMenu />
			</Stack>
		</Drawer>
	);
}
