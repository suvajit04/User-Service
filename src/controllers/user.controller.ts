import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import RoleRepository from '../repository/role.repository';
import UserRepository from '../repository/user.repository';
import UserProfileRepository from '../repository/userProfile.repository';
import UserRoleRepository from '../repository/userRole.repository';
import UserService from '../services/user.service';
import UserProfileService from '../services/userProfile.service';
import { AuthRequest } from '../types/AuthRequest';

const userRepository = new UserRepository();
const userProfileRepository = new UserProfileRepository();
const userRoleRepository = new UserRoleRepository();
const roleRepository = new RoleRepository();

const userService = new UserService(userRepository, userProfileRepository, roleRepository, userRoleRepository);
const userProfileService = new UserProfileService(userProfileRepository);

async function getUsersByName(req: Request, res: Response, next: NextFunction){
    try{
        const fullName = String(req.query.name);
        const page = Number(req.query.page);
        const limit = Number(req.query.limit);

        const userList = await userService.findByNameService({fullName, page, limit} );
        
        res.status(StatusCodes.OK).json({
            success: true,
            message: 'User list retrieved successfully',
            data: userList,
            error: {}
        });
    }catch(error){
        next(error);
    }
}

async function getUsersByEmail(req: Request, res: Response, next: NextFunction){
    try{
        const email = String(req.query.email);
        const user = await userService.findByEmailService(email);
        
        res.status(StatusCodes.OK).json({
            success: true,
            message: 'User list retrieved successfully',
            data: user,
            error: {}
        });
    }catch(error){
        next(error);
    }
}

async function uploadResumeHandler(req: Request, res: Response) {
    if (!req.file) {
        res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: 'No file uploaded',
            data: {},
            error: {
                message: 'Bad Request'
            }
        });
    }


    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fileUrl = (req.file as any).location;

    res.status(StatusCodes.OK).json({
        success: true,
        message: 'Succesfully uploaded the resume',
        data: {
            fileUrl
        },
        error: {}
    });
}

async function getSelfDetails(req: AuthRequest, res: Response, next: NextFunction){
    try {
        const id = req.user?.id;
        const userDetails = await userService.findByIdService(Number(id));
        
        res.status(StatusCodes.OK).json({
            success: true,
            message: 'User details retrieved successfully',
            data: userDetails,
            error: {}
        });

    } catch (error) {
        next(error); 
    }
    
}

async function updateUserProfileHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const id = req.params.id;
        const data = req.body;
        const updateUserProfileData= {
            id: Number(id),
            ...data
        };

        const updatedUser = await userProfileService.updateByIdService(updateUserProfileData);

        res.status(StatusCodes.OK).json({
            success: true,
            message: 'User updated successfully',
            data: updatedUser,
            error: {}
        });
    } catch (error) {
        next(error);
    }
}


async function updateUserHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const id = req.params.id;
        const data = req.body;
        const userUpdateData = {
            id: Number(id),
            ...data
        };

        const updatedSkills = await userService.updateByIdService(userUpdateData);

        res.status(StatusCodes.OK).json({
            success: true,
            message: 'User skills updated successfully',
            data: updatedSkills,
            error: {}
        });
    } catch (error) {
        next(error);
    }
}

async function getUserDetailsById(req: AuthRequest, res: Response, next: NextFunction){
    try {
        const id= req.params.id ;
        const userDetails = await userService.findByIdService(Number(id));
        res.status(StatusCodes.OK).json({
            success: true,
            message: 'User skills updated successfully',
            data: userDetails,
            error: {}
        });     
    } catch (error) {
        next(error);
    }
}

async function getAllUsers(req: AuthRequest, res: Response, next: NextFunction){
    try {
        const id = Number(req.user?.id);
        const details = String(req.query.details);
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;

        const response = await userService.findAllCandidatesService({userId: id, page, limit, details});
        res.status(StatusCodes.OK).json({
            success: true,
            message: 'Users fetched successfully',
            data: response,
            error: {}
        });
    } catch (error) {
        next(error);
    }
}

async function getAllCandidatesCSV(req: AuthRequest, res: Response, next: NextFunction){
    try {
        const userId = Number( req.user?.id );
        const details = String( req.query.details );
        const stringCSV = await userService.getAllCandidatesForCSVService({userId, details});
        res.setHeader('Content-Type', 'text/csv')
            .setHeader('Content-Disposition', 'attachment; filename="candidates.csv"')
            .status(StatusCodes.OK)
            .send(stringCSV);
    } catch (error) {
        next(error);
    }
}

/**
 * Creates a user invited by an admin.
 */
async function createUserHandler(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    try {
        const result = await userService.createAdminUserService(req.body);

        res.status(StatusCodes.CREATED).json({
            success: true,
            message: 'User created successfully',
            data: result.user,
            error: {},
        });
    } catch (error) {
        next(error);
    }
}

export default {
    createUserHandler,
    getAllUsers,
    getSelfDetails,
    updateUserHandler,
    updateUserProfileHandler,
    uploadResumeHandler,
    getUserDetailsById,
    getUsersByName,
    getUsersByEmail,
    getAllCandidatesCSV
};