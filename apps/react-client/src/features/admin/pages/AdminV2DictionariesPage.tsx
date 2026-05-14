import { V2AdminButton } from "@react-client/features/admin/V2Admin/atoms/V2AdminButton";
import { V2DictionaryList } from "@react-client/features/admin/V2Admin/organisms/V2DictionaryList";
import { Header } from "@react-client/features/navigation/organisms/Header";
import { useCreateV2Dictionary } from "@react-client/common/api/queries/v2-templates";
import { Flex } from "@react-client/common/primitives/Flex";

export function AdminV2DictionariesPage() {
	const createDictionary = useCreateV2Dictionary();

	const handleAddDictionary = () => {
		createDictionary.mutate({
			code: `dictionary-${Date.now()}`,
			name: "Новый словарь",
			description: "Описание словаря",
		});
	};

	return (
		<Flex flexDirection="column" flexGrow={1} minHeight="0">
			<Header>
				<V2AdminButton onClick={handleAddDictionary}>
					Создать словарь
				</V2AdminButton>
			</Header>
				<V2DictionaryList />
		</Flex>
	);
}
