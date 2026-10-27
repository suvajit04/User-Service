import { Router } from 'express';

import { upload } from '../../configs/aws.config';
import userController from '../../controllers/user.controller';
import authenticationMiddleware from '../../middlewares/auth.middleware';
import authorizationMiddleware from '../../middlewares/authorization.middleware';
import { validateRequestBody } from '../../validators';
import { createUserInvitationSchema, updateUserProfileSchema, updateUserSchema } from '../../validators/user.validator';
import { ROLE } from '../../constants/roles';

const userRouter = Router();

userRouter.get('/pages', authenticationMiddleware, userController.getAllUsers);
userRouter.get('/all-candiates/csv', authenticationMiddleware, userController.getAllCandidatesCSV);
userRouter.get('/', authenticationMiddleware, userController.getSelfDetails);
userRouter.get('/:id', authenticationMiddleware, userController.getUserDetailsById);
userRouter.post('/upload-resume',authenticationMiddleware, upload.single('file'), userController.uploadResumeHandler);
userRouter.put('/update-profile/:id', authenticationMiddleware, validateRequestBody(updateUserProfileSchema), userController.updateUserProfileHandler);
userRouter.put('/update/:id', authenticationMiddleware, validateRequestBody(updateUserSchema), userController.updateUserHandler);
userRouter.get('/search/name', authenticationMiddleware, userController.getUsersByName);
userRouter.get('/search/email', authenticationMiddleware, userController.getUsersByEmail);
userRouter.post(
    '/invitations',
    authenticationMiddleware,
    authorizationMiddleware(ROLE.ADMIN),
    validateRequestBody(createUserInvitationSchema),
    userController.createUserHandler,
);

export default userRouter;