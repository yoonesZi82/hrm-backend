import { OrgRole, Permission, PrismaClient } from '@prisma/client';

const PERMISSION_NAMES = [
  'ADD_MEMBER',
  'REMOVE_MEMBER',
  'UPDATE_MEMBER_ROLE',
  'VIEW_MEMBERS',
] as const;

export async function seedPermissionsAndRoleAssignments(
  prisma: PrismaClient,
): Promise<void> {
  const permissions: Permission[] = [];

  for (const name of PERMISSION_NAMES) {
    const perm = await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    permissions.push(perm);
  }

  const assignPermissionsToRole = async (
    role: OrgRole,
    perms: Permission[],
  ) => {
    for (const perm of perms) {
      await prisma.rolePermission.upsert({
        where: {
          role_permissionId: {
            role,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          role,
          permissionId: perm.id,
        },
      });
    }
  };

  await assignPermissionsToRole(OrgRole.ADMIN, permissions);
  await assignPermissionsToRole(OrgRole.OWNER, permissions);

  const managerPerms = permissions.filter((p) =>
    ['VIEW_MEMBERS'].includes(p.name),
  );
  await assignPermissionsToRole(OrgRole.MANAGER, managerPerms);

  const hrPerms = permissions.filter((p) =>
    ['VIEW_MEMBERS', 'ADD_MEMBER'].includes(p.name),
  );
  await assignPermissionsToRole(OrgRole.HR, hrPerms);
}
