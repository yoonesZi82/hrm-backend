import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { UsersPermissionModule } from './user-permission/users-permission.module';
import { EmployeesModule } from './employees/employees.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { DepartmentsModule } from './departments/departments.module';
import { PositionsModule } from './positions/positions.module';
import { AttendanceModule } from './attendance/attendance.module';
import { LeavesModule } from './leaves/leaves.module';
import { PayrollModule } from './payroll/payroll.module';
import { RecruitmentModule } from './recruitment/recruitment.module';
import { PerformanceModule } from './performance/performance.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FilesModule } from './files/files.module';
import { OrganizationMembersModule } from './organization-members/organization-members.module';
import { PermissionModule } from './permission/permission.module';
import { InvitationModule } from './invitation/invitation.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    PrismaModule,
    UsersPermissionModule,
    UsersModule,
    EmployeesModule,
    OrganizationsModule,
    DepartmentsModule,
    PositionsModule,
    AttendanceModule,
    LeavesModule,
    PayrollModule,
    RecruitmentModule,
    PerformanceModule,
    NotificationsModule,
    FilesModule,
    OrganizationMembersModule,
    PermissionModule,
    InvitationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
