import SaveIcon from "@mui/icons-material/Save";
import { IconButton } from "@mui/material";
import { DetailedInfo } from "@react-client/features/v2/anketaCRUD/organisms/DetailedInfo";
import { FinalScoreCard } from "@react-client/features/v2/anketaCRUD/organisms/FinalScoreCard";
import { GeneralInfo } from "@react-client/features/v2/anketaCRUD/organisms/GeneralInfo";
import { AnketaFormPageLayout } from "@react-client/features/v2/anketaCRUD/templates/AnketaFormPageLayout";

export const AnketaPreviewPageV2 = () => {
	return (
		<AnketaFormPageLayout
			data-test-id="anketa-preview-page"
			headerActions={
				<IconButton onClick={() => {}} title="Сохранить">
					<SaveIcon />
				</IconButton>
			}
			main={
				<>
					<GeneralInfo />
					<DetailedInfo />
				</>
			}
			sidebar={<FinalScoreCard />}
		/>
	);
};
