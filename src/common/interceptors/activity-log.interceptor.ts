import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ACTIVITY_LOG_KEY } from '../decorators/activity-log.decorator';
import { AuthUtilsService } from '@/lib/auth-utils/auth-utils.service';

@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private authUtils: AuthUtilsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const metadata = this.reflector.get(ACTIVITY_LOG_KEY, context.getHandler());

    if (!metadata) {
      return next.handle();
    }

    const { successAction, failedAction } = metadata;
    const req = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap((result) => {
        const userId =
          result?.user?.id ||
          result?.userId ||
          result?.id ||
          req.user?.id ||
          null;

        this.authUtils.createActivityLog(successAction, userId, req, {
          result,
          reason: 'Operation successful',
        });
      }),

      catchError((error) => {
        this.authUtils.createActivityLog(failedAction, undefined, req, {
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
        return throwError(() => error);
      }),
    );
  }
}
