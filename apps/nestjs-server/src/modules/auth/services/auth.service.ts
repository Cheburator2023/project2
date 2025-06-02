import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { Repository } from "typeorm";
import { User } from "../entities/user.entity";

@Injectable()
export class AuthService {
	constructor(
		@InjectRepository(User)
		private userRepository: Repository<User>,
		private jwtService: JwtService,
	) {}

	async validateUser(email: string, pass: string): Promise<any> {
		const user = await this.userRepository.findOne({ where: { email } });
		if (user && (await bcrypt.compare(pass, user.password))) {
			const { password, ...result } = user;
			return result;
		}
		return null;
	}

	async login(user: any) {
		const payload = { email: user.email, sub: user.id, role: user.role };
		return {
			access_token: this.jwtService.sign(payload),
		};
	}

	async register(userData: Partial<User>): Promise<User> {
		const hashedPassword = await bcrypt.hash(userData.password, 10);
		const user = this.userRepository.create({
			...userData,
			password: hashedPassword,
		});
		return this.userRepository.save(user);
	}
}
