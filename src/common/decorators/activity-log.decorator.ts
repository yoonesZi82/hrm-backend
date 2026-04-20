import { ActivityAction } from '@/common/enums/activity-action.enum';

export const ACTIVITY_LOG_KEY = 'activity_log';

export interface ActivityLogMetadata {
  successAction: ActivityAction;
  failedAction: ActivityAction;
}

export function ActivityLog(
  successAction: ActivityAction,
  failedAction: ActivityAction,
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: any, ...args: any[]) {
      const authUtils = this.authUtils;

      const req = args.find((arg) => arg?.headers && arg?.method);
      const userId = req.user.id || null;

      console.log('args', args);

      try {
        const result = await originalMethod.apply(this, args);

        if (authUtils && req) {
          await authUtils.createActivityLog(successAction, userId, req);
        }

        return result;
      } catch (error) {
        if (authUtils && req) {
          await authUtils.createActivityLog(failedAction, userId, req);
        }

        if (error instanceof Error) {
          throw error;
        }
        throw new Error(String(error));
      }
    };

    return descriptor;
  };
}
