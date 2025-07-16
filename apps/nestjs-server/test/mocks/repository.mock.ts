import { FindManyOptions, FindOneOptions } from "typeorm";

export class RepositoryMock<T> {
	public findOne = jest.fn();
	public find = jest.fn();
	public save = jest.fn();
	public delete = jest.fn();
	public create = jest.fn();
	public update = jest.fn();

	public async findOneBy(options: FindOneOptions<T>): Promise<T> {
		return this.findOne(options);
	}

	public async findBy(options: FindManyOptions<T>): Promise<T[]> {
		return this.find(options);
	}
}
