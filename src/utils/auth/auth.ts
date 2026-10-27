import bcrypt from 'bcrypt';
import jwt, { Secret } from 'jsonwebtoken';
import { serverConfig } from '../../configs/server.config';
import { JwtTokenInput } from '../../types/JwtTokenInput';
import { UserTokenPayload } from '../../types/UserTokenPayload';


const {SALT,JWT_SECRET } = serverConfig;

// from env variables


export async function checkPassword (password: string, hashedPassword: string): Promise<boolean> {
    try {
        const isMatch = await bcrypt.compare(password, hashedPassword);
        return isMatch;
    } catch (error) {
        throw error;
    }

};

export async function hashPassword (password: string): Promise<string> {
    try {
        const hashed = await bcrypt.hash(password, SALT);
        return hashed;
    } catch (error) {
        throw error;
    }   
};

export function createToken(payload: JwtTokenInput): string {
    try {
        const token = jwt.sign(payload, JWT_SECRET as Secret, {
            expiresIn: '1d'
        });
        

        return token;
    } catch (error) {
        throw error;
    }
}

export function verifyToken(token: string) {
    try {
        return jwt.verify(token, JWT_SECRET) as UserTokenPayload;
    } catch (error) {
        throw error;
    }

}