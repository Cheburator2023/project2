import { ReadStream } from 'fs';
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
    View
} from 'typeorm';
import {SqlInMemory} from 'typeorm/driver/SqlInMemory';
import { IsolationLevel } from 'typeorm/driver/types/IsolationLevel';

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
        throw new Error('Method not implemented.');
    }
    afterMigration(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    clearDatabase(database?: string): Promise<void> {
        throw new Error('Method not implemented.');
    }
    stream(query: string, parameters?: any[], onEnd?: Function, onError?: Function): Promise<ReadStream> {
        throw new Error('Method not implemented.');
    }
    getDatabases(): Promise<string[]> {
        throw new Error('Method not implemented.');
    }
    getSchemas(database?: string): Promise<string[]> {
        throw new Error('Method not implemented.');
    }
    getTable(tablePath: string): Promise<Table | undefined> {
        throw new Error('Method not implemented.');
    }
    getTables(tablePaths?: string[]): Promise<Table[]> {
        throw new Error('Method not implemented.');
    }
    getView(viewPath: string): Promise<View | undefined> {
        throw new Error('Method not implemented.');
    }
    getViews(viewPaths?: string[]): Promise<View[]> {
        throw new Error('Method not implemented.');
    }
    getReplicationMode(): ReplicationMode {
        throw new Error('Method not implemented.');
    }
    hasDatabase(database: string): Promise<boolean> {
        throw new Error('Method not implemented.');
    }
    getCurrentDatabase(): Promise<string | undefined> {
        throw new Error('Method not implemented.');
    }
    hasSchema(schema: string): Promise<boolean> {
        throw new Error('Method not implemented.');
    }
    getCurrentSchema(): Promise<string | undefined> {
        throw new Error('Method not implemented.');
    }
    hasTable(table: Table | string): Promise<boolean> {
        throw new Error('Method not implemented.');
    }
    hasColumn(table: Table | string, columnName: string): Promise<boolean> {
        throw new Error('Method not implemented.');
    }
    createDatabase(database: string, ifNotExist?: boolean): Promise<void> {
        throw new Error('Method not implemented.');
    }
    dropDatabase(database: string, ifExist?: boolean): Promise<void> {
        throw new Error('Method not implemented.');
    }
    createSchema(schemaPath: string, ifNotExist?: boolean): Promise<void> {
        throw new Error('Method not implemented.');
    }
    dropSchema(schemaPath: string, ifExist?: boolean, isCascade?: boolean): Promise<void> {
        throw new Error('Method not implemented.');
    }
    createTable(table: Table, ifNotExist?: boolean, createForeignKeys?: boolean, createIndices?: boolean): Promise<void> {
        throw new Error('Method not implemented.');
    }
    dropTable(table: Table | string, ifExist?: boolean, dropForeignKeys?: boolean, dropIndices?: boolean): Promise<void> {
        throw new Error('Method not implemented.');
    }
    createView(view: View, syncWithMetadata?: boolean, oldView?: View): Promise<void> {
        throw new Error('Method not implemented.');
    }
    dropView(view: View | string): Promise<void> {
        throw new Error('Method not implemented.');
    }
    renameTable(oldTableOrName: Table | string, newTableName: string): Promise<void> {
        throw new Error('Method not implemented.');
    }
    changeTableComment(tableOrName: Table | string, comment?: string): Promise<void> {
        throw new Error('Method not implemented.');
    }
    addColumn(table: Table | string, column: TableColumn): Promise<void> {
        throw new Error('Method not implemented.');
    }
    addColumns(table: Table | string, columns: TableColumn[]): Promise<void> {
        throw new Error('Method not implemented.');
    }
    renameColumn(table: Table | string, oldColumnOrName: TableColumn | string, newColumnOrName: TableColumn | string): Promise<void> {
        throw new Error('Method not implemented.');
    }
    changeColumn(table: Table | string, oldColumn: TableColumn | string, newColumn: TableColumn): Promise<void> {
        throw new Error('Method not implemented.');
    }
    changeColumns(table: Table | string, changedColumns: { oldColumn: TableColumn; newColumn: TableColumn; }[]): Promise<void> {
        throw new Error('Method not implemented.');
    }
    dropColumn(table: Table | string, column: TableColumn | string): Promise<void> {
        throw new Error('Method not implemented.');
    }
    dropColumns(table: Table | string, columns: TableColumn[] | string[]): Promise<void> {
        throw new Error('Method not implemented.');
    }
    createPrimaryKey(table: Table | string, columnNames: string[], constraintName?: string): Promise<void> {
        throw new Error('Method not implemented.');
    }
    updatePrimaryKeys(table: Table | string, columns: TableColumn[]): Promise<void> {
        throw new Error('Method not implemented.');
    }
    dropPrimaryKey(table: Table | string, constraintName?: string): Promise<void> {
        throw new Error('Method not implemented.');
    }
    createUniqueConstraint(table: Table | string, uniqueConstraint: TableUnique): Promise<void> {
        throw new Error('Method not implemented.');
    }
    createUniqueConstraints(table: Table | string, uniqueConstraints: TableUnique[]): Promise<void> {
        throw new Error('Method not implemented.');
    }
    dropUniqueConstraint(table: Table | string, uniqueOrName: TableUnique | string): Promise<void> {
        throw new Error('Method not implemented.');
    }
    dropUniqueConstraints(table: Table | string, uniqueConstraints: TableUnique[]): Promise<void> {
        throw new Error('Method not implemented.');
    }
    createCheckConstraint(table: Table | string, checkConstraint: TableCheck): Promise<void> {
        throw new Error('Method not implemented.');
    }
    createCheckConstraints(table: Table | string, checkConstraints: TableCheck[]): Promise<void> {
        throw new Error('Method not implemented.');
    }
    dropCheckConstraint(table: Table | string, checkOrName: TableCheck | string): Promise<void> {
        throw new Error('Method not implemented.');
    }
    dropCheckConstraints(table: Table | string, checkConstraints: TableCheck[]): Promise<void> {
        throw new Error('Method not implemented.');
    }
    createExclusionConstraint(table: Table | string, exclusionConstraint: TableExclusion): Promise<void> {
        throw new Error('Method not implemented.');
    }
    createExclusionConstraints(table: Table | string, exclusionConstraints: TableExclusion[]): Promise<void> {
        throw new Error('Method not implemented.');
    }
    dropExclusionConstraint(table: Table | string, exclusionOrName: TableExclusion | string): Promise<void> {
        throw new Error('Method not implemented.');
    }
    dropExclusionConstraints(table: Table | string, exclusionConstraints: TableExclusion[]): Promise<void> {
        throw new Error('Method not implemented.');
    }
    createForeignKey(table: Table | string, foreignKey: TableForeignKey): Promise<void> {
        throw new Error('Method not implemented.');
    }
    createForeignKeys(table: Table | string, foreignKeys: TableForeignKey[]): Promise<void> {
        throw new Error('Method not implemented.');
    }
    dropForeignKey(table: Table | string, foreignKeyOrName: TableForeignKey | string): Promise<void> {
        throw new Error('Method not implemented.');
    }
    dropForeignKeys(table: Table | string, foreignKeys: TableForeignKey[]): Promise<void> {
        throw new Error('Method not implemented.');
    }
    createIndex(table: Table | string, index: TableIndex): Promise<void> {
        throw new Error('Method not implemented.');
    }
    createIndices(table: Table | string, indices: TableIndex[]): Promise<void> {
        throw new Error('Method not implemented.');
    }
    dropIndex(table: Table | string, index: TableIndex | string): Promise<void> {
        throw new Error('Method not implemented.');
    }
    dropIndices(table: Table | string, indices: TableIndex[]): Promise<void> {
        throw new Error('Method not implemented.');
    }
    clearTable(tableName: string): Promise<void> {
        throw new Error('Method not implemented.');
    }
    enableSqlMemory(): void {
        throw new Error('Method not implemented.');
    }
    disableSqlMemory(): void {
        throw new Error('Method not implemented.');
    }
    clearSqlMemory(): void {
        throw new Error('Method not implemented.');
    }
    getMemorySql(): SqlInMemory {
        throw new Error('Method not implemented.');
    }
    executeMemoryUpSql(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    executeMemoryDownSql(): Promise<void> {
        throw new Error('Method not implemented.');
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