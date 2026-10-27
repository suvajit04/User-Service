
import { NextFunction, Response } from 'express';

import UserRepository from '../repository/user.repository';
import { AuthRequest } from '../types/AuthRequest';
import { ForbiddenError, UnauthorizedError } from '../utils/errors/app.error';
import { Role } from '../constants/roles';

type AdminPanelRole = Role;

const userRepository = new UserRepository();

// Check the authenticated user's current role from the database.
const authorizationMiddleware = (...allowedRoles: AdminPanelRole[]) => {
    return async (req: AuthRequest, _res: Response, next: NextFunction) => {
        try {
            if (!req.user?.id) {
                throw new UnauthorizedError('Authentication required');
            }

            const user = await userRepository.getUserRolesById(
                Number(req.user.id),
            );

            const roleNames = user.roles?.map((role) => role.name) ?? [];

            const hasPermission = roleNames.some((role) =>
                allowedRoles.includes(role as AdminPanelRole),
            );

            if (!hasPermission) {
                throw new ForbiddenError(
                    'You do not have permission to access this resource',
                );
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

export default authorizationMiddleware;
