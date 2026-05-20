/** biome-ignore-all lint/correctness/noConstantCondition: <explanation> */

import React from "react";
import {
  Grid, IconButton,
} from "@mui/material";
import GeneralInfo from "@react-client/version/v2/src/features/anketaCRUD/organisms/GeneralInfo";
import {Header} from "@react-client/features/navigation/organisms/Header";
import SaveIcon from "@mui/icons-material/Save";
import {Flex} from "@react-client/common/primitives/Flex";
import FinalScoreCard from "@react-client/version/v2/src/features/anketaCRUD/organisms/FinalScoreCard";
import DetailedInfo from "@react-client/version/v2/src/features/anketaCRUD/organisms/DetailedInfo";
const APP_NAME = process.env.APP_NAME;

export const AnketaPreviewPage = () => {

	return (
        <div data-test-id="anketa-create-page--div-0">
          <Header data-test-id="anketa-create-page--Header-0">
            <IconButton onClick={()=>{}} title="Создать" >
              <SaveIcon />
            </IconButton>
          </Header>
          <Grid
              display={'grid'}
              gridTemplateColumns={'2fr 1fr'}
              gap={2}
              width="100%"
              height="-webkit-fill-available"
              data-test-id="anketa-create-page--Flex-0"
          >
            <Flex
                flexDirection={'column'}
                >
             <GeneralInfo/>
             <DetailedInfo/>
            </Flex>
            <Flex
                flexDirection={'column'}
            >
              <FinalScoreCard/>
            </Flex>
          </Grid>
        </div>

    )
};
