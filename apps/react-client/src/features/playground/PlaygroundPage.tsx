import { Typography } from "@mui/material";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { Fragment } from "react/jsx-runtime";

const data = [
	{
		name: "JsonFormGenerator",
		Component: <div data-test-id="playground-page--div-0" />,
	},
];

export const PlaygroundPage = () => {
	return (
		<Flex
			sx={{ padding: "40px" }}
			flexDirection="column"
			data-test-id="playground-page--Flex-0"
		>
			<Typography variant="h1" data-test-id="playground-page--Typography-0">
				<b data-test-id="playground-page--b-0">Плейграунд</b>
			</Typography>
			<Spacer data-test-id="playground-page--Spacer-0" />
			{data.map((item) => (
				<Fragment key={item.name} data-test-id="playground-page--Fragment-0">
					<Card data-test-id="playground-page--Card-0">
						<Typography
							variant="h2"
							data-test-id="playground-page--Typography-1"
						>
							{item.name}
						</Typography>
						<Spacer data-test-id="playground-page--Spacer-1" />
						{item.Component}
					</Card>
					<Spacer data-test-id="playground-page--Spacer-2" />
				</Fragment>
			))}
			<Spacer data-test-id="playground-page--Spacer-3" />
		</Flex>
	);
};
