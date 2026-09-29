import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateKanbanBoardPushSubscriptions1766000000000
	implements MigrationInterface
{
	name = "CreateKanbanBoardPushSubscriptions1766000000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS kanban_board_push_subscriptions (
				id varchar(26) PRIMARY KEY,
				assignee_name varchar(255) NOT NULL,
				endpoint text NOT NULL,
				p256dh text NOT NULL,
				auth text NOT NULL,
				user_agent text NULL,
				created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
				updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT uq_kanban_board_push_subscriptions_endpoint UNIQUE (endpoint)
			)
		`);
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS idx_kanban_board_push_subscriptions_assignee_name
			ON kanban_board_push_subscriptions (assignee_name)
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`DROP TABLE IF EXISTS kanban_board_push_subscriptions`,
		);
	}
}
