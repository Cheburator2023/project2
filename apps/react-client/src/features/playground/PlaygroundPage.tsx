import { Typography } from "@mui/material";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { Fragment } from "react/jsx-runtime";

const data = [
	{ name: "exmp1", Component: <div /> },
	{ name: "exmp2", Component: <div /> },
];

export const PlaygroundPage = () => {
	return (
		<Flex sx={{ padding: "40px" }} flexDirection="column">
			<Typography variant="h1">
				<b>Плейграунд</b>
			</Typography>
			<Spacer />

			{data.map((item) => (
				<Fragment key={item.name}>
					<Card>
						<Typography variant="h2">{item.name}</Typography>
						<Spacer />
					</Card>
					<Spacer />
				</Fragment>
			))}

			<Spacer />
		</Flex>
	);
};
