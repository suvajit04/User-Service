import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { LoginUserDto, RegisterUserDto } from '../dtos/user.dto';
import RoleRepository from '../repository/role.repository';
import UserRepository from '../repository/user.repository';
import UserProfileRepository from '../repository/userProfile.repository';
import UserRoleRepository from '../repository/userRole.repository';
import UserService from '../services/user.service';

const userRepository = new UserRepository();
const userProfileRepository = new UserProfileRepository();
const userRoleRepository = new UserRoleRepository();
const roleRepository = new RoleRepository();

const userService = new UserService(userRepository, userProfileRepository, roleRepository, userRoleRepository);

async function registerHandler(req: Request, res: Response, next: NextFunction) {

    try {
        const requestBody: RegisterUserDto = req.body;
        const response = await userService.createService(requestBody);
        res.status(StatusCodes.CREATED).json({
            success: true,
            message: 'User Created Successfully',
            data : response,
            error: {}
        });
    } catch (error) {
        next(error);
    }
}
async function loginHandler(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    try {
        const requestBody: LoginUserDto = req.body;

        const response = await userService.loginService(requestBody);

        // Set the JWT as an HTTP-only cookie.
        res.cookie('accessToken', response, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000,
            path: '/',
        });

        res.status(StatusCodes.ACCEPTED).json({
            success: true,
            message: 'Login successful',
            data: response,
            error: {},
        });
    } catch (error) {
        next(error);
    }
}

export default {
    registerHandler,
    loginHandler
};