export const ROLE = {
    ADMIN: 'admin',
    MANAGER: 'manager',
} as const;

export type Role = (typeof ROLE)[keyof typeof ROLE];