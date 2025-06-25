import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { AnketaBasicLayout } from "@react-client/features/anketa/organisms/AnketaBasicLayout";
import { Header } from "@react-client/features/navigation/organisms/Header";

export const AnketaCreatePage = () => {
	return (
		<div>
			<Spacer height={6} />
			<Header />
			<Spacer height={12} />
			<Flex width="100%" height="-webkit-fill-available">
				<AnketaBasicLayout isCreate />
			</Flex>
		</div>
	);
};
