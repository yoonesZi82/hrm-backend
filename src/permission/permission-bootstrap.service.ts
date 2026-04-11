import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { seedPermissionsAndRoleAssignments } from './permission-seed';

@Injectable()
export class PermissionBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PermissionBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    const count = await this.prisma.permission.count();
    if (count > 0) {
      return;
    }

    this.logger.log('No permissions in database; seeding defaults...');
    await seedPermissionsAndRoleAssignments(this.prisma);
    this.logger.log('Default permissions and role assignments are ready.');
  }
}
