import { json2csv } from 'json-2-csv';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';

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
     * Creates a user invited by an admin and assigns the requested role.
     * Stores an inactive account with a hashed activation token.
     */
    async createAdminUserService(userData: CreateUserInvitationDto) {
        const email = userData.email.trim().toLowerCase();
        const roleName = userData.role.trim().toLowerCase();

        // Check whether the email is already registered.
        const existingUser = await this.userRepository.findByEmail(email);

        if (existingUser) {
            throw new BadRequestError('User already registered');
        }

        // Fetch the exact role selected by Admin.
        const requestedRole =
            await this.roleRepository.getRoleByExactName(roleName);

        if (!requestedRole) {
            throw new BadRequestError('Invalid role selected');
        }

        // Generate a secure, one-time activation token.
        const activationToken = randomBytes(32).toString('hex');

        // Store only the token hash in the database.
        const activationTokenHash = createHash('sha256')
            .update(activationToken)
            .digest('hex');

        // Set the activation link expiry to 24 hours.
        const activationTokenExpiresAt = new Date(
            Date.now() + 24 * 60 * 60 * 1000,
        );

        // Generate a random password that will never be shared.
        // The User model's beforeSave hook hashes this password.
        const temporaryPassword = randomBytes(48).toString('hex');

        const transaction = await sequelize.transaction();

        try {
            // Create the user in an inactive state.
            const newUser = await this.userRepository.create(
                {
                    fullName: userData.fullName.trim(),
                    email,
                    phoneNo: userData.phoneNo,
                    password: temporaryPassword,
                    isActive: false,
                    activationTokenHash,
                    activationTokenExpiresAt,
                },
                transaction,
            );

            // Create the associated profile.
            await this.userProfileRepository.create(
                {
                    userId: newUser.id,
                },
                transaction,
            );

            // Assign the selected role to the new user.
            await this.userRoleRepository.createUserRole({
                userId: newUser.id,
                roleId: requestedRole.id,
                transaction,
            });

            await transaction.commit();

            // Return safe user details and the token for internal
            // activation-email delivery. Never expose the token in the API.
            return {
                user: {
                    id: newUser.id,
                    fullName: newUser.fullName,
                    email: newUser.email,
                    phoneNo: newUser.phoneNo,
                    role: requestedRole.name,
                    isActive: newUser.isActive,
                    activationTokenExpiresAt,
                },
                activationToken,
            };
        } catch (error) {
            await transaction.rollback();

            logger.error('Error while creating admin-managed user', {
                error,
            });

            throw new InternalServerError('Error while creating user');
        }
    }

}
export default UserService;