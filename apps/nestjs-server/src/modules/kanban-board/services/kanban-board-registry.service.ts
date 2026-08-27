import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Not, Repository } from "typeorm";
import { ulid } from "ulid";
import {
	KANBAN_BOARD_HEAP_BOARD_ID,
	KANBAN_BOARD_STATUSES,
	KANBAN_BOARD_SYSTEMS,
	KANBAN_BOARD_CANCELLED_COLUMN_ID,
	ResetKanbanBoardColumnsResultDto,
	defaultKanbanBoardColumns,
	resolveKanbanBoardLegacyColumnId,
	kanbanBoardAssigneeRoleTitle,
	kanbanBoardEffectiveEstimatePd,
	kanbanBoardEffectiveSprintCapacityPd,
	kanbanBoardIsDoneColumn,
	kanbanBoardIsCancelledColumn,
	kanbanBoardPriorityTitle,
	kanbanBoardTaskAssigneeRoles,
	kanbanBoardTaskAssigneeRoleTitles,
	kanbanBoardTaskAssignees,
	kanbanBoardTaskAssigneesTitle,
	kanbanBoardStandTitle,
	kanbanBoardSystemTitle,
	kanbanBoardTaskReleasesTitle,
	kanbanBoardTaskTypeTitle,
	kanbanBoardWorkTypeTitle,
	isKanbanBoardAssigneeRoleId,
	normalizeKanbanBoardTaskContent,
	normalizeTrackerCode,
	formatKanbanBoardKey,
	formatKanbanTaskKey,
	parseKanbanBoardKey,
	parseKanbanTaskKey,
	pickKanbanBoardColumnColor,
	type KanbanBoardPlanningImportResultDto,
	type KanbanBoardPlanningKanbanImportBoardDto,
	type AssignKanbanBoardTasksToBoardRequestDto,
	type AssignKanbanBoardTasksToBoardResultDto,
	type KanbanBoardSystemId,
	type TrashKanbanBoardColumnTasksResultDto,
	type CreateKanbanBoardCustomerRequestDto,
	type CreateKanbanBoardAssigneeRequestDto,
	type CreateKanbanBoardBoardRequestDto,
	type CreateKanbanBoardColumnRequestDto,
	type CreateKanbanBoardProjectRequestDto,
	type CreateKanbanBoardSprintRequestDto,
	type CreateKanbanBoardStreamRequestDto,
	type CreateKanbanBoardSupersprintRequestDto,
	type CreateKanbanBoardTaskRequestDto,
	type KanbanBoardCustomerDto,
	type KanbanBoardAssigneeDto,
	type KanbanBoardAssigneeRoleId,
	type KanbanBoardBoardDto,
	type KanbanBoardColumnDto,
	type KanbanBoardProjectDto,
	type KanbanBoardSprintDto,
	type KanbanBoardSettingsDto,
	type KanbanBoardStreamDto,
	type KanbanBoardSupersprintDto,
	type KanbanBoardTaskContent,
	type KanbanBoardTaskRecord,
	type KanbanBoardTaskRegistryDto,
	type KanbanBoardTaskReleaseRefDto,
	type UpdateKanbanBoardCustomerRequestDto,
	type UpdateKanbanBoardAssigneeRequestDto,
	type UpdateKanbanBoardBoardRequestDto,
	type UpdateKanbanBoardColumnRequestDto,
	type UpdateKanbanBoardProjectRequestDto,
	type UpdateKanbanBoardSettingsRequestDto,
	type UpdateKanbanBoardSprintRequestDto,
	type UpdateKanbanBoardStreamRequestDto,
	type UpdateKanbanBoardSupersprintRequestDto,
	type UpdateKanbanBoardTaskRequestDto,
} from "@smart-anketa/api-contract";
import { KanbanBoardEntity } from "../entities/kanban-board.entity";
import { KanbanBoardAssigneeEntity } from "../entities/kanban-board-assignee.entity";
import { KanbanBoardColumnEntity } from "../entities/kanban-board-column.entity";
import { KanbanBoardProjectEntity } from "../entities/kanban-board-project.entity";
import { KanbanBoardSprintEntity } from "../entities/kanban-board-sprint.entity";
import { KanbanBoardStreamEntity } from "../entities/kanban-board-stream.entity";
import { KanbanBoardCustomerEntity } from "../entities/kanban-board-customer.entity";
import { KanbanBoardSupersprintEntity } from "../entities/kanban-board-supersprint.entity";
import { KanbanBoardTaskEntity } from "../entities/kanban-board-task.entity";
import { KanbanBoardReleaseEntity } from "../entities/kanban-board-release.entity";
import { KanbanBoardReleaseTaskEntity } from "../entities/kanban-board-release-task.entity";
import {
	KANBAN_BOARD_SETTINGS_DEFAULT_ID,
	KanbanBoardSettingsEntity,
} from "../entities/kanban-board-settings.entity";
import { KanbanBoardService } from "./kanban-board.service";
import {
	exportTasksRegistryWorkbook,
	exportTasksRegistryXlsx,
} from "../utils/kanban-board-registry-export.util";
import {
	importPlanningXlsx,
	normalizePlanningTitleKey,
} from "../utils/kanban-board-planning-import.util";
import type {
	KanbanPlanningSheetParseResult,
	PlanningImportResult,
} from "../utils/kanban-board-planning-import.util";
import {
	buildAssigneeImportCode,
	buildCustomerImportCode,
	matchAssigneeByName,
	matchCustomerByText,
	matchSprintByText,
	matchStreamByText,
	resolveBestStatusColumnId,
	resolveTaskTypeIdFromText,
	resolveWorkTypeIdFromText,
} from "../utils/kanban-board-planning-import-registry.util";
import { buildMeta } from "../utils/kanban-board-snapshot.util";
import { KanbanBoardTaskImageService } from "./kanban-board-task-image.service";
import { KanbanBoardTaskFileService } from "./kanban-board-task-file.service";
import { KanbanBoardTaskLockService } from "./kanban-board-task-lock.service";
import { KanbanBoardHistoryService } from "./kanban-board-history.service";
import { assertKanbanBoardTaskVersion } from "../utils/kanban-board-task-edit.util";
import { loadReleasesByTaskIds } from "../utils/kanban-board-task-releases.util";

@Injectable()
export class KanbanBoardRegistryService {
	constructor(
		@InjectRepository(KanbanBoardProjectEntity)
		private readonly projectRepository: Repository<KanbanBoardProjectEntity>,
		@InjectRepository(KanbanBoardEntity)
		private readonly boardRepository: Repository<KanbanBoardEntity>,
		@InjectRepository(KanbanBoardColumnEntity)
		private readonly columnRepository: Repository<KanbanBoardColumnEntity>,
		@InjectRepository(KanbanBoardAssigneeEntity)
		private readonly assigneeRepository: Repository<KanbanBoardAssigneeEntity>,
		@InjectRepository(KanbanBoardSupersprintEntity)
		private readonly supersprintRepository: Repository<KanbanBoardSupersprintEntity>,
		@InjectRepository(KanbanBoardSprintEntity)
		private readonly sprintRepository: Repository<KanbanBoardSprintEntity>,
		@InjectRepository(KanbanBoardStreamEntity)
		private readonly streamRepository: Repository<KanbanBoardStreamEntity>,
		@InjectRepository(KanbanBoardCustomerEntity)
		private readonly customerRepository: Repository<KanbanBoardCustomerEntity>,
		@InjectRepository(KanbanBoardTaskEntity)
		private readonly taskRepository: Repository<KanbanBoardTaskEntity>,
		@InjectRepository(KanbanBoardReleaseEntity)
		private readonly releaseRepository: Repository<KanbanBoardReleaseEntity>,
		@InjectRepository(KanbanBoardReleaseTaskEntity)
		private readonly membershipRepository: Repository<KanbanBoardReleaseTaskEntity>,
		@InjectRepository(KanbanBoardSettingsEntity)
		private readonly settingsRepository: Repository<KanbanBoardSettingsEntity>,
		private readonly kanbanBoardService: KanbanBoardService,
		private readonly taskImageService: KanbanBoardTaskImageService,
		private readonly taskFileService: KanbanBoardTaskFileService,
		private readonly taskLockService: KanbanBoardTaskLockService,
		private readonly historyService: KanbanBoardHistoryService,
	) {}

	async getSettings(): Promise<KanbanBoardSettingsDto> {
		const settings = await this.ensureSettings();
		return this.toSettingsDto(settings);
	}

	async updateSettings(
		dto: UpdateKanbanBoardSettingsRequestDto,
	): Promise<KanbanBoardSettingsDto> {
		const settings = await this.ensureSettings();
		if (dto.defaultSprintCapacityPd !== undefined) {
			if (
				Number.isNaN(dto.defaultSprintCapacityPd) ||
				dto.defaultSprintCapacityPd < 0
			) {
				throw new BadRequestException(
					"Ёмкость спринта по умолчанию должна быть неотрицательным числом",
				);
			}
			settings.defaultSprintCapacityPd = String(dto.defaultSprintCapacityPd);
		}
		if (dto.defaultCurrentUserAssigneeName !== undefined) {
			const name = dto.defaultCurrentUserAssigneeName?.trim() ?? "";
			if (name) {
				const assignee = await this.assigneeRepository.findOne({
					where: { name },
				});
				if (!assignee) {
					throw new BadRequestException("Исполнитель не найден в справочнике");
				}
				settings.defaultCurrentUserAssigneeName = name;
			} else {
				settings.defaultCurrentUserAssigneeName = null;
			}
		}
		await this.settingsRepository.save(settings);
		return this.toSettingsDto(settings);
	}

	async findAllProjects(): Promise<KanbanBoardProjectDto[]> {
		const projects = await this.projectRepository.find({
			order: { name: "ASC" },
		});
		const boardCounts = await this.boardRepository
			.createQueryBuilder("board")
			.select("board.project_id", "projectId")
			.addSelect("COUNT(*)", "count")
			.groupBy("board.project_id")
			.getRawMany<{ projectId: string; count: string }>();
		const countMap = new Map(
			boardCounts.map((row) => [row.projectId, Number(row.count)]),
		);

		return projects.map((project) => this.toProjectDto(project, countMap));
	}

	async createProject(
		dto: CreateKanbanBoardProjectRequestDto,
	): Promise<KanbanBoardProjectDto> {
		const code = normalizeTrackerCode(dto.code);
		const name = dto.name.trim();
		if (!code || !name) {
			throw new BadRequestException("Код и название обязательны");
		}

		const entity = this.projectRepository.create({
			id: ulid(),
			code,
			name,
			description: dto.description?.trim() || null,
			isStock: false,
		});
		await this.projectRepository.save(entity);
		return this.toProjectDto(entity, new Map([[entity.id, 0]]));
	}

	async updateProject(
		id: string,
		dto: UpdateKanbanBoardProjectRequestDto,
	): Promise<KanbanBoardProjectDto> {
		const project = await this.projectRepository.findOne({ where: { id } });
		if (!project) throw new NotFoundException("Проект не найден");
		if (project.isStock && dto.code && dto.code !== project.code) {
			throw new BadRequestException("Нельзя менять код стокового проекта");
		}

		if (dto.code !== undefined) {
			project.code = normalizeTrackerCode(dto.code);
		}
		if (dto.name !== undefined) project.name = dto.name.trim();
		if (dto.description !== undefined) {
			project.description = dto.description?.trim() || null;
		}

		await this.projectRepository.save(project);
		const boardCount = await this.boardRepository.count({
			where: { projectId: project.id },
		});
		return this.toProjectDto(project, new Map([[project.id, boardCount]]));
	}

	async deleteProject(id: string): Promise<void> {
		const project = await this.projectRepository.findOne({ where: { id } });
		if (!project) throw new NotFoundException("Проект не найден");
		if (project.isStock) {
			throw new BadRequestException("Стоковый проект нельзя удалить");
		}
		await this.projectRepository.remove(project);
	}

	async findAllAssignees(): Promise<KanbanBoardAssigneeDto[]> {
		const [assignees, settings] = await Promise.all([
			this.assigneeRepository.find({ order: { name: "ASC" } }),
			this.ensureSettings(),
		]);
		const taskCounts = await this.countTasksByAssigneeName();
		const defaultCapacity = this.parseNumeric(settings.defaultSprintCapacityPd);
		return assignees.map((assignee) =>
			this.toAssigneeDto(assignee, taskCounts, defaultCapacity),
		);
	}

	async createAssignee(
		dto: CreateKanbanBoardAssigneeRequestDto,
	): Promise<KanbanBoardAssigneeDto> {
		const code = normalizeTrackerCode(dto.code);
		const name = dto.name.trim();
		if (!code || !name) {
			throw new BadRequestException("Код и имя обязательны");
		}

		const entity = this.assigneeRepository.create({
			id: ulid(),
			code,
			name,
			email: dto.email?.trim() || null,
			role: this.normalizeAssigneeRole(dto.role),
			sprintCapacityPd:
				dto.sprintCapacityPd === undefined || dto.sprintCapacityPd === null
					? null
					: String(dto.sprintCapacityPd),
		});
		await this.assigneeRepository.save(entity);
		const settings = await this.ensureSettings();
		return this.toAssigneeDto(
			entity,
			new Map(),
			this.parseNumeric(settings.defaultSprintCapacityPd),
		);
	}

	async updateAssignee(
		id: string,
		dto: UpdateKanbanBoardAssigneeRequestDto,
	): Promise<KanbanBoardAssigneeDto> {
		const assignee = await this.assigneeRepository.findOne({ where: { id } });
		if (!assignee) throw new NotFoundException("Исполнитель не найден");

		const previousName = assignee.name;
		if (dto.code !== undefined) assignee.code = normalizeTrackerCode(dto.code);
		if (dto.name !== undefined) assignee.name = dto.name.trim();
		if (dto.email !== undefined) {
			assignee.email = dto.email?.trim() || null;
		}
		if (dto.role !== undefined) {
			assignee.role = this.normalizeAssigneeRole(dto.role);
		}
		if (dto.sprintCapacityPd !== undefined) {
			if (dto.sprintCapacityPd === null) {
				assignee.sprintCapacityPd = null;
			} else if (
				Number.isNaN(dto.sprintCapacityPd) ||
				dto.sprintCapacityPd < 0
			) {
				throw new BadRequestException(
					"Ёмкость спринта должна быть неотрицательным числом",
				);
			} else {
				assignee.sprintCapacityPd = String(dto.sprintCapacityPd);
			}
		}
		if (!assignee.code || !assignee.name) {
			throw new BadRequestException("Код и имя обязательны");
		}

		await this.assigneeRepository.save(assignee);
		if (dto.name !== undefined && assignee.name !== previousName) {
			await this.renameAssigneeInTasks(previousName, assignee.name);
		}

		const taskCounts = await this.countTasksByAssigneeName();
		const settings = await this.ensureSettings();
		return this.toAssigneeDto(
			assignee,
			taskCounts,
			this.parseNumeric(settings.defaultSprintCapacityPd),
		);
	}

	async deleteAssignee(id: string): Promise<void> {
		const assignee = await this.assigneeRepository.findOne({ where: { id } });
		if (!assignee) throw new NotFoundException("Исполнитель не найден");

		const taskCount = await this.countTasksWithAssigneeName(assignee.name);
		if (taskCount > 0) {
			throw new BadRequestException(
				"Нельзя удалить исполнителя, назначенного на задачи",
			);
		}

		await this.assigneeRepository.remove(assignee);
	}

	async findAllSupersprints(): Promise<KanbanBoardSupersprintDto[]> {
		const supersprints = await this.supersprintRepository.find({
			order: { startDate: "DESC", name: "ASC" },
		});
		const sprintCounts = await this.sprintRepository
			.createQueryBuilder("sprint")
			.select("sprint.supersprint_id", "supersprintId")
			.addSelect("COUNT(*)", "count")
			.where("sprint.supersprint_id IS NOT NULL")
			.groupBy("sprint.supersprint_id")
			.getRawMany<{ supersprintId: string; count: string }>();
		const countMap = new Map(
			sprintCounts.map((row) => [row.supersprintId, Number(row.count)]),
		);

		return supersprints.map((item) => this.toSupersprintDto(item, countMap));
	}

	async createSupersprint(
		dto: CreateKanbanBoardSupersprintRequestDto,
	): Promise<KanbanBoardSupersprintDto> {
		const code = normalizeTrackerCode(dto.code);
		const name = dto.name.trim();
		const startDate = dto.startDate.trim();
		if (!code || !name || !startDate) {
			throw new BadRequestException("Код, название и дата начала обязательны");
		}

		const entity = this.supersprintRepository.create({
			id: ulid(),
			code,
			name,
			description: dto.description?.trim() || null,
			startDate,
			endDate: dto.endDate?.trim() || null,
		});
		await this.supersprintRepository.save(entity);
		return this.toSupersprintDto(entity, new Map());
	}

	async updateSupersprint(
		id: string,
		dto: UpdateKanbanBoardSupersprintRequestDto,
	): Promise<KanbanBoardSupersprintDto> {
		const supersprint = await this.supersprintRepository.findOne({ where: { id } });
		if (!supersprint) throw new NotFoundException("Суперспринт не найден");

		if (dto.code !== undefined) {
			supersprint.code = normalizeTrackerCode(dto.code);
		}
		if (dto.name !== undefined) supersprint.name = dto.name.trim();
		if (dto.description !== undefined) {
			supersprint.description = dto.description?.trim() || null;
		}
		if (dto.startDate !== undefined) supersprint.startDate = dto.startDate.trim();
		if (dto.endDate !== undefined) {
			supersprint.endDate = dto.endDate?.trim() || null;
		}
		if (!supersprint.code || !supersprint.name || !supersprint.startDate) {
			throw new BadRequestException("Код, название и дата начала обязательны");
		}

		await this.supersprintRepository.save(supersprint);
		const sprintCount = await this.sprintRepository.count({
			where: { supersprintId: supersprint.id },
		});
		return this.toSupersprintDto(
			supersprint,
			new Map([[supersprint.id, sprintCount]]),
		);
	}

	async deleteSupersprint(id: string): Promise<void> {
		const supersprint = await this.supersprintRepository.findOne({ where: { id } });
		if (!supersprint) throw new NotFoundException("Суперспринт не найден");

		const sprintCount = await this.sprintRepository.count({
			where: { supersprintId: id },
		});
		if (sprintCount > 0) {
			throw new BadRequestException(
				"Нельзя удалить суперспринт со связанными спринтами",
			);
		}

		await this.supersprintRepository.remove(supersprint);
	}

	async findAllSprints(): Promise<KanbanBoardSprintDto[]> {
		const sprints = await this.sprintRepository.find({
			relations: { supersprint: true },
			order: { startDate: "DESC", name: "ASC" },
		});
		const taskCounts = await this.countTasksBySprintId();
		return sprints.map((sprint) => this.toSprintDto(sprint, taskCounts));
	}

	async createSprint(
		dto: CreateKanbanBoardSprintRequestDto,
	): Promise<KanbanBoardSprintDto> {
		const code = normalizeTrackerCode(dto.code);
		const name = dto.name.trim();
		const startDate = dto.startDate.trim();
		if (!code || !name || !startDate) {
			throw new BadRequestException("Код, название и дата начала обязательны");
		}

		let supersprint: KanbanBoardSupersprintEntity | null = null;
		if (dto.supersprintId) {
			supersprint = await this.supersprintRepository.findOne({
				where: { id: dto.supersprintId },
			});
			if (!supersprint) throw new NotFoundException("Суперспринт не найден");
		}

		const entity = this.sprintRepository.create({
			id: ulid(),
			supersprintId: supersprint?.id ?? null,
			code,
			name,
			description: dto.description?.trim() || null,
			startDate,
			endDate: dto.endDate?.trim() || null,
		});
		entity.supersprint = supersprint;
		await this.sprintRepository.save(entity);
		return this.toSprintDto(entity, new Map());
	}

	async updateSprint(
		id: string,
		dto: UpdateKanbanBoardSprintRequestDto,
	): Promise<KanbanBoardSprintDto> {
		const sprint = await this.sprintRepository.findOne({
			where: { id },
			relations: { supersprint: true },
		});
		if (!sprint) throw new NotFoundException("Спринт не найден");

		if (dto.supersprintId !== undefined) {
			if (dto.supersprintId) {
				const supersprint = await this.supersprintRepository.findOne({
					where: { id: dto.supersprintId },
				});
				if (!supersprint) throw new NotFoundException("Суперспринт не найден");
				sprint.supersprintId = supersprint.id;
				sprint.supersprint = supersprint;
			} else {
				sprint.supersprintId = null;
				sprint.supersprint = null;
			}
		}
		if (dto.code !== undefined) sprint.code = normalizeTrackerCode(dto.code);
		if (dto.name !== undefined) sprint.name = dto.name.trim();
		if (dto.description !== undefined) {
			sprint.description = dto.description?.trim() || null;
		}
		if (dto.startDate !== undefined) sprint.startDate = dto.startDate.trim();
		if (dto.endDate !== undefined) sprint.endDate = dto.endDate?.trim() || null;
		if (!sprint.code || !sprint.name || !sprint.startDate) {
			throw new BadRequestException("Код, название и дата начала обязательны");
		}

		await this.sprintRepository.save(sprint);
		const taskCounts = await this.countTasksBySprintId();
		return this.toSprintDto(sprint, taskCounts);
	}

	async deleteSprint(id: string): Promise<void> {
		const sprint = await this.sprintRepository.findOne({ where: { id } });
		if (!sprint) throw new NotFoundException("Спринт не найден");

		const taskCount = await this.countTasksWithSprintId(id);
		if (taskCount > 0) {
			throw new BadRequestException("Нельзя удалить спринт с задачами");
		}

		await this.sprintRepository.remove(sprint);
	}

	async findAllStreams(): Promise<KanbanBoardStreamDto[]> {
		const streams = await this.streamRepository.find({
			order: { name: "ASC" },
		});
		const taskCounts = await this.countTasksByStreamName();
		return streams.map((stream) => this.toStreamDto(stream, taskCounts));
	}

	async createStream(
		dto: CreateKanbanBoardStreamRequestDto,
	): Promise<KanbanBoardStreamDto> {
		const code = normalizeTrackerCode(dto.code);
		const name = dto.name.trim();
		if (!code || !name) {
			throw new BadRequestException("Код и название обязательны");
		}

		const entity = this.streamRepository.create({
			id: ulid(),
			code,
			name,
			description: dto.description?.trim() || null,
		});
		await this.streamRepository.save(entity);
		return this.toStreamDto(entity, new Map());
	}

	async updateStream(
		id: string,
		dto: UpdateKanbanBoardStreamRequestDto,
	): Promise<KanbanBoardStreamDto> {
		const stream = await this.streamRepository.findOne({ where: { id } });
		if (!stream) throw new NotFoundException("Стрим не найден");

		const previousName = stream.name;
		if (dto.code !== undefined) stream.code = normalizeTrackerCode(dto.code);
		if (dto.name !== undefined) stream.name = dto.name.trim();
		if (dto.description !== undefined) {
			stream.description = dto.description?.trim() || null;
		}
		if (!stream.code || !stream.name) {
			throw new BadRequestException("Код и название обязательны");
		}

		await this.streamRepository.save(stream);
		if (dto.name !== undefined && stream.name !== previousName) {
			await this.renameStreamInTasks(previousName, stream.name);
		}

		const taskCounts = await this.countTasksByStreamName();
		return this.toStreamDto(stream, taskCounts);
	}

	async deleteStream(id: string): Promise<void> {
		const stream = await this.streamRepository.findOne({ where: { id } });
		if (!stream) throw new NotFoundException("Стрим не найден");

		const taskCount = await this.countTasksWithStreamName(stream.name);
		if (taskCount > 0) {
			throw new BadRequestException("Нельзя удалить стрим, указанный в задачах");
		}

		await this.streamRepository.remove(stream);
	}

	async findAllCustomers(): Promise<KanbanBoardCustomerDto[]> {
		const customers = await this.customerRepository.find({
			order: { name: "ASC" },
		});
		const taskCounts = await this.countTasksByCustomerName();
		return customers.map((customer) => this.toCustomerDto(customer, taskCounts));
	}

	async createCustomer(
		dto: CreateKanbanBoardCustomerRequestDto,
	): Promise<KanbanBoardCustomerDto> {
		const code = normalizeTrackerCode(dto.code);
		const name = dto.name.trim();
		if (!code || !name) {
			throw new BadRequestException("Код и название обязательны");
		}

		const entity = this.customerRepository.create({
			id: ulid(),
			code,
			name,
			description: dto.description?.trim() || null,
		});
		await this.customerRepository.save(entity);
		return this.toCustomerDto(entity, new Map());
	}

	async updateCustomer(
		id: string,
		dto: UpdateKanbanBoardCustomerRequestDto,
	): Promise<KanbanBoardCustomerDto> {
		const customer = await this.customerRepository.findOne({ where: { id } });
		if (!customer) throw new NotFoundException("Заказчик не найден");

		const previousName = customer.name;
		if (dto.code !== undefined) customer.code = normalizeTrackerCode(dto.code);
		if (dto.name !== undefined) customer.name = dto.name.trim();
		if (dto.description !== undefined) {
			customer.description = dto.description?.trim() || null;
		}
		if (!customer.code || !customer.name) {
			throw new BadRequestException("Код и название обязательны");
		}

		await this.customerRepository.save(customer);
		if (dto.name !== undefined && customer.name !== previousName) {
			await this.renameCustomerInTasks(previousName, customer.name);
		}

		const taskCounts = await this.countTasksByCustomerName();
		return this.toCustomerDto(customer, taskCounts);
	}

	async deleteCustomer(id: string): Promise<void> {
		const customer = await this.customerRepository.findOne({ where: { id } });
		if (!customer) throw new NotFoundException("Заказчик не найден");

		const taskCount = await this.countTasksWithCustomerName(customer.name);
		if (taskCount > 0) {
			throw new BadRequestException(
				"Нельзя удалить заказчика, указанного в задачах",
			);
		}

		await this.customerRepository.remove(customer);
	}

	async findAllBoards(): Promise<KanbanBoardBoardDto[]> {
		const boards = await this.boardRepository.find({
			relations: { project: true },
			order: { sortOrder: "ASC", name: "ASC" },
		});
		const taskCounts = await this.taskRepository
			.createQueryBuilder("task")
			.select("task.board_id", "boardId")
			.addSelect("COUNT(*)", "count")
			.where("task.deleted_at IS NULL")
			.groupBy("task.board_id")
			.getRawMany<{ boardId: string; count: string }>();
		const countMap = new Map(
			taskCounts.map((row) => [row.boardId, Number(row.count)]),
		);
		const blockerCountMap = await this.countBlockersByBoardIds();

		return boards.map((board) =>
			this.toBoardDto(board, countMap, blockerCountMap),
		);
	}

	async resolveBoardId(ref: string): Promise<string> {
		const board = await this.findBoardEntityByRef(ref);
		return board.id;
	}

	async findBoardByRef(ref: string): Promise<KanbanBoardBoardDto> {
		const board = await this.findBoardEntityByRef(ref);
		const taskCount = await this.taskRepository.count({
			where: { boardId: board.id, deletedAt: IsNull() },
		});
		const blockerCount = await this.countBlockersOnBoard(board.id);
		return this.toBoardDto(
			board,
			new Map([[board.id, taskCount]]),
			new Map([[board.id, blockerCount]]),
		);
	}

	async findTaskByRef(ref: string): Promise<KanbanBoardTaskRegistryDto> {
		const task = await this.findTaskEntityByRef(ref);
		await this.repairTaskImagesContent(task);
		const [dto] = await this.mapTasksToRegistry([task]);
		if (!dto) throw new NotFoundException("Задача не найдена");
		return dto;
	}

	async createBoard(
		dto: CreateKanbanBoardBoardRequestDto,
	): Promise<KanbanBoardBoardDto> {
		const project = await this.projectRepository.findOne({
			where: { id: dto.projectId },
		});
		if (!project) throw new NotFoundException("Проект не найден");

		const entity = this.boardRepository.create({
			id: ulid(),
			projectId: dto.projectId,
			name: dto.name.trim(),
			slug: normalizeTrackerCode(dto.slug),
			description: dto.description?.trim() || null,
			sortOrder: dto.sortOrder ?? 0,
			createdBy: dto.createdBy?.trim() || null,
		});
		entity.project = project;
		await this.boardRepository.save(entity);
		await this.seedDefaultColumns(entity.id);
		return this.toBoardDto(entity, new Map([[entity.id, 0]]));
	}

	async findBoardColumns(boardId: string): Promise<KanbanBoardColumnDto[]> {
		await this.ensureBoardExists(boardId);
		let columns = await this.columnRepository.find({
			where: { boardId },
			order: { sortOrder: "ASC", title: "ASC" },
		});
		if (!columns.length) {
			await this.seedDefaultColumns(boardId);
		} else {
			await this.ensureCancelledColumn(boardId);
		}
		columns = await this.columnRepository.find({
			where: { boardId },
			order: { sortOrder: "ASC", title: "ASC" },
		});
		return columns.map((column) => this.toColumnDto(column));
	}

	async createColumn(
		boardId: string,
		dto: CreateKanbanBoardColumnRequestDto,
	): Promise<KanbanBoardColumnDto> {
		await this.ensureBoardExists(boardId);
		const title = dto.title.trim();
		if (!title) {
			throw new BadRequestException("Название колонки обязательно");
		}

		const maxSortOrder = await this.columnRepository
			.createQueryBuilder("column")
			.select("MAX(column.sort_order)", "max")
			.where("column.board_id = :boardId", { boardId })
			.getRawOne<{ max: string | null }>();
		const sortOrder = Number(maxSortOrder?.max ?? -1) + 1;
		const color = dto.color?.trim() || pickKanbanBoardColumnColor(sortOrder);

		const entity = this.columnRepository.create({
			id: ulid(),
			boardId,
			title,
			color,
			sortOrder,
		});
		await this.columnRepository.save(entity);
		return this.toColumnDto(entity);
	}

	async updateColumn(
		boardId: string,
		columnId: string,
		dto: UpdateKanbanBoardColumnRequestDto,
	): Promise<KanbanBoardColumnDto> {
		const column = await this.ensureColumnOnBoard(boardId, columnId);
		if (dto.title !== undefined) {
			const title = dto.title.trim();
			if (!title) {
				throw new BadRequestException("Название колонки обязательно");
			}
			column.title = title;
		}
		if (dto.color !== undefined) {
			const color = dto.color.trim();
			if (color) column.color = color;
		}
		await this.columnRepository.save(column);
		return this.toColumnDto(column);
	}

	async deleteColumn(boardId: string, columnId: string): Promise<void> {
		await this.ensureColumnOnBoard(boardId, columnId);
		const taskCount = await this.taskRepository.count({
			where: { boardId, parentId: columnId, deletedAt: IsNull() },
		});
		if (taskCount > 0) {
			throw new BadRequestException("Нельзя удалить колонку с задачами");
		}
		await this.columnRepository.delete({ boardId, id: columnId });
	}

	async resetBoardColumnsToDefault(
		boardId: string,
	): Promise<KanbanBoardColumnDto[]> {
		await this.ensureBoardExists(boardId);
		await this.applyDefaultColumnsToBoard(boardId);
		return this.findBoardColumns(boardId);
	}

	async resetAllBoardColumnsToDefault(): Promise<ResetKanbanBoardColumnsResultDto> {
		const boards = await this.boardRepository.find({
			order: { sortOrder: "ASC", name: "ASC" },
		});
		let movedTaskCount = 0;
		const boardResults: ResetKanbanBoardColumnsResultDto["boards"] = [];

		for (const board of boards) {
			const result = await this.applyDefaultColumnsToBoard(board.id);
			movedTaskCount += result.movedTaskCount;
			boardResults.push({
				boardId: board.id,
				boardName: board.name,
				columnCount: result.columnCount,
			});
		}

		return {
			boardCount: boards.length,
			movedTaskCount,
			boards: boardResults,
		};
	}

	private async applyDefaultColumnsToBoard(
		boardId: string,
	): Promise<{ movedTaskCount: number; columnCount: number }> {
		const defaults = defaultKanbanBoardColumns(boardId);
		const defaultIds = new Set(defaults.map((column) => column.id));

		return this.columnRepository.manager.transaction(async (manager) => {
			const columnRepo = manager.getRepository(KanbanBoardColumnEntity);
			const taskRepo = manager.getRepository(KanbanBoardTaskEntity);

			const existingColumns = await columnRepo.find({ where: { boardId } });
			const tasks = await taskRepo.find({ where: { boardId } });
			let movedTaskCount = 0;

			for (const task of tasks) {
				const nextParentId = resolveKanbanBoardLegacyColumnId(
					task.parentId,
					defaultIds,
				);
				if (task.parentId !== nextParentId) {
					task.parentId = nextParentId;
					await taskRepo.save(task);
					movedTaskCount += 1;
				}
			}

			const obsoleteIds = existingColumns
				.map((column) => column.id)
				.filter((id) => !defaultIds.has(id));
			if (obsoleteIds.length) {
				await columnRepo.delete({ boardId, id: In(obsoleteIds) });
			}

			for (const def of defaults) {
				const existing = existingColumns.find((column) => column.id === def.id);
				if (existing) {
					existing.title = def.title;
					existing.color = def.color;
					existing.sortOrder = def.sortOrder;
					await columnRepo.save(existing);
				} else {
					await columnRepo.save(
						columnRepo.create({
							id: def.id,
							boardId: def.boardId,
							title: def.title,
							color: def.color,
							sortOrder: def.sortOrder,
						}),
					);
				}
			}

			return { movedTaskCount, columnCount: defaults.length };
		});
	}

	async updateBoard(
		id: string,
		dto: UpdateKanbanBoardBoardRequestDto,
	): Promise<KanbanBoardBoardDto> {
		const board = await this.boardRepository.findOne({
			where: { id },
			relations: { project: true },
		});
		if (!board) throw new NotFoundException("Доска не найдена");

		if (dto.projectId !== undefined) {
			const project = await this.projectRepository.findOne({
				where: { id: dto.projectId },
			});
			if (!project) throw new NotFoundException("Проект не найден");
			board.projectId = dto.projectId;
			board.project = project;
		}
		if (dto.name !== undefined) board.name = dto.name.trim();
		if (dto.slug !== undefined) {
			board.slug = normalizeTrackerCode(dto.slug);
		}
		if (dto.description !== undefined) {
			board.description = dto.description?.trim() || null;
		}
		if (dto.sortOrder !== undefined) board.sortOrder = dto.sortOrder;

		await this.boardRepository.save(board);
		const taskCount = await this.taskRepository.count({
			where: { boardId: id, deletedAt: IsNull() },
		});
		const blockerCount = await this.countBlockersOnBoard(id);
		return this.toBoardDto(
			board,
			new Map([[id, taskCount]]),
			new Map([[id, blockerCount]]),
		);
	}

	async deleteBoard(id: string): Promise<void> {
		const board = await this.boardRepository.findOne({ where: { id } });
		if (!board) throw new NotFoundException("Доска не найдена");
		await this.boardRepository.remove(board);
	}

	async findAllTasksRegistry(): Promise<KanbanBoardTaskRegistryDto[]> {
		const rows = await this.taskRepository.find({
			where: { deletedAt: IsNull() },
			relations: { board: { project: true } },
			order: { updatedAt: "DESC" },
		});
		return this.mapTasksToRegistry(rows);
	}

	async findTrashedTasksRegistry(): Promise<KanbanBoardTaskRegistryDto[]> {
		const rows = await this.taskRepository.find({
			where: { deletedAt: Not(IsNull()) },
			relations: { board: { project: true } },
			order: { deletedAt: "DESC", updatedAt: "DESC" },
		});
		return this.mapTasksToRegistry(rows);
	}

	private async mapTasksToRegistry(
		rows: KanbanBoardTaskEntity[],
	): Promise<KanbanBoardTaskRegistryDto[]> {
		await this.taskImageService.syncTasksContentImages(rows);
		await this.taskFileService.syncTasksContentFiles(rows);
		const columnTitles = await this.loadColumnTitleMap(
			rows.map((row) => row.boardId),
		);
		const sprintTitles = await this.loadSprintTitleMap(
			rows
				.map((row) => row.content.sprintId)
				.filter((value): value is string => Boolean(value)),
		);
		const assigneeRoleByName = await this.loadAssigneeRoleByNameMap();
		const releasesByTaskId = await loadReleasesByTaskIds(
			this.membershipRepository,
			rows.map((row) => row.id),
		);

		return rows.map((row) =>
			this.toTaskRegistryDto(
				row,
				columnTitles,
				sprintTitles,
				assigneeRoleByName,
				releasesByTaskId.get(row.id) ?? [],
			),
		);
	}

	async findRegistryTasksByIds(
		ids: string[],
	): Promise<KanbanBoardTaskRegistryDto[]> {
		const uniqueIds = [...new Set(ids.filter(Boolean))];
		if (!uniqueIds.length) return [];
		const rows = await this.taskRepository.find({
			where: { id: In(uniqueIds), deletedAt: IsNull() },
			relations: { board: { project: true } },
		});
		return this.mapTasksToRegistry(rows);
	}

	async importPlanningTasks(
		buf: Buffer,
	): Promise<KanbanBoardPlanningImportResultDto> {
		const standId = this.kanbanBoardService.getStandId();
		const boardId = KANBAN_BOARD_HEAP_BOARD_ID;
		const columns = await this.loadBoardColumnsForImport(boardId);
		const planning = await importPlanningXlsx(buf, {
			boardId,
			standId,
			columns,
		});
		const enriched = await this.enrichPlanningImport(planning, columns);
		await this.kanbanBoardService.replaceBoardTasksForImport(
			boardId,
			standId,
			enriched.tasks,
		);

		return {
			meta: buildMeta(enriched.tasks, standId),
			importFormat: "planning",
			warnings: enriched.warnings,
			importedCount: enriched.tasks.length,
		};
	}

	async upsertTasksFromKanbanSheet(
		parsed: KanbanPlanningSheetParseResult,
	): Promise<{
		taskIds: string[];
		createdCount: number;
		updatedCount: number;
		warnings: string[];
		boards: KanbanBoardPlanningKanbanImportBoardDto[];
	}> {
		const warnings = [...parsed.warnings];
		const standId = this.kanbanBoardService.getStandId();
		const now = new Date().toISOString();

		const assigneeRows = await this.assigneeRepository.find({
			order: { name: "ASC" },
		});
		const assigneeCache = assigneeRows.map((item) => ({
			id: item.id,
			name: item.name,
			code: item.code,
		}));
		const takenCodes = new Set(
			assigneeRows.map((item) => item.code.trim().toLowerCase()),
		);

		const resolveAssignee = async (
			raw: string,
		): Promise<string | undefined> => {
			const trimmed = raw.trim();
			if (!trimmed) return undefined;

			const matched = matchAssigneeByName(trimmed, assigneeCache);
			if (matched) return matched.name;

			const code = buildAssigneeImportCode(trimmed, takenCodes);
			const entity = await this.assigneeRepository.save(
				this.assigneeRepository.create({
					id: ulid(),
					code,
					name: trimmed,
					email: null,
					role: null,
					sprintCapacityPd: null,
				}),
			);
			assigneeCache.push({
				id: entity.id,
				name: entity.name,
				code: entity.code,
			});
			warnings.push(`Добавлен исполнитель в справочник: ${trimmed}`);
			return entity.name;
		};

		const existingTasks = await this.taskRepository.find({
			where: { deletedAt: IsNull() },
		});
		const byTitle = new Map<string, KanbanBoardTaskEntity[]>();
		for (const task of existingTasks) {
			const key = normalizePlanningTitleKey(task.content.title);
			const bucket = byTitle.get(key) ?? [];
			bucket.push(task);
			byTitle.set(key, bucket);
		}

		const boardCache = new Map<
			string,
			{ board: KanbanBoardEntity; created: boolean }
		>();
		const columnsByBoard = new Map<string, KanbanBoardColumnEntity[]>();
		const positionByColumn = new Map<string, number>();
		const nextNumberByProject = new Map<string, number>();
		const sourceColumnTitles = await this.loadColumnTitleMap(
			existingTasks.map((task) => task.boardId),
		);

		const taskIds: string[] = [];
		const claimedIds = new Set<string>();
		let createdCount = 0;
		let updatedCount = 0;
		const boardUsage = new Map<string, KanbanBoardPlanningKanbanImportBoardDto>();

		for (const row of parsed.rows) {
			const boardEntry = await this.resolveOrCreateBoardFromImportRef(
				row.boardRef,
				boardCache,
				warnings,
			);
			const { board } = boardEntry;

			let columns = columnsByBoard.get(board.id);
			if (!columns) {
				columns = await this.columnRepository.find({
					where: { boardId: board.id },
					order: { sortOrder: "ASC" },
				});
				if (!columns.length) {
					await this.seedDefaultColumns(board.id);
					columns = await this.columnRepository.find({
						where: { boardId: board.id },
						order: { sortOrder: "ASC" },
					});
				}
				columnsByBoard.set(board.id, columns);
				for (const column of columns) {
					const count = await this.taskRepository.count({
						where: {
							boardId: board.id,
							parentId: column.id,
							deletedAt: IsNull(),
						},
					});
					positionByColumn.set(`${board.id}:${column.id}`, count);
				}
			}

			const resolvedStatus = resolveBestStatusColumnId(
				row.statusText,
				columns.map((column) => ({ id: column.id, title: column.title })),
			);
			if (row.statusText && resolvedStatus.score < 45) {
				warnings.push(
					`Строка ${row.rowIndex}: статус «${row.statusText}» сопоставлен с «${resolvedStatus.columnTitle}»`,
				);
			}

			const assignee = row.assignee
				? await resolveAssignee(row.assignee)
				: undefined;

			const titleKey = normalizePlanningTitleKey(row.title);
			const matches = (byTitle.get(titleKey) ?? []).filter(
				(task) => !claimedIds.has(task.id),
			);
			const existing =
				matches.find((task) => task.boardId === board.id) ?? matches[0];

			if (existing) {
				await this.moveTaskEntityToBoard({
					task: existing,
					board,
					targetColumns: columns,
					sourceColumnTitles,
					positionByColumn,
					nextNumberByProject,
					preferredColumnId: resolvedStatus.columnId,
				});
				if (assignee) {
					const assignees = new Set(existing.content.assignees ?? []);
					assignees.add(assignee);
					existing.content = normalizeKanbanBoardTaskContent({
						...existing.content,
						assignees: [...assignees],
						currentAssignee: assignee,
					});
				}
				existing.updatedAt = now;
				await this.taskRepository.save(existing);
				updatedCount += 1;
				taskIds.push(existing.id);
				claimedIds.add(existing.id);
			} else {
				const positionKey = `${board.id}:${resolvedStatus.columnId}`;
				const position = positionByColumn.get(positionKey) ?? 0;
				positionByColumn.set(positionKey, position + 1);
				const taskNumber = await this.takeNextTaskNumber(
					board.projectId,
					nextNumberByProject,
				);
				const entity = this.taskRepository.create({
					id: ulid(),
					boardId: board.id,
					projectId: board.projectId,
					taskNumber,
					parentId: resolvedStatus.columnId,
					position,
					content: normalizeKanbanBoardTaskContent({
						title: row.title,
						assignees: assignee ? [assignee] : undefined,
						currentAssignee: assignee,
					}),
					origin: standId,
					createdAt: now,
					createdBy: null,
					updatedAt: now,
					deletedAt: null,
				});
				entity.board = board;
				await this.taskRepository.save(entity);
				createdCount += 1;
				taskIds.push(entity.id);
				claimedIds.add(entity.id);
				const bucket = byTitle.get(titleKey) ?? [];
				bucket.push(entity);
				byTitle.set(titleKey, bucket);
			}

			const usage = boardUsage.get(board.id) ?? {
				boardId: board.id,
				boardKey: formatKanbanBoardKey(board.project?.code ?? "", board.slug),
				name: board.name,
				taskCount: 0,
				created: boardEntry.created,
			};
			usage.taskCount += 1;
			boardUsage.set(board.id, usage);
		}

		return {
			taskIds,
			createdCount,
			updatedCount,
			warnings,
			boards: [...boardUsage.values()],
		};
	}

	private async resolveOrCreateBoardFromImportRef(
		raw: string,
		cache: Map<string, { board: KanbanBoardEntity; created: boolean }>,
		warnings: string[],
	): Promise<{ board: KanbanBoardEntity; created: boolean }> {
		const cacheKey = normalizeTrackerCode(raw);
		const cached = cache.get(cacheKey);
		if (cached) return cached;

		const trimmed = raw.trim();
		let board: KanbanBoardEntity | null = null;
		try {
			board = await this.findBoardEntityByRef(trimmed);
		} catch (error) {
			if (!(error instanceof NotFoundException)) throw error;
		}

		if (!board) {
			const allBoards = await this.boardRepository.find({
				relations: { project: true },
			});
			const slugMatches = allBoards.filter(
				(item) => normalizeTrackerCode(item.slug) === cacheKey,
			);
			if (slugMatches.length === 1) {
				board = slugMatches[0] ?? null;
			} else if (slugMatches.length > 1) {
				const keys = slugMatches.map((item) =>
					formatKanbanBoardKey(item.project?.code ?? "", item.slug),
				);
				throw new BadRequestException(
					`Доска «${trimmed}» неоднозначна: ${keys.join(", ")}`,
				);
			}
		}

		if (!board) {
			const allBoards = await this.boardRepository.find({
				relations: { project: true },
			});
			const nameMatches = allBoards.filter(
				(item) =>
					normalizePlanningTitleKey(item.name) ===
					normalizePlanningTitleKey(trimmed),
			);
			if (nameMatches.length === 1) {
				board = nameMatches[0] ?? null;
			}
		}

		let created = false;
		if (!board) {
			const project = await this.defaultBoardImportProject();
			const dto = await this.createBoard({
				projectId: project.id,
				name: trimmed,
				slug: cacheKey.toLowerCase(),
			});
			board = await this.boardRepository.findOne({
				where: { id: dto.id },
				relations: { project: true },
			});
			if (!board) throw new NotFoundException("Доска не найдена");
			created = true;
			warnings.push(
				`Создана доска ${dto.boardKey} (в файле указано «${trimmed}»)`,
			);
		}

		const resolved = { board, created };
		cache.set(cacheKey, resolved);
		return resolved;
	}

	private async defaultBoardImportProject(): Promise<KanbanBoardProjectEntity> {
		const byCode = await this.findProjectByNormalizedCode("SMART_ANKETA");
		if (byCode) return byCode;
		const first = await this.projectRepository.find({
			order: { name: "ASC" },
			take: 1,
		});
		if (!first[0]) {
			throw new BadRequestException(
				"Нет проектов — создайте проект перед импортом",
			);
		}
		return first[0];
	}

	private async loadBoardColumnsForImport(
		boardId: string,
	): Promise<{ id: string; title: string }[]> {
		const rows = await this.columnRepository.find({
			where: { boardId },
			order: { sortOrder: "ASC" },
		});
		if (rows.length) {
			return rows.map((column) => ({ id: column.id, title: column.title }));
		}
		return defaultKanbanBoardColumns(boardId).map((column) => ({
			id: column.id,
			title: column.title,
		}));
	}

	private async enrichPlanningImport(
		planning: PlanningImportResult,
		columns: { id: string; title: string }[],
	): Promise<{ tasks: KanbanBoardTaskRecord[]; warnings: string[] }> {
		const warnings = [...planning.warnings];
		const [assigneeRows, sprintRows, streamRows, customerRows] = await Promise.all([
			this.assigneeRepository.find({ order: { name: "ASC" } }),
			this.sprintRepository.find({ order: { code: "ASC" } }),
			this.streamRepository.find({ order: { name: "ASC" } }),
			this.customerRepository.find({ order: { name: "ASC" } }),
		]);

		const assigneeCache = assigneeRows.map((item) => ({
			id: item.id,
			name: item.name,
			code: item.code,
		}));
		const takenCodes = new Set(
			assigneeRows.map((item) => item.code.trim().toLowerCase()),
		);

		const resolveAssignee = async (raw: string): Promise<string | undefined> => {
			const trimmed = raw.trim();
			if (!trimmed) return undefined;

			const matched = matchAssigneeByName(trimmed, assigneeCache);
			if (matched) return matched.name;

			const code = buildAssigneeImportCode(trimmed, takenCodes);
			const entity = await this.assigneeRepository.save(
				this.assigneeRepository.create({
					id: ulid(),
					code,
					name: trimmed,
					email: null,
					role: null,
					sprintCapacityPd: null,
				}),
			);
			assigneeCache.push({
				id: entity.id,
				name: entity.name,
				code: entity.code,
			});
			warnings.push(`Добавлен исполнитель в справочник: ${trimmed}`);
			return entity.name;
		};

		const sprintRefs = sprintRows.map((item) => ({
			id: item.id,
			code: item.code,
			name: item.name,
		}));
		const streamRefs = streamRows.map((item) => ({
			id: item.id,
			code: item.code,
			name: item.name,
		}));
		const customerCache = customerRows.map((item) => ({
			id: item.id,
			name: item.name,
			code: item.code,
		}));
		const takenCustomerCodes = new Set(
			customerRows.map((item) => item.code.trim().toLowerCase()),
		);

		const resolveCustomer = async (raw: string): Promise<string | undefined> => {
			const trimmed = raw.trim();
			if (!trimmed) return undefined;

			const matched = matchCustomerByText(trimmed, customerCache);
			if (matched) return matched.name;

			const code = buildCustomerImportCode(trimmed, takenCustomerCodes);
			const entity = await this.customerRepository.save(
				this.customerRepository.create({
					id: ulid(),
					code,
					name: trimmed,
					description: null,
				}),
			);
			customerCache.push({
				id: entity.id,
				name: entity.name,
				code: entity.code,
			});
			warnings.push(`Добавлен заказчик в справочник: ${trimmed}`);
			return entity.name;
		};

		const tasks: KanbanBoardTaskRecord[] = [];
		for (const task of planning.payload) {
			const hints = planning.hintsByTaskId[task.id] ?? {};
			const rawAssignees = kanbanBoardTaskAssignees(task.content);
			const resolvedAssignees: string[] = [];

			for (const name of rawAssignees) {
				const canonical = await resolveAssignee(name);
				if (canonical && !resolvedAssignees.includes(canonical)) {
					resolvedAssignees.push(canonical);
				}
			}

			let currentAssignee: string | undefined;
			if (task.content.currentAssignee?.trim()) {
				currentAssignee =
					(await resolveAssignee(task.content.currentAssignee)) ?? undefined;
			} else if (resolvedAssignees.length === 1) {
				currentAssignee = resolvedAssignees[0];
			}

			const content = normalizeKanbanBoardTaskContent({
				...task.content,
				assignees: resolvedAssignees.length ? resolvedAssignees : undefined,
				currentAssignee,
			});

			if (content.customer?.trim()) {
				content.customer =
					(await resolveCustomer(content.customer)) ?? undefined;
			}

			if (hints.taskTypeText) {
				const taskType = resolveTaskTypeIdFromText(hints.taskTypeText);
				if (taskType) {
					content.taskType = taskType;
				} else {
					warnings.push(
						`Тип задачи «${hints.taskTypeText}» не найден в справочнике — поле пропущено`,
					);
				}
			}

			if (hints.workTypeText) {
				const workType = resolveWorkTypeIdFromText(hints.workTypeText);
				if (workType) {
					content.workType = workType;
				} else {
					warnings.push(
						`Тип работ «${hints.workTypeText}» не найден в справочнике — поле пропущено`,
					);
				}
			}

			if (hints.sprintText) {
				const sprint = matchSprintByText(hints.sprintText, sprintRefs);
				if (sprint) {
					content.sprintId = sprint.id;
				} else {
					warnings.push(
						`Спринт «${hints.sprintText}» не найден в справочнике — поле пропущено`,
					);
				}
			}

			if (hints.streamText) {
				const stream = matchStreamByText(hints.streamText, streamRefs);
				if (stream) {
					content.streamCustomer = stream.name;
				} else {
					warnings.push(
						`Стрим «${hints.streamText}» не найден в справочнике — поле пропущено`,
					);
				}
			}

			let parentId = task.parentId;
			if (hints.statusText) {
				const resolved = resolveBestStatusColumnId(hints.statusText, columns);
				parentId = resolved.columnId;
			}

			tasks.push({
				...task,
				parentId,
				content: normalizeKanbanBoardTaskContent(content),
			});
		}

		return { tasks, warnings };
	}

	async exportTasksRegistryXlsx(): Promise<Buffer> {
		const [tasks, assignees, settings] = await Promise.all([
			this.findAllTasksRegistry(),
			this.findAllAssignees(),
			this.ensureSettings(),
		]);
		const defaultCapacity = this.parseNumeric(settings.defaultSprintCapacityPd);
		const capacityByName = new Map(
			assignees.map((item) => [
				item.name,
				kanbanBoardEffectiveSprintCapacityPd({
					sprintCapacityPd: item.sprintCapacityPd,
					defaultSprintCapacityPd: defaultCapacity,
				}),
			]),
		);
		return exportTasksRegistryXlsx(tasks, capacityByName);
	}

	async exportSprintsRegistryXlsx(): Promise<Buffer> {
		const [sprints, tasks] = await Promise.all([
			this.findAllSprints(),
			this.findAllTasksRegistry(),
		]);
		const tasksBySprintId = new Map<string, KanbanBoardTaskRegistryDto[]>();
		for (const task of tasks) {
			const sprintId = task.content.sprintId;
			if (!sprintId) continue;
			const bucket = tasksBySprintId.get(sprintId) ?? [];
			bucket.push(task);
			tasksBySprintId.set(sprintId, bucket);
		}

		const sheets = sprints.map((sprint) => ({
			name: `${sprint.code} — ${sprint.name}`,
			tasks: tasksBySprintId.get(sprint.id) ?? [],
		}));

		return exportTasksRegistryWorkbook(sheets);
	}

	async exportSupersprintsRegistryXlsx(): Promise<Buffer> {
		const [supersprints, sprints, tasks] = await Promise.all([
			this.findAllSupersprints(),
			this.findAllSprints(),
			this.findAllTasksRegistry(),
		]);

		const sprintIdsBySupersprintId = new Map<string, string[]>();
		for (const sprint of sprints) {
			if (!sprint.supersprintId) continue;
			const bucket = sprintIdsBySupersprintId.get(sprint.supersprintId) ?? [];
			bucket.push(sprint.id);
			sprintIdsBySupersprintId.set(sprint.supersprintId, bucket);
		}

		const tasksBySprintId = new Map<string, KanbanBoardTaskRegistryDto[]>();
		for (const task of tasks) {
			const sprintId = task.content.sprintId;
			if (!sprintId) continue;
			const bucket = tasksBySprintId.get(sprintId) ?? [];
			bucket.push(task);
			tasksBySprintId.set(sprintId, bucket);
		}

		const sheets = supersprints.map((supersprint) => {
			const sprintIds = sprintIdsBySupersprintId.get(supersprint.id) ?? [];
			const supersprintTasks = sprintIds.flatMap(
				(sprintId) => tasksBySprintId.get(sprintId) ?? [],
			);
			return {
				name: `${supersprint.code} — ${supersprint.name}`,
				tasks: supersprintTasks,
			};
		});

		return exportTasksRegistryWorkbook(sheets);
	}

	async createTask(
		dto: CreateKanbanBoardTaskRequestDto,
		createdBy?: string | null,
	): Promise<KanbanBoardTaskRegistryDto> {
		const board = await this.boardRepository.findOne({
			where: { id: dto.boardId },
			relations: { project: true },
		});
		if (!board) throw new NotFoundException("Доска не найдена");
		await this.ensureColumnOnBoard(dto.boardId, dto.parentId);

		const position =
			dto.position ??
			(await this.taskRepository.count({
				where: {
					boardId: dto.boardId,
					parentId: dto.parentId,
					deletedAt: IsNull(),
				},
			}));

		const content = await this.validateTaskContent(dto.content);
		const taskNumber = await this.allocateTaskNumber(board.projectId);
		const now = new Date().toISOString();

		const entity = this.taskRepository.create({
			id: ulid(),
			boardId: dto.boardId,
			projectId: board.projectId,
			taskNumber,
			parentId: dto.parentId,
			position,
			content,
			origin: this.kanbanBoardService.getStandId(),
			createdAt: now,
			createdBy: dto.createdBy?.trim() || null,
			updatedAt: now,
			deletedAt: null,
		});
		entity.board = board;
		await this.taskRepository.save(entity);
		await this.historyService.logTaskChanges({
			boardId: entity.boardId,
			taskId: entity.id,
			taskKey: formatKanbanTaskKey(board.project?.code ?? "", taskNumber),
			taskTitle: content.title,
			changes: [
				{
					field: "created",
					label: "Создание",
					from: null,
					to: content.title,
				},
			],
			createdBy,
		});
		await this.syncTaskReleases(entity.id, dto.releaseIds);
		const [created] = await this.mapTasksToRegistry([entity]);
		if (!created) throw new NotFoundException("Задача не найдена");
		return created;
	}

	async updateTask(
		id: string,
		dto: UpdateKanbanBoardTaskRequestDto,
		createdBy?: string | null,
	): Promise<KanbanBoardTaskRegistryDto> {
		const task = await this.taskRepository.findOne({
			where: { id, deletedAt: IsNull() },
			relations: { board: { project: true } },
		});
		if (!task) throw new NotFoundException("Задача не найдена");

		const lockHolder = dto.lockHolderLabel?.trim()
			? { label: dto.lockHolderLabel.trim(), userId: createdBy ?? null }
			: undefined;
		await this.taskLockService.assertEditable(
			task.id,
			lockHolder,
			dto.forceOverwrite,
		);
		assertKanbanBoardTaskVersion(
			task,
			dto.expectedUpdatedAt,
			dto.forceOverwrite,
			{
				taskKey: this.historyService.formatTaskKey(task),
				taskTitle: task.content.title,
			},
		);

		const before = this.historyService.snapshotFromTask(task);

		if (dto.boardId !== undefined) {
			const board = await this.boardRepository.findOne({
				where: { id: dto.boardId },
				relations: { project: true },
			});
			if (!board) throw new NotFoundException("Доска не найдена");
			if (board.projectId !== task.projectId) {
				task.taskNumber = await this.allocateTaskNumber(board.projectId);
				task.projectId = board.projectId;
			}
			task.boardId = dto.boardId;
			task.board = board;
		}
		const column = await this.ensureColumnOnBoard(
			task.boardId,
			dto.parentId ?? task.parentId,
		);
		if (dto.parentId !== undefined) task.parentId = column.id;
		if (dto.position !== undefined) task.position = dto.position;
		if (dto.createdBy !== undefined) {
			task.createdBy = dto.createdBy?.trim() || null;
		}
		if (dto.content !== undefined) {
			const mergedContent: KanbanBoardTaskContent = {
				...task.content,
				...dto.content,
				...(dto.content.images !== undefined
					? { images: dto.content.images }
					: { images: task.content.images }),
			};
			task.content = await this.validateTaskContent(
				normalizeKanbanBoardTaskContent(mergedContent),
			);
		}
		task.updatedAt = new Date().toISOString();

		const columnTitles = await this.historyService.loadColumnTitleMap([
			task.boardId,
		]);
		const columnTitle = this.historyService.columnTitleResolver(
			columnTitles,
			task.boardId,
		);

		await this.taskRepository.save(task);
		await this.historyService.logTaskDiff({
			boardId: task.boardId,
			taskId: task.id,
			taskKey: this.historyService.formatTaskKey(task),
			taskTitle: task.content.title,
			before,
			after: this.historyService.snapshotFromTask(task),
			columnTitle,
			createdBy,
		});
		await this.syncTaskReleases(task.id, dto.releaseIds);
		const [updated] = await this.mapTasksToRegistry([task]);
		if (!updated) throw new NotFoundException("Задача не найдена");
		return updated;
	}

	async trashTask(id: string, createdBy?: string | null): Promise<void> {
		const task = await this.taskRepository.findOne({
			where: { id, deletedAt: IsNull() },
			relations: { board: { project: true } },
		});
		if (!task) throw new NotFoundException("Задача не найдена");
		await this.historyService.logTaskChanges({
			boardId: task.boardId,
			taskId: task.id,
			taskKey: this.historyService.formatTaskKey(task),
			taskTitle: task.content.title,
			changes: [
				{
					field: "trashed",
					label: "В корзину",
					from: task.content.title,
					to: null,
				},
			],
			createdBy,
		});
		await this.kanbanBoardService.trashTask(id);
	}

	/** Soft-delete (в корзину). Полное удаление — purgeTask. */
	async deleteTask(id: string, createdBy?: string | null): Promise<void> {
		return this.trashTask(id, createdBy);
	}

	async restoreTask(id: string, createdBy?: string | null): Promise<void> {
		const task = await this.taskRepository.findOne({
			where: { id, deletedAt: Not(IsNull()) },
			relations: { board: { project: true } },
		});
		if (!task) throw new NotFoundException("Задача не найдена в корзине");
		await this.kanbanBoardService.restoreTask(id);
		await this.historyService.logTaskChanges({
			boardId: task.boardId,
			taskId: task.id,
			taskKey: this.historyService.formatTaskKey(task),
			taskTitle: task.content.title,
			changes: [
				{
					field: "restored",
					label: "Восстановление",
					from: null,
					to: task.content.title,
				},
			],
			createdBy,
		});
	}

	async purgeTask(id: string, createdBy?: string | null): Promise<void> {
		const task = await this.taskRepository.findOne({
			where: { id, deletedAt: Not(IsNull()) },
			relations: { board: { project: true } },
		});
		if (!task) throw new NotFoundException("Задача не найдена в корзине");
		await this.historyService.logTaskChanges({
			boardId: task.boardId,
			taskId: task.id,
			taskKey: this.historyService.formatTaskKey(task),
			taskTitle: task.content.title,
			changes: [
				{
					field: "deleted",
					label: "Удаление навсегда",
					from: task.content.title,
					to: null,
				},
			],
			createdBy,
		});
		await this.kanbanBoardService.purgeTask(id);
	}

	async trashColumnTasks(
		boardId: string,
		columnId: string,
		createdBy?: string | null,
	): Promise<TrashKanbanBoardColumnTasksResultDto> {
		const column = await this.ensureColumnOnBoard(boardId, columnId);
		if (!kanbanBoardIsDoneColumn(column)) {
			throw new BadRequestException(
				"В корзину можно очистить только колонку «Готово»",
			);
		}
		const tasks = await this.taskRepository.find({
			where: { boardId, parentId: columnId, deletedAt: IsNull() },
			relations: { board: { project: true } },
		});
		for (const task of tasks) {
			await this.historyService.logTaskChanges({
				boardId: task.boardId,
				taskId: task.id,
				taskKey: this.historyService.formatTaskKey(task),
				taskTitle: task.content.title,
				changes: [
					{
						field: "trashed",
						label: "В корзину",
						from: task.content.title,
						to: null,
					},
				],
				createdBy,
			});
			await this.kanbanBoardService.trashTask(task.id);
		}
		return {
			boardId,
			columnId,
			trashedCount: tasks.length,
		};
	}

	async assignTasksToBoard(
		dto: AssignKanbanBoardTasksToBoardRequestDto,
	): Promise<AssignKanbanBoardTasksToBoardResultDto> {
		const taskIds = [...new Set(dto.taskIds?.filter(Boolean) ?? [])];
		if (!taskIds.length) {
			throw new BadRequestException("Не выбраны задачи");
		}
		if (!dto.boardId?.trim()) {
			throw new BadRequestException("Не указана доска");
		}
		const systemId = String(dto.system ?? "")
			.trim()
			.toLowerCase();
		if (!KANBAN_BOARD_SYSTEMS.some((item) => item.id === systemId)) {
			throw new BadRequestException("Укажите систему / приложение");
		}
		const system = systemId as KanbanBoardSystemId;

		const board = await this.findBoardEntityByRef(dto.boardId);

		let targetColumns = await this.columnRepository.find({
			where: { boardId: board.id },
			order: { sortOrder: "ASC" },
		});
		if (!targetColumns.length) {
			await this.seedDefaultColumns(board.id);
			targetColumns = await this.columnRepository.find({
				where: { boardId: board.id },
				order: { sortOrder: "ASC" },
			});
		}

		const tasks = await this.taskRepository.find({
			where: { id: In(taskIds) },
		});
		if (!tasks.length) {
			throw new NotFoundException("Задачи не найдены");
		}

		const foundIds = new Set(tasks.map((task) => task.id));
		const sourceColumnTitles = await this.loadColumnTitleMap(
			tasks.map((task) => task.boardId),
		);
		const positionByColumn = new Map<string, number>();
		for (const column of targetColumns) {
			const count = await this.taskRepository.count({
				where: {
					boardId: board.id,
					parentId: column.id,
					deletedAt: IsNull(),
				},
			});
			positionByColumn.set(`${board.id}:${column.id}`, count);
		}

		let updatedCount = 0;
		let skippedCount = 0;
		const skippedReasons: string[] = [];
		const now = new Date().toISOString();
		const toSave: KanbanBoardTaskEntity[] = [];
		const nextNumberByProject = new Map<string, number>();

		for (const id of taskIds) {
			if (!foundIds.has(id)) {
				skippedCount += 1;
				skippedReasons.push("Некоторые задачи не найдены");
			}
		}

		for (const task of tasks) {
			if (task.deletedAt) {
				skippedCount += 1;
				skippedReasons.push("Задача в корзине — пропущена");
				continue;
			}
			if (task.boardId === board.id) {
				skippedCount += 1;
				skippedReasons.push("Задача уже на выбранной доске");
				continue;
			}

			await this.moveTaskEntityToBoard({
				task,
				board,
				targetColumns,
				sourceColumnTitles,
				positionByColumn,
				nextNumberByProject,
			});
			task.content = normalizeKanbanBoardTaskContent({
				...task.content,
				system,
			});
			task.updatedAt = now;
			toSave.push(task);
			updatedCount += 1;
		}

		if (toSave.length) {
			await this.taskRepository.save(toSave);
		}

		return {
			boardId: board.id,
			updatedCount,
			skippedCount,
			skippedReasons: [...new Set(skippedReasons)],
		};
	}

	private resolveTargetColumnId(
		targetColumns: KanbanBoardColumnEntity[],
		sourceColumnId: string,
		sourceColumnTitle: string,
	): string {
		if (targetColumns.some((column) => column.id === sourceColumnId)) {
			return sourceColumnId;
		}

		const normalizedTitle = sourceColumnTitle.trim().toLowerCase();
		const byTitle = targetColumns.find(
			(column) => column.title.trim().toLowerCase() === normalizedTitle,
		);
		if (byTitle) return byTitle.id;

		const byPartial = targetColumns.find((column) => {
			const title = column.title.trim().toLowerCase();
			return title.includes(normalizedTitle) || normalizedTitle.includes(title);
		});
		if (byPartial) return byPartial.id;

		return targetColumns[0]?.id ?? KANBAN_BOARD_STATUSES[0].id;
	}

	private async takeNextTaskNumber(
		projectId: string,
		nextNumberByProject: Map<string, number>,
	): Promise<number> {
		let next = nextNumberByProject.get(projectId);
		if (next == null) {
			next = await this.allocateTaskNumber(projectId);
		}
		nextNumberByProject.set(projectId, next + 1);
		return next;
	}

	private async moveTaskEntityToBoard(options: {
		task: KanbanBoardTaskEntity;
		board: KanbanBoardEntity;
		targetColumns: KanbanBoardColumnEntity[];
		sourceColumnTitles: Map<string, string>;
		positionByColumn: Map<string, number>;
		nextNumberByProject: Map<string, number>;
		preferredColumnId?: string;
	}): Promise<void> {
		const {
			task,
			board,
			targetColumns,
			sourceColumnTitles,
			positionByColumn,
			nextNumberByProject,
			preferredColumnId,
		} = options;

		const sourceColumnTitle =
			sourceColumnTitles.get(`${task.boardId}:${task.parentId}`) ??
			KANBAN_BOARD_STATUSES.find((status) => status.id === task.parentId)
				?.title ??
			task.parentId;
		const targetColumnId =
			preferredColumnId &&
			targetColumns.some((column) => column.id === preferredColumnId)
				? preferredColumnId
				: this.resolveTargetColumnId(
						targetColumns,
						task.parentId,
						sourceColumnTitle,
					);

		if (task.projectId !== board.projectId) {
			task.taskNumber = await this.takeNextTaskNumber(
				board.projectId,
				nextNumberByProject,
			);
			task.projectId = board.projectId;
		}

		if (task.boardId !== board.id || task.parentId !== targetColumnId) {
			const positionKey = `${board.id}:${targetColumnId}`;
			const position = positionByColumn.get(positionKey) ?? 0;
			positionByColumn.set(positionKey, position + 1);
			task.position = position;
		}

		task.boardId = board.id;
		task.parentId = targetColumnId;
		task.board = board;
	}

	async ensureTaskIdentities(
		boardId: string,
		tasks: KanbanBoardTaskRecord[],
	): Promise<KanbanBoardTaskRecord[]> {
		const board = await this.ensureBoardExists(boardId);
		const existingRows = await this.taskRepository.find({
			where: { projectId: board.projectId },
			select: ["id", "taskNumber"],
		});
		const existingById = new Map(
			existingRows.map((row) => [row.id, row.taskNumber]),
		);
		let nextNumber = existingRows.reduce(
			(max, row) => Math.max(max, row.taskNumber),
			0,
		);

		return tasks.map((task) => {
			const preserved = existingById.get(task.id);
			if (preserved != null) {
				return {
					...task,
					boardId,
					projectId: board.projectId,
					taskNumber: preserved,
				};
			}
			if (task.taskNumber != null && task.projectId === board.projectId) {
				nextNumber = Math.max(nextNumber, task.taskNumber);
				return {
					...task,
					boardId,
					projectId: board.projectId,
				};
			}
			nextNumber += 1;
			return {
				...task,
				boardId,
				projectId: board.projectId,
				taskNumber: nextNumber,
			};
		});
	}

	private async allocateTaskNumber(projectId: string): Promise<number> {
		const result = await this.taskRepository
			.createQueryBuilder("task")
			.select("MAX(task.task_number)", "max")
			.where("task.project_id = :projectId", { projectId })
			.getRawOne<{ max: string | null }>();
		return Number(result?.max ?? 0) + 1;
	}

	private async listProjectCodes(): Promise<string[]> {
		const rows = await this.projectRepository.find({ select: ["code"] });
		return rows.map((row) => row.code);
	}

	private async findProjectByNormalizedCode(
		code: string,
	): Promise<KanbanBoardProjectEntity | null> {
		const normalized = normalizeTrackerCode(code);
		return this.projectRepository
			.createQueryBuilder("project")
			.where("UPPER(TRIM(project.code)) = :code", { code: normalized })
			.getOne();
	}

	private async findBoardByProjectIdAndNormalizedSlug(
		projectId: string,
		slug: string,
	): Promise<KanbanBoardEntity | null> {
		const normalizedSlug = normalizeTrackerCode(slug);
		const boards = await this.boardRepository.find({
			where: { projectId },
			relations: { project: true },
		});
		return (
			boards.find(
				(board) => normalizeTrackerCode(board.slug) === normalizedSlug,
			) ?? null
		);
	}

	private async findBoardEntityByRef(ref: string): Promise<KanbanBoardEntity> {
		const trimmed = ref.trim();

		const byId = await this.boardRepository.findOne({
			where: { id: trimmed },
			relations: { project: true },
		});
		if (byId) return byId;

		const parsed = parseKanbanBoardKey(trimmed, await this.listProjectCodes());
		if (!parsed) {
			throw new NotFoundException("Доска не найдена");
		}

		const project = await this.findProjectByNormalizedCode(parsed.projectCode);
		if (!project) throw new NotFoundException("Доска не найдена");

		const board = await this.findBoardByProjectIdAndNormalizedSlug(
			project.id,
			parsed.boardSlug,
		);
		if (!board) throw new NotFoundException("Доска не найдена");
		return board;
	}

	private async findTaskEntityByRef(ref: string): Promise<KanbanBoardTaskEntity> {
		const trimmed = ref.trim();

		const byId = await this.taskRepository.findOne({
			where: { id: trimmed, deletedAt: IsNull() },
			relations: { board: { project: true }, project: true },
		});
		if (byId) return byId;

		const parsed = parseKanbanTaskKey(trimmed);
		if (!parsed) throw new NotFoundException("Задача не найдена");

		const byBoardProject = await this.taskRepository
			.createQueryBuilder("task")
			.innerJoinAndSelect("task.board", "board")
			.innerJoinAndSelect("board.project", "project")
			.leftJoinAndSelect("task.project", "taskProject")
			.where("UPPER(TRIM(project.code)) = :projectCode", {
				projectCode: parsed.projectCode,
			})
			.andWhere("task.task_number = :taskNumber", {
				taskNumber: parsed.taskNumber,
			})
			.andWhere("task.deleted_at IS NULL")
			.getOne();
		if (byBoardProject) return byBoardProject;

		const project = await this.findProjectByNormalizedCode(parsed.projectCode);
		if (!project) throw new NotFoundException("Задача не найдена");

		const task = await this.taskRepository.findOne({
			where: {
				projectId: project.id,
				taskNumber: parsed.taskNumber,
				deletedAt: IsNull(),
			},
			relations: { board: { project: true }, project: true },
		});
		if (!task) throw new NotFoundException("Задача не найдена");
		return task;
	}

	private async ensureBoardExists(boardId: string): Promise<KanbanBoardEntity> {
		const board = await this.boardRepository.findOne({ where: { id: boardId } });
		if (!board) throw new NotFoundException("Доска не найдена");
		return board;
	}

	private async ensureColumnOnBoard(
		boardId: string,
		columnId: string,
	): Promise<KanbanBoardColumnEntity> {
		if (
			columnId === KANBAN_BOARD_CANCELLED_COLUMN_ID ||
			kanbanBoardIsCancelledColumn({ id: columnId })
		) {
			return this.ensureCancelledColumn(boardId);
		}
		const column = await this.columnRepository.findOne({
			where: { id: columnId, boardId },
		});
		if (!column) {
			throw new BadRequestException("Колонка не найдена на доске");
		}
		return column;
	}

	/** Добавляет заводскую колонку «Отменено» перед «Готово», если её ещё нет. */
	private async ensureCancelledColumn(
		boardId: string,
	): Promise<KanbanBoardColumnEntity> {
		let columns = await this.columnRepository.find({ where: { boardId } });
		if (!columns.length) {
			await this.seedDefaultColumns(boardId);
			columns = await this.columnRepository.find({ where: { boardId } });
		}
		const existing = columns.find((column) =>
			kanbanBoardIsCancelledColumn({
				id: column.id,
				title: column.title,
			}),
		);
		if (existing) return existing;

		const defaults = defaultKanbanBoardColumns(boardId);
		const def = defaults.find(
			(column) => column.id === KANBAN_BOARD_CANCELLED_COLUMN_ID,
		);
		if (!def) {
			throw new BadRequestException("Колонка «Отменено» не найдена в шаблоне");
		}

		const done = columns.find((column) =>
			kanbanBoardIsDoneColumn({ id: column.id, title: column.title }),
		);
		const sortOrder = done
			? done.sortOrder
			: Math.max(-1, ...columns.map((column) => column.sortOrder)) + 1;

		if (done) {
			for (const column of columns) {
				if (column.sortOrder >= sortOrder) {
					column.sortOrder += 1;
					await this.columnRepository.save(column);
				}
			}
		}

		return this.columnRepository.save(
			this.columnRepository.create({
				id: def.id,
				boardId,
				title: def.title,
				color: def.color,
				sortOrder,
			}),
		);
	}

	private async seedDefaultColumns(boardId: string): Promise<void> {
		for (const column of defaultKanbanBoardColumns(boardId)) {
			const existing = await this.columnRepository.findOne({
				where: { id: column.id, boardId },
			});
			if (existing) continue;

			await this.columnRepository.save(
				this.columnRepository.create({
					id: column.id,
					boardId: column.boardId,
					title: column.title,
					color: column.color,
					sortOrder: column.sortOrder,
				}),
			);
		}
	}

	private toColumnDto(column: KanbanBoardColumnEntity): KanbanBoardColumnDto {
		return {
			id: column.id,
			boardId: column.boardId,
			title: column.title,
			color: column.color,
			sortOrder: column.sortOrder,
			createdAt: column.createdAt.toISOString(),
			updatedAt: column.updatedAt.toISOString(),
		};
	}

	private toProjectDto(
		project: KanbanBoardProjectEntity,
		countMap: Map<string, number>,
	): KanbanBoardProjectDto {
		return {
			id: project.id,
			code: project.code,
			name: project.name,
			description: project.description,
			isStock: project.isStock,
			boardCount: countMap.get(project.id) ?? 0,
			createdAt: project.createdAt.toISOString(),
			updatedAt: project.updatedAt.toISOString(),
		};
	}

	private async countBlockersByBoardIds(): Promise<Map<string, number>> {
		const rows = await this.taskRepository
			.createQueryBuilder("task")
			.select("task.board_id", "boardId")
			.addSelect("COUNT(*)", "count")
			.where("task.deleted_at IS NULL")
			.andWhere(`task.content @> '{"hasBlocker": true}'::jsonb`)
			.groupBy("task.board_id")
			.getRawMany<{ boardId: string; count: string }>();
		return new Map(rows.map((row) => [row.boardId, Number(row.count)]));
	}

	private async countBlockersOnBoard(boardId: string): Promise<number> {
		return this.taskRepository
			.createQueryBuilder("task")
			.where("task.board_id = :boardId", { boardId })
			.andWhere("task.deleted_at IS NULL")
			.andWhere(`task.content @> '{"hasBlocker": true}'::jsonb`)
			.getCount();
	}

	private toBoardDto(
		board: KanbanBoardEntity,
		countMap: Map<string, number>,
		blockerCountMap: Map<string, number> = new Map(),
	): KanbanBoardBoardDto {
		const projectCode = board.project?.code ?? "";
		return {
			id: board.id,
			projectId: board.projectId,
			projectCode,
			projectName: board.project?.name ?? "",
			boardKey: formatKanbanBoardKey(projectCode, board.slug),
			name: board.name,
			slug: board.slug,
			description: board.description,
			sortOrder: board.sortOrder,
			taskCount: countMap.get(board.id) ?? 0,
			blockerCount: blockerCountMap.get(board.id) ?? 0,
			createdAt: board.createdAt.toISOString(),
			createdBy: board.createdBy ?? null,
			updatedAt: board.updatedAt.toISOString(),
		};
	}

	private toTaskRegistryDto(
		task: KanbanBoardTaskEntity,
		columnTitles: Map<string, string> = new Map(),
		sprintTitles: Map<string, string> = new Map(),
		assigneeRoleByName: ReadonlyMap<string, KanbanBoardAssigneeRoleId | null> = new Map(),
		releases: KanbanBoardTaskReleaseRefDto[] = [],
	): KanbanBoardTaskRegistryDto {
		const { content } = task;
		const projectCode = task.board?.project?.code ?? task.project?.code ?? "";
		const boardSlug = task.board?.slug ?? "";
		const assigneeRoles = kanbanBoardTaskAssigneeRoles(content, assigneeRoleByName);
		const assigneeRoleTitles = kanbanBoardTaskAssigneeRoleTitles(
			content,
			assigneeRoleByName,
		);
		return {
			id: task.id,
			boardId: task.boardId,
			projectId: task.projectId,
			taskNumber: task.taskNumber,
			parentId: task.parentId,
			position: task.position,
			content,
			origin: task.origin,
			createdAt: task.createdAt ?? task.updatedAt,
			createdBy: task.createdBy ?? null,
			updatedAt: task.updatedAt,
			deletedAt: task.deletedAt ?? null,
			projectCode,
			projectName: task.board?.project?.name ?? task.project?.name ?? "",
			taskKey: formatKanbanTaskKey(projectCode, task.taskNumber),
			boardSlug,
			boardName: task.board?.name ?? "",
			boardKey: formatKanbanBoardKey(projectCode, boardSlug),
			title: content.title,
			statusTitle:
				columnTitles.get(`${task.boardId}:${task.parentId}`) ?? task.parentId,
			taskTypeTitle: kanbanBoardTaskTypeTitle(content.taskType),
			workTypeTitle: kanbanBoardWorkTypeTitle(content.workType),
			assigneeTitle: kanbanBoardTaskAssigneesTitle(content),
			assignees: kanbanBoardTaskAssignees(content),
			currentAssigneeTitle: content.currentAssignee?.trim() ?? "",
			assigneeRoles,
			assigneeRoleTitles,
			assigneeRoleTitle: assigneeRoleTitles.join(", "),
			backlogNumber: content.backlogNumber,
			priorityTitle: kanbanBoardPriorityTitle(content.priority),
			sprintOutcome: content.sprintOutcome,
			roleEstimates: content.roleEstimates,
			effectiveEstimatePd: kanbanBoardEffectiveEstimatePd(content),
			estimatePd: content.estimatePd,
			dueDate: content.dueDate,
			parentTask: content.parentTask,
			customer: content.customer,
			sprintTitle: content.sprintId
				? sprintTitles.get(content.sprintId) ?? content.sprintId
				: undefined,
			streamCustomer: content.streamCustomer,
			stand: content.stand,
			standTitle: content.stand
				? kanbanBoardStandTitle(content.stand)
				: undefined,
			system: content.system,
			systemTitle: content.system
				? kanbanBoardSystemTitle(content.system)
				: undefined,
			releases,
			releaseTitle: kanbanBoardTaskReleasesTitle(releases) || undefined,
			hasBlocker: content.hasBlocker === true ? true : undefined,
		};
	}

	private async syncTaskReleases(
		taskId: string,
		releaseIds: string[] | undefined,
	): Promise<void> {
		if (releaseIds === undefined) return;
		const uniqueIds = [
			...new Set(releaseIds.map((id) => id.trim()).filter(Boolean)),
		];
		if (uniqueIds.length) {
			const found = await this.releaseRepository.find({
				where: { id: In(uniqueIds) },
			});
			if (found.length !== uniqueIds.length) {
				throw new BadRequestException("Некоторые релизы не найдены");
			}
		}

		const existing = await this.membershipRepository.find({
			where: { taskId },
		});
		const existingIds = new Set(existing.map((item) => item.releaseId));
		const wanted = new Set(uniqueIds);
		const toRemove = existing.filter((item) => !wanted.has(item.releaseId));
		if (toRemove.length) {
			await this.membershipRepository.remove(toRemove);
		}

		for (const releaseId of uniqueIds) {
			if (existingIds.has(releaseId)) continue;
			const position = await this.nextReleaseMembershipPosition(releaseId);
			await this.membershipRepository.save(
				this.membershipRepository.create({
					releaseId,
					taskId,
					themeId: null,
					position,
				}),
			);
		}
	}

	private async nextReleaseMembershipPosition(
		releaseId: string,
	): Promise<number> {
		const max = await this.membershipRepository
			.createQueryBuilder("item")
			.select("COALESCE(MAX(item.position), -1)", "max")
			.where("item.release_id = :releaseId", { releaseId })
			.andWhere("item.theme_id IS NULL")
			.getRawOne<{ max: string }>();
		return Number(max?.max ?? -1) + 1;
	}

	private async loadColumnTitleMap(
		boardIds: string[],
	): Promise<Map<string, string>> {
		const uniqueBoardIds = [...new Set(boardIds)];
		if (!uniqueBoardIds.length) return new Map();

		const columns = await this.columnRepository
			.createQueryBuilder("column")
			.where("column.board_id IN (:...boardIds)", { boardIds: uniqueBoardIds })
			.getMany();
		const titleByBoardColumn = new Map<string, string>();
		for (const column of columns) {
			titleByBoardColumn.set(`${column.boardId}:${column.id}`, column.title);
		}
		return titleByBoardColumn;
	}

	private toAssigneeDto(
		assignee: KanbanBoardAssigneeEntity,
		taskCounts: Map<string, number>,
		defaultSprintCapacityPd: number,
	): KanbanBoardAssigneeDto {
		const sprintCapacityPd =
			assignee.sprintCapacityPd === null
				? null
				: this.parseNumeric(assignee.sprintCapacityPd);
		const role = isKanbanBoardAssigneeRoleId(assignee.role) ? assignee.role : null;
		return {
			id: assignee.id,
			code: assignee.code,
			name: assignee.name,
			email: assignee.email,
			role,
			roleTitle: kanbanBoardAssigneeRoleTitle(role ?? undefined),
			sprintCapacityPd,
			effectiveSprintCapacityPd: kanbanBoardEffectiveSprintCapacityPd({
				sprintCapacityPd,
				defaultSprintCapacityPd,
			}),
			taskCount: taskCounts.get(assignee.name) ?? 0,
			createdAt: assignee.createdAt.toISOString(),
			updatedAt: assignee.updatedAt.toISOString(),
		};
	}

	private toSettingsDto(
		settings: KanbanBoardSettingsEntity,
	): KanbanBoardSettingsDto {
		return {
			defaultSprintCapacityPd: this.parseNumeric(settings.defaultSprintCapacityPd),
			defaultCurrentUserAssigneeName:
				settings.defaultCurrentUserAssigneeName?.trim() || null,
			updatedAt: settings.updatedAt.toISOString(),
		};
	}

	private async ensureSettings(): Promise<KanbanBoardSettingsEntity> {
		let settings = await this.settingsRepository.findOne({
			where: { id: KANBAN_BOARD_SETTINGS_DEFAULT_ID },
		});
		if (!settings) {
			settings = this.settingsRepository.create({
				id: KANBAN_BOARD_SETTINGS_DEFAULT_ID,
				defaultSprintCapacityPd: "9",
			});
			await this.settingsRepository.save(settings);
		}
		return settings;
	}

	private parseNumeric(value: string | number | null | undefined): number {
		if (value === null || value === undefined || value === "") return 0;
		const parsed = Number(value);
		return Number.isNaN(parsed) ? 0 : parsed;
	}

	private async countTasksByAssigneeName(): Promise<Map<string, number>> {
		const tasks = await this.taskRepository.find({
			where: { deletedAt: IsNull() },
		});
		const counts = new Map<string, number>();
		for (const task of tasks) {
			for (const assigneeName of kanbanBoardTaskAssignees(task.content)) {
				counts.set(assigneeName, (counts.get(assigneeName) ?? 0) + 1);
			}
		}
		return counts;
	}

	private async countTasksWithAssigneeName(name: string): Promise<number> {
		const tasks = await this.taskRepository.find({
			where: { deletedAt: IsNull() },
		});
		return tasks.filter((task) =>
			kanbanBoardTaskAssignees(task.content).includes(name),
		).length;
	}

	private async renameAssigneeInTasks(
		oldName: string,
		newName: string,
	): Promise<void> {
		const tasks = await this.taskRepository.find({
			where: { deletedAt: IsNull() },
		});

		for (const task of tasks) {
			const assignees = kanbanBoardTaskAssignees(task.content);
			if (!assignees.includes(oldName)) continue;

			const nextAssignees = assignees.map((item) =>
				item === oldName ? newName : item,
			);
			const { assignee: _legacyAssignee, assigneeRole: _legacyRole, ...rest } =
				task.content;
			const currentAssignee =
				task.content.currentAssignee === oldName
					? newName
					: task.content.currentAssignee;
			task.content = { ...rest, assignees: nextAssignees, currentAssignee };
			await this.taskRepository.save(task);
		}
	}

	private normalizeAssigneeRole(
		role: string | null | undefined,
	): KanbanBoardAssigneeRoleId | null {
		if (role === undefined || role === null || role === "") return null;
		if (!isKanbanBoardAssigneeRoleId(role)) {
			throw new BadRequestException("Неизвестная роль исполнителя");
		}
		return role;
	}

	private async loadAssigneeRoleByNameMap(): Promise<
		Map<string, KanbanBoardAssigneeRoleId | null>
	> {
		const assignees = await this.assigneeRepository.find();
		return new Map(
			assignees.map((item) => [
				item.name,
				isKanbanBoardAssigneeRoleId(item.role) ? item.role : null,
			]),
		);
	}

	private toSupersprintDto(
		supersprint: KanbanBoardSupersprintEntity,
		countMap: Map<string, number>,
	): KanbanBoardSupersprintDto {
		return {
			id: supersprint.id,
			code: supersprint.code,
			name: supersprint.name,
			description: supersprint.description,
			startDate: supersprint.startDate,
			endDate: supersprint.endDate,
			sprintCount: countMap.get(supersprint.id) ?? 0,
			createdAt: supersprint.createdAt.toISOString(),
			updatedAt: supersprint.updatedAt.toISOString(),
		};
	}

	private toSprintDto(
		sprint: KanbanBoardSprintEntity,
		taskCounts: Map<string, number>,
	): KanbanBoardSprintDto {
		return {
			id: sprint.id,
			supersprintId: sprint.supersprintId,
			supersprintCode: sprint.supersprint?.code ?? "",
			supersprintName: sprint.supersprint?.name ?? "",
			code: sprint.code,
			name: sprint.name,
			description: sprint.description,
			startDate: sprint.startDate,
			endDate: sprint.endDate,
			taskCount: taskCounts.get(sprint.id) ?? 0,
			createdAt: sprint.createdAt.toISOString(),
			updatedAt: sprint.updatedAt.toISOString(),
		};
	}

	private toStreamDto(
		stream: KanbanBoardStreamEntity,
		taskCounts: Map<string, number>,
	): KanbanBoardStreamDto {
		return {
			id: stream.id,
			code: stream.code,
			name: stream.name,
			description: stream.description,
			taskCount: taskCounts.get(stream.name) ?? 0,
			createdAt: stream.createdAt.toISOString(),
			updatedAt: stream.updatedAt.toISOString(),
		};
	}

	private toCustomerDto(
		customer: KanbanBoardCustomerEntity,
		taskCounts: Map<string, number>,
	): KanbanBoardCustomerDto {
		return {
			id: customer.id,
			code: customer.code,
			name: customer.name,
			description: customer.description,
			taskCount: taskCounts.get(customer.name) ?? 0,
			createdAt: customer.createdAt.toISOString(),
			updatedAt: customer.updatedAt.toISOString(),
		};
	}

	private async repairTaskImagesContent(task: KanbanBoardTaskEntity): Promise<void> {
		await this.taskImageService.syncTaskContentImages(task);
		await this.taskFileService.syncTaskContentFiles(task);
	}

	private async validateTaskContent(
		content: KanbanBoardTaskContent,
	): Promise<KanbanBoardTaskContent> {
		if (content.sprintId) {
			const sprint = await this.sprintRepository.findOne({
				where: { id: content.sprintId },
			});
			if (!sprint) {
				throw new BadRequestException("Спринт не найден");
			}
		}
		const assignees = [...kanbanBoardTaskAssignees(content)];
		const currentAssignee = content.currentAssignee?.trim();
		if (currentAssignee && !assignees.includes(currentAssignee)) {
			assignees.push(currentAssignee);
		}
		const resolvedCurrent = currentAssignee || assignees[0];
		const { assigneeRole: _legacyRole, ...rest } = content;
		return {
			...rest,
			assignees: assignees.length ? assignees : undefined,
			currentAssignee: resolvedCurrent || undefined,
		};
	}

	private async loadSprintTitleMap(sprintIds: string[]): Promise<Map<string, string>> {
		const uniqueIds = [...new Set(sprintIds)];
		if (!uniqueIds.length) return new Map();

		const sprints = await this.sprintRepository
			.createQueryBuilder("sprint")
			.where("sprint.id IN (:...sprintIds)", { sprintIds: uniqueIds })
			.getMany();
		return new Map(sprints.map((sprint) => [sprint.id, sprint.name]));
	}

	private async countTasksBySprintId(): Promise<Map<string, number>> {
		const rows = await this.taskRepository
			.createQueryBuilder("task")
			.select("task.content->>'sprintId'", "sprintId")
			.addSelect("COUNT(*)", "count")
			.where("task.deleted_at IS NULL")
			.andWhere("task.content->>'sprintId' IS NOT NULL")
			.andWhere("task.content->>'sprintId' <> ''")
			.groupBy("task.content->>'sprintId'")
			.getRawMany<{ sprintId: string; count: string }>();

		return new Map(rows.map((row) => [row.sprintId, Number(row.count)]));
	}

	private async countTasksWithSprintId(sprintId: string): Promise<number> {
		return this.taskRepository
			.createQueryBuilder("task")
			.where("task.deleted_at IS NULL")
			.andWhere("task.content->>'sprintId' = :sprintId", { sprintId })
			.getCount();
	}

	private async countTasksByStreamName(): Promise<Map<string, number>> {
		const rows = await this.taskRepository
			.createQueryBuilder("task")
			.select("task.content->>'streamCustomer'", "streamName")
			.addSelect("COUNT(*)", "count")
			.where("task.deleted_at IS NULL")
			.andWhere("task.content->>'streamCustomer' IS NOT NULL")
			.andWhere("task.content->>'streamCustomer' <> ''")
			.groupBy("task.content->>'streamCustomer'")
			.getRawMany<{ streamName: string; count: string }>();

		return new Map(rows.map((row) => [row.streamName, Number(row.count)]));
	}

	private async countTasksWithStreamName(name: string): Promise<number> {
		return this.taskRepository
			.createQueryBuilder("task")
			.where("task.deleted_at IS NULL")
			.andWhere("task.content->>'streamCustomer' = :name", { name })
			.getCount();
	}

	private async renameStreamInTasks(
		oldName: string,
		newName: string,
	): Promise<void> {
		const tasks = await this.taskRepository
			.createQueryBuilder("task")
			.where("task.content->>'streamCustomer' = :oldName", { oldName })
			.getMany();

		for (const task of tasks) {
			task.content = { ...task.content, streamCustomer: newName };
			await this.taskRepository.save(task);
		}
	}

	private async countTasksByCustomerName(): Promise<Map<string, number>> {
		const rows = await this.taskRepository
			.createQueryBuilder("task")
			.select("task.content->>'customer'", "customerName")
			.addSelect("COUNT(*)", "count")
			.where("task.deleted_at IS NULL")
			.andWhere("task.content->>'customer' IS NOT NULL")
			.andWhere("task.content->>'customer' <> ''")
			.groupBy("task.content->>'customer'")
			.getRawMany<{ customerName: string; count: string }>();

		return new Map(rows.map((row) => [row.customerName, Number(row.count)]));
	}

	private async countTasksWithCustomerName(name: string): Promise<number> {
		return this.taskRepository
			.createQueryBuilder("task")
			.where("task.deleted_at IS NULL")
			.andWhere("task.content->>'customer' = :name", { name })
			.getCount();
	}

	private async renameCustomerInTasks(
		oldName: string,
		newName: string,
	): Promise<void> {
		const tasks = await this.taskRepository
			.createQueryBuilder("task")
			.where("task.content->>'customer' = :oldName", { oldName })
			.getMany();

		for (const task of tasks) {
			task.content = { ...task.content, customer: newName };
			await this.taskRepository.save(task);
		}
	}
}
