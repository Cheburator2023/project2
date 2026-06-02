import { Typography } from "@mui/material";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { V2PlaygroundPage } from "@react-client/features/playground/v2_playground/pages/V2PlaygroundPage";
import { Fragment } from "react/jsx-runtime";

const data = [
	{
		name: "V2 Playground — список шаблонов и пример анкеты",
		Component: <V2PlaygroundPage />,
	},
];

export const PlaygroundPage = () => {
	return (
		<Flex flexDirection="column" data-test-id="playground-page--Flex-0">
			<Header />

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
