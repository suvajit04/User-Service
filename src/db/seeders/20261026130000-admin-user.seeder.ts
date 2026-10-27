
import { QueryInterface } from 'sequelize';

import '../models/associations';
import Role from '../models/role.model';
import sequelize from '../models/sequelize';
import User from '../models/user.model';
import UserRole from '../models/userRole.model';

export default {
    async up(_queryInterface: QueryInterface) {
        const fullName = 'Test Admin';
        const email = 'admin2@test.com';
        const password = 'admin@1234';
        const phoneNo = '9000000000';

        await sequelize.transaction(async (transaction) => {
            const role = await Role.findOne({
                where: { name: 'admin' },
                transaction,
            });

            if (!role) {
                throw new Error(
                    'Admin role not found. Run the roles seeder first.',
                );
            }

            let user = await User.findOne({
                where: { email },
                transaction,
            });

            if (!user) {
                user = await User.create(
                    {
                        fullName,
                        email,
                        password,
                        phoneNo,
                        graduationYear: null,
                    },
                    { transaction },
                );
            }

            await UserRole.findOrCreate({
                where: {
                    userId: user.id,
                    roleId: role.id,
                },
                defaults: {
                    userId: user.id,
                    roleId: role.id,
                },
                transaction,
            });
        });
    },

    async down(_queryInterface: QueryInterface) {
        const email = 'admin2@test.com';

        await sequelize.transaction(async (transaction) => {
            const user = await User.findOne({
                where: { email },
                transaction,
            });

            if (!user) {
                return;
            }

            await UserRole.destroy({
                where: { userId: user.id },
                transaction,
            });

            await user.destroy({ transaction });
        });
    },
};
