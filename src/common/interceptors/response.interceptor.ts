import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface ResponsePayload<T> {
  message?: string;
  data?: T;
  meta?: Record<string, unknown>;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  Record<string, unknown>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<Record<string, unknown>> {
    return next.handle().pipe(
      map((payload: T | ResponsePayload<T>) => {
        if (this.isResponsePayload(payload)) {
          return {
            success: true,
            message: payload.message ?? 'Success',
            data: payload.data,
            ...(payload.meta ? { meta: payload.meta } : {}),
          };
        }

        return {
          success: true,
          message: 'Success',
          data: payload,
        };
      }),
    );
  }

  private isResponsePayload(payload: unknown): payload is ResponsePayload<T> {
    return typeof payload === 'object' && payload !== null && 'data' in payload;
  }
}
