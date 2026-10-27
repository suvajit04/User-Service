import { QueryInterface } from 'sequelize';

export default {
    async up(queryInterface: QueryInterface) {
        const [existingRoles] = await queryInterface.sequelize.query(
            "SELECT id FROM roles WHERE name = 'manager' LIMIT 1",
        );

        if (Array.isArray(existingRoles) && existingRoles.length === 0) {
            await queryInterface.bulkInsert('roles', [
                { name: 'manager' },
            ]);
        }
    },
};