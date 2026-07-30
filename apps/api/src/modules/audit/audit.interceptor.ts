import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { StaffRequest } from '../admin/auth/staff-auth.guard';
import { AuditService } from './audit.service';

/**
 * Aplicado em todo controller admin: qualquer acesso de staff vira linha
 * append-only no audit_log (LGPD: trilha de auditoria de acesso a dados).
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<StaffRequest>();
    const staffId = request.staff?.sub;

    return next.handle().pipe(
      tap(() => {
        if (!staffId) return;
        void this.audit.log({
          staffId,
          action: `${request.method} ${request.route?.path ?? request.url}`,
          resourceType: context.getClass().name,
          resourceId: (request.params as Record<string, string>)?.id,
          ip: request.ip,
          metadata: Object.keys(request.params ?? {}).length
            ? { params: request.params }
            : undefined,
        });
      }),
    );
  }
}
