import { PrismaService } from '@/prisma/prisma.service';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';

// Context info for downstream usage
export interface OrgContext {
  memberId: string;
  role: string;
  organizationId: string;
}

// Helper to normalize string | string[] | undefined
function toSingleString(value: string | string[] | undefined): string {
  if (!value) throw new Error('Value not found');
  return Array.isArray(value) ? value[0] : value;
}

// Extend Request type to include orgContext
interface OrgRequest extends Request {
  user?: { id: string | string[] };
  orgContext?: OrgContext;
}

@Injectable()
export class OrganizationContextGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<OrgRequest>();

    if (!req.user?.id || !req.params.orgId) return false;

    const userId = toSingleString(req.user.id);
    const orgId = toSingleString(req.params.orgId);

    const member = await this.prisma.organizationMember.findFirst({
      where: { userId, organizationId: orgId },
      include: { organization: true },
    });

    if (!member) {
      throw new NotFoundException('Member not found in organization');
    }

    // inject context into request
    req.orgContext = {
      memberId: member.id,
      role: member.role,
      organizationId: orgId,
    };

    return true;
  }
}
