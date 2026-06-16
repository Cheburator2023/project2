import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TaskEntity } from "./entities/task.entity";
import { TaskTrackerController } from "./controllers/task-tracker.controller";
import { TaskTrackerService } from "./services/task-tracker.service";

@Module({
	imports: [TypeOrmModule.forFeature([TaskEntity])],
	controllers: [TaskTrackerController],
	providers: [TaskTrackerService],
	exports: [TaskTrackerService],
})
export class TaskTrackerModule {}
