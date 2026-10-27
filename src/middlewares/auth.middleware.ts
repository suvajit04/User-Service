import { NextFunction,  Response } from 'express';

import logger from '../configs/logger.config';
import RoleRepository from '../repository/role.repository';
import UserRepository from '../repository/user.repository';
import UserProfileRepository from '../repository/userProfile.repository';                           
import UserRoleRepository from '../repository/userRole.repository';
import UserService from '../services/user.service';
import { AuthRequest } from '../types/AuthRequest';
import { UserTokenPayload } from '../types/UserTokenPayload';
import { UnauthorizedError } from '../utils/errors/app.error';


const userRepository = new UserRepository();
const userProfileRepository = new UserProfileRepository();
const userRoleRepository = new UserRoleRepository();
const roleRepository = new RoleRepository();

const userService = new UserService(userRepository, userProfileRepository, roleRepository, userRoleRepository);

const authenticationMiddleware = (req : AuthRequest, _res: Response, next: NextFunction)=>{
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    // Read token from Authorization header first.
    if (authHeader) {
        const tokenMatch = authHeader.match(/^Bearer\s+(\S+)$/i);

        if (!tokenMatch) {
            throw new UnauthorizedError('Invalid authorization header');
        }

        token = tokenMatch[1];
    } else {
        // Fall back to the accessToken cookie.
        token = req.cookies?.accessToken;
    }

    if (!token) {
        logger.error('Authentication failed: No token provided');
        throw new UnauthorizedError('No token provided');
    }

    const decoded = userService.isAuthenticated(token);
        req.user = decoded as UserTokenPayload;
        next();
    };

export default authenticationMiddleware;