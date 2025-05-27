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
			<Flex pad="20px 10px" justifyContent="center" alignItems="center">
				<svg
					width="64"
					viewBox="0 0 208 50"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M32.5345 49.332H28.1185C3.1585 49.332 0.2785 38.58 0.2785 32.308V31.604H15.8305C16.0225 34.484 17.6865 39.156 29.9745 39.156H30.8705C43.4145 39.156 44.8225 36.66 44.8225 34.1C44.8225 31.348 43.3505 29.62 32.3425 29.3L24.1505 29.108C6.3585 28.596 0.9185 22.58 0.9185 15.156V14.58C0.9185 7.476 5.1425 0.0519981 26.8385 0.0519981H31.2545C53.7825 0.0519981 58.9025 7.924 58.9025 15.092V15.732H43.4145C43.0945 13.94 42.1345 10.036 29.6545 10.036H28.6305C17.1105 10.036 16.2785 12.084 16.2785 14.132C16.2785 16.18 17.5585 18.036 27.2865 18.228L35.2865 18.356C53.2065 18.676 60.4385 23.028 60.4385 32.5V33.396C60.4385 41.268 56.4705 49.332 32.5345 49.332ZM96.7595 49.204H94.4555C68.9195 49.204 64.7595 32.948 64.7595 23.988V0.883999H79.7355V23.092C79.7355 29.236 82.4875 36.852 95.4795 36.852C108.28 36.852 111.096 29.236 111.096 23.092V0.883999H126.007V23.988C126.007 32.948 121.144 49.204 96.7595 49.204ZM132.711 48.5V0.883999H153.895L170.343 30.516L186.855 0.883999H207.271V48.5H192.551V15.54L173.799 48.5H165.799L147.047 15.54V48.5H132.711Z"
						fill="#6380C1"
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
