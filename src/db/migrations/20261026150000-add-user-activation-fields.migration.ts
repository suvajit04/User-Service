
import { QueryInterface } from 'sequelize';

export default {
    async up(queryInterface: QueryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE users
            ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE,
            ADD COLUMN activation_token_hash VARCHAR(64) NULL,
            ADD COLUMN activation_token_expires_at DATETIME NULL;
        `);
    },

    async down(queryInterface: QueryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE users
            DROP COLUMN activation_token_expires_at,
            DROP COLUMN activation_token_hash,
            DROP COLUMN is_active;
        `);
    },
};
