import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AuditService } from './audit.service';
import {SharedModule} from "../shared.module";

@Global()
@Module({
    imports: [
        HttpModule.registerAsync({
            useFactory: () => ({ timeout: 5000 }),
        }),
        ConfigModule,
        SharedModule,
    ],
    providers: [AuditService],
    exports: [AuditService],
})
export class AuditModule {}