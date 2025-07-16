import { ReadStream } from "fs";
import {
	ObjectLiteral,
	QueryRunner,
	ReplicationMode,
	Table,
	TableCheck,
	TableColumn,
	TableExclusion,
	TableForeignKey,
	TableIndex,
	TableUnique,
	View,
} from "typeorm";
import { SqlInMemory } from "typeorm/driver/SqlInMemory";

export class QueryRunnerMock implements QueryRunner {
	connect(): Promise<any> {
		return Promise.resolve();
	}
	async release(): Promise<void> {
		this.isReleased = true;
		return Promise.resolve();
	}
	async startTransaction(): Promise<void> {
		this.isTransactionActive = true;
		return Promise.resolve();
	}
	async commitTransaction(): Promise<void> {
		this.isTransactionActive = false;
		return Promise.resolve();
	}
	async rollbackTransaction(): Promise<void> {
		this.isTransactionActive = false;
		return Promise.resolve();
	}
	data: ObjectLiteral;
	loadedTables: Table[];
	loadedViews: View[];
	beforeMigration(): Promise<void> {
		throw new Error("Method not implemented.");
	}
	afterMigration(): Promise<void> {
		throw new Error("Method not implemented.");
	}
	clearDatabase(_database?: string): Promise<void> {
		throw new Error("Method not implemented.");
	}
	stream(
		_query: string,
		_parameters?: any[],
		_onEnd?: Function,
		_onError?: Function,
	): Promise<ReadStream> {
		throw new Error("Method not implemented.");
	}
	getDatabases(): Promise<string[]> {
		throw new Error("Method not implemented.");
	}
	getSchemas(_database?: string): Promise<string[]> {
		throw new Error("Method not implemented.");
	}
	getTable(_tablePath: string): Promise<Table | undefined> {
		throw new Error("Method not implemented.");
	}
	getTables(_tablePaths?: string[]): Promise<Table[]> {
		throw new Error("Method not implemented.");
	}
	getView(_viewPath: string): Promise<View | undefined> {
		throw new Error("Method not implemented.");
	}
	getViews(_viewPaths?: string[]): Promise<View[]> {
		throw new Error("Method not implemented.");
	}
	getReplicationMode(): ReplicationMode {
		throw new Error("Method not implemented.");
	}
	hasDatabase(_database: string): Promise<boolean> {
		throw new Error("Method not implemented.");
	}
	getCurrentDatabase(): Promise<string | undefined> {
		throw new Error("Method not implemented.");
	}
	hasSchema(_schema: string): Promise<boolean> {
		throw new Error("Method not implemented.");
	}
	getCurrentSchema(): Promise<string | undefined> {
		throw new Error("Method not implemented.");
	}
	hasTable(_table: Table | string): Promise<boolean> {
		throw new Error("Method not implemented.");
	}
	hasColumn(_table: Table | string, _columnName: string): Promise<boolean> {
		throw new Error("Method not implemented.");
	}
	createDatabase(_database: string, _ifNotExist?: boolean): Promise<void> {
		throw new Error("Method not implemented.");
	}
	dropDatabase(_database: string, _ifExist?: boolean): Promise<void> {
		throw new Error("Method not implemented.");
	}
	createSchema(_schemaPath: string, _ifNotExist?: boolean): Promise<void> {
		throw new Error("Method not implemented.");
	}
	dropSchema(
		_schemaPath: string,
		_ifExist?: boolean,
		_isCascade?: boolean,
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	createTable(
		_table: Table,
		_ifNotExist?: boolean,
		_createForeignKeys?: boolean,
		_createIndices?: boolean,
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	dropTable(
		_table: Table | string,
		_ifExist?: boolean,
		_dropForeignKeys?: boolean,
		_dropIndices?: boolean,
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	createView(
		_view: View,
		_syncWithMetadata?: boolean,
		_oldView?: View,
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	dropView(_view: View | string): Promise<void> {
		throw new Error("Method not implemented.");
	}
	renameTable(
		_oldTableOrName: Table | string,
		_newTableName: string,
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	changeTableComment(
		_tableOrName: Table | string,
		_comment?: string,
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	addColumn(_table: Table | string, _column: TableColumn): Promise<void> {
		throw new Error("Method not implemented.");
	}
	addColumns(_table: Table | string, _columns: TableColumn[]): Promise<void> {
		throw new Error("Method not implemented.");
	}
	renameColumn(
		_table: Table | string,
		_oldColumnOrName: TableColumn | string,
		_newColumnOrName: TableColumn | string,
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	changeColumn(
		_table: Table | string,
		_oldColumn: TableColumn | string,
		_newColumn: TableColumn,
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	changeColumns(
		_table: Table | string,
		_changedColumns: { oldColumn: TableColumn; newColumn: TableColumn }[],
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	dropColumn(
		_table: Table | string,
		_column: TableColumn | string,
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	dropColumns(
		_table: Table | string,
		_columns: TableColumn[] | string[],
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	createPrimaryKey(
		_table: Table | string,
		_columnNames: string[],
		_constraintName?: string,
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	updatePrimaryKeys(
		_table: Table | string,
		_columns: TableColumn[],
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	dropPrimaryKey(
		_table: Table | string,
		_constraintName?: string,
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	createUniqueConstraint(
		_table: Table | string,
		_uniqueConstraint: TableUnique,
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	createUniqueConstraints(
		_table: Table | string,
		_uniqueConstraints: TableUnique[],
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	dropUniqueConstraint(
		_table: Table | string,
		_uniqueOrName: TableUnique | string,
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	dropUniqueConstraints(
		_table: Table | string,
		_uniqueConstraints: TableUnique[],
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	createCheckConstraint(
		_table: Table | string,
		_checkConstraint: TableCheck,
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	createCheckConstraints(
		_table: Table | string,
		_checkConstraints: TableCheck[],
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	dropCheckConstraint(
		_table: Table | string,
		_checkOrName: TableCheck | string,
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	dropCheckConstraints(
		_table: Table | string,
		_checkConstraints: TableCheck[],
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	createExclusionConstraint(
		_table: Table | string,
		_exclusionConstraint: TableExclusion,
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	createExclusionConstraints(
		_table: Table | string,
		_exclusionConstraints: TableExclusion[],
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	dropExclusionConstraint(
		_table: Table | string,
		_exclusionOrName: TableExclusion | string,
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	dropExclusionConstraints(
		_table: Table | string,
		_exclusionConstraints: TableExclusion[],
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	createForeignKey(
		_table: Table | string,
		_foreignKey: TableForeignKey,
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	createForeignKeys(
		_table: Table | string,
		_foreignKeys: TableForeignKey[],
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	dropForeignKey(
		_table: Table | string,
		_foreignKeyOrName: TableForeignKey | string,
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	dropForeignKeys(
		_table: Table | string,
		_foreignKeys: TableForeignKey[],
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	createIndex(_table: Table | string, _index: TableIndex): Promise<void> {
		throw new Error("Method not implemented.");
	}
	createIndices(_table: Table | string, _indices: TableIndex[]): Promise<void> {
		throw new Error("Method not implemented.");
	}
	dropIndex(
		_table: Table | string,
		_index: TableIndex | string,
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	dropIndices(_table: Table | string, _indices: TableIndex[]): Promise<void> {
		throw new Error("Method not implemented.");
	}
	clearTable(_tableName: string): Promise<void> {
		throw new Error("Method not implemented.");
	}
	enableSqlMemory(): void {
		throw new Error("Method not implemented.");
	}
	disableSqlMemory(): void {
		throw new Error("Method not implemented.");
	}
	clearSqlMemory(): void {
		throw new Error("Method not implemented.");
	}
	getMemorySql(): SqlInMemory {
		throw new Error("Method not implemented.");
	}
	executeMemoryUpSql(): Promise<void> {
		throw new Error("Method not implemented.");
	}
	executeMemoryDownSql(): Promise<void> {
		throw new Error("Method not implemented.");
	}
	queries: string[] = [];
	connection: any;
	isReleased = false;
	isTransactionActive = false;
	manager: any = {};
	broadcaster: any = {};

	async query(query: string): Promise<any> {
		this.queries.push(query);
		return Promise.resolve();
	}
}
