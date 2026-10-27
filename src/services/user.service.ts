import { json2csv } from 'json-2-csv';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { randomBytes } from 'crypto';

import logger from '../configs/logger.config';
import sequelize from '../db/models/sequelize';
import User from '../db/models/user.model';
import { CreateUserInvitationDto,FindUserByNameDto, LoginUserDto, RegisterUserDto } from '../dtos/user.dto';
import { UpdateUserDto } from '../dtos/userProfile.dto';
import RoleRepository from '../repository/role.repository';
import UserRepository from '../repository/user.repository';
import UserProfileRepository from '../repository/userProfile.repository';
import UserRoleRepository from '../repository/userRole.repository';
import { checkPassword, createToken, verifyToken } from '../utils/auth/auth';
import { BadRequestError, InternalServerError, NotFoundError, UnauthorizedError } from '../utils/errors/app.error';
import { formatter } from '../utils/helpers/date.helper';
import userCredentialsNotificationQueue, {
    USER_CREDENTIALS_NOTIFICATION_PAYLOAD,
} from '../queues/userCredentialsNotification.queue';


class UserService {
    private userRepository: UserRepository;
    private userProfileRepository : UserProfileRepository;
    private roleRepository: RoleRepository;
    private userRoleRepository: UserRoleRepository;

    constructor(userRepository: UserRepository, userProfileRepository: UserProfileRepository, roleRepository: RoleRepository, userRoleRepository: UserRoleRepository) {
        this.userRepository = userRepository;
        this.userProfileRepository = userProfileRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
    }

    async findByNameService(data: FindUserByNameDto){
        const limit = Number.isNaN(data.limit) ? 10 : Number(data.limit);
        const page = Number.isNaN(data.page) ? 1 : Number(data.page);
        const offset = (page - 1) * limit;
        
        const users =await this.userRepository.findByName(data.fullName, limit, offset);
        return users ;
    }

    async findByEmailService(email: string){
        const user = await this.userRepository.findByEmailWithoutPassword(email);
        return user ;
    }

    async createService(userData: RegisterUserDto) {
        const checkUser = await this.userRepository.findByEmail(userData.email);
        if (checkUser) {
            logger.error('User already registered');
            throw new BadRequestError('User already registered');
        }
        const roles = await this.roleRepository.getRoles('jobseeker');
        const roleId = roles[0].id ;

        const { currentCtc, currentCompany, details, domain } = userData;
        const transaction = await sequelize.transaction();
        try {
            const newUser = await this.userRepository.create(userData, transaction);
            await this.userProfileRepository.create({ userId: newUser.id, currentCtc, currentCompany, details, domain}, transaction);
            await this.userRoleRepository.createUserRole({userId: newUser.id, roleId: roleId, transaction});
            await transaction.commit();

            const jwtToken = createToken({id: newUser.id, email: newUser.email});

            return jwtToken ;

        } catch (error){
            await transaction.rollback();
            logger.error('Error while creating user ', {error});
            throw new InternalServerError('Error while creating user ');
        }
        
    }

    async loginService(userData: LoginUserDto){
        const checkUser = await this.userRepository.findByEmail(userData.email);

        if (!checkUser) {
            logger.error('User not found', userData.email);
            throw new NotFoundError('User not found');
        }
        
        if (checkUser.isActive === false) {
            throw new UnauthorizedError(
                'Your account is inactive. Please contact your administrator.',
            );
        }

        const verified = await checkPassword(userData.password , checkUser.password);

        if(!verified) {
            logger.error('Incorrect credentials', userData.email);
            throw new BadRequestError('Incorrect credentials');
        }

        const jwtToken = createToken({id: checkUser.id, email: checkUser.email});
        return jwtToken;
    }

    async findAllCandidatesService({userId, page, limit, details}:{userId: number, page: number, limit: number, details: string}) {
        const userRoles = await this.userRepository.getUserRolesById(userId);
    
        const roleNames = userRoles.roles?.map((role) => role.name);
        if(!roleNames) {
            logger.error('No roles found');
            throw new NotFoundError('No roles found ');
        }
            
        if(!roleNames.includes('admin')){
            logger.error('Not an admin');
            throw new UnauthorizedError('Not an admin');
        }

        const offset = (page - 1) * limit;


        const { rows: records, count: totalCount } = await this.userRepository.findAllCandidates({limit, offset, details});
        const totalPages = Math.ceil(totalCount / limit);

        return {
            records: records,
            pagination: {
                totalCount,
                totalPages,
                currentPage: page,
                limit,
            },
        };
    }

    async findByIdService(id: number) {
        const user = await this.userRepository.findById(id);
        if (!user) {
            logger.error('User not found');
            throw new NotFoundError('User not found');
        }
        return user;
    }

    async updateByIdService(userUpdateData: UpdateUserDto){
        const {id, ...data} = userUpdateData;
        return await this.userRepository.updateById(id, data);
    }

    async deleteById() {}

    async softDeleteService(id: number) {
        return await this.userRepository.softDelete(id);
    }

    async getAllCandidatesForCSVService({ userId, details }: { userId: number, details: string }) {
        const userRoles = await this.userRepository.getUserRolesById(userId);

        const roleNames = userRoles.roles?.map(r => r.name);
        if (!roleNames) {
            logger.error('No roles found');
            throw new NotFoundError('No roles found');
        }
        if (!roleNames.includes('admin')) {
            logger.error('Not an admin');
            throw new UnauthorizedError('Not an admin');
        }

        const candidates: User[] = await this.userRepository.findAllCandidatesForCSV(details);

        const plainCandidates = candidates.map((candidate) => ({
            ...candidate.toJSON(),
            createdAt: formatter(candidate.createdAt)
        }));

        let csv: string;

        if(details == 'Student'){
            csv = json2csv(plainCandidates, { keys: [ 'fullName', 'email', 'phoneNo', 'graduationYear','profile.domain', 'createdAt'], fieldTitleMap: { 'profile.domain': 'domain', 'createdAt': 'leadCapturedAt' } }, );
        }else{
            csv = json2csv(plainCandidates, { keys: [ 'fullName', 'email', 'phoneNo', 'graduationYear', 'profile.currentCtc', 'profile.currentCompany', 'profile.domain', 'createdAt'], fieldTitleMap: { 'profile.currentCtc': 'currentCtc', 'profile.currentCompany': 'currentCompany', 'profile.domain': 'domain', 'createdAt': 'leadCapturedAt' } });
        }

        return csv;
    }


    isAuthenticated(authToken: string){
        try {
            const decoded = verifyToken(authToken as string);
            return decoded;
            
        } catch (error) {

            if (error instanceof TokenExpiredError) {
                throw new UnauthorizedError('Session expired. Please login again.');
            } else if (error instanceof JsonWebTokenError) {
                logger.error('JWT verification failed', {
                    message: error.message,
                });

                throw new UnauthorizedError('Invalid token');
            } else {
                logger.error('Verification of token failed');
                throw new UnauthorizedError('Verification of token failed');
            }
      
        }
    }

    
    /**
     * Creates an admin-managed user, assigns the requested role, and enqueues
     * an email containing the user's temporary login credentials.
     *
     * The password is hashed by the User model's beforeSave hook. The plain
     * temporary password is only passed to the notification queue and is never
     * returned from this method or written to logs.
     */
    async createAdminUserService(userData: CreateUserInvitationDto) {
        const email = userData.email.trim().toLowerCase();
        const roleName = userData.role.trim().toLowerCase();

        const existingUser = await this.userRepository.findByEmail(email);
        if (existingUser) {
            throw new BadRequestError('User already registered');
        }

        const requestedRole =
            await this.roleRepository.getRoleByExactName(roleName);
        if (!requestedRole) {
            throw new BadRequestError('Invalid role selected');
        }

        // Generate a temporary password for the credentials email.
        const temporaryPassword = randomBytes(18).toString('base64url');
        const transaction = await sequelize.transaction();
        let transactionCommitted = false;

        try {
            const newUser = await this.userRepository.create(
                {
                    fullName: userData.fullName.trim(),
                    email,
                    phoneNo: userData.phoneNo,
                    password: temporaryPassword,
                    isActive: true,
                    activationTokenHash: null,
                    activationTokenExpiresAt: null,
                },
                transaction,
            );

            await this.userProfileRepository.create(
                { userId: newUser.id },
                transaction,
            );

            await this.userRoleRepository.createUserRole({
                userId: newUser.id,
                roleId: requestedRole.id,
                transaction,
            });

            // Save the user first. Queue failures must not roll back a committed user.
            await transaction.commit();
            transactionCommitted = true;

            const configuredLoginUrl = process.env.USER_LOGIN_URL?.trim();
            const frontendUrl = process.env.FRONTEND_URL?.trim();
            const loginUrl = configuredLoginUrl || (
                frontendUrl
                    ? `${frontendUrl.replace(/\/+$/, '')}/sign-in`
                    : undefined
            );

            let notificationQueued = false;

            if (!loginUrl) {
                logger.error('User created, but login URL is not configured', {
                    userId: newUser.id,
                    email: newUser.email,
                });
            } else {
                try {
                    await userCredentialsNotificationQueue.add(
                        USER_CREDENTIALS_NOTIFICATION_PAYLOAD,
                        {
                            userId: Number(newUser.id),
                            fullName: newUser.fullName,
                            email: newUser.email,
                            temporaryPassword,
                            loginUrl,
                        },
                        {
                            jobId: `user-credentials-${newUser.id}`,
                        },
                    );

                    notificationQueued = true;
                    logger.info('User credentials email job enqueued', {
                        userId: newUser.id,
                        email: newUser.email,
                    });
                } catch (queueError) {
                    logger.error('Failed to enqueue user credentials email', {
                        userId: newUser.id,
                        email: newUser.email,
                        error: queueError instanceof Error
                            ? queueError.message
                            : String(queueError),
                    });
                }
            }

            return {
                user: {
                    id: newUser.id,
                    fullName: newUser.fullName,
                    email: newUser.email,
                    phoneNo: newUser.phoneNo,
                    role: requestedRole.name,
                    isActive: newUser.isActive,
                },
                notificationQueued,
            };
        } catch (error) {
            if (!transactionCommitted) {
                try {
                    await transaction.rollback();
                } catch (rollbackError) {
                    logger.error('Transaction rollback failed while creating user', {
                        error: rollbackError instanceof Error
                            ? rollbackError.message
                            : String(rollbackError),
                    });
                }
            }

            logger.error('Error while creating admin-managed user', {
                error: error instanceof Error ? error.message : String(error),
            });

            throw new InternalServerError('Error while creating user');
        }
    }

}
export default UserService;