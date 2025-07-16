import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";
import { getDataSourceOptions } from "./shared/database/database.config";

const configService = new ConfigService();

export default new DataSource(getDataSourceOptions(configService));
