import { Request } from 'express';
import { RequestContext } from '../decorators/request-context.decorator';

declare module 'express' {
    interface Request {
        context?: RequestContext;
    }
}