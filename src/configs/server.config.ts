import dotenv from 'dotenv';

type ServerConfig = {
    REDIS_PORT: any | number | undefined;
    REDIS_HOST: any | string | undefined;
    PORT: number
    SALT :number
    JWT_SECRET : string
    JWT_EXPRIRES_IN : string
}

type AwsConfig = {
    AWS_REGION: string
    AWS_SECRET_ACCESS_KEY: string
    AWS_ACCESS_KEY_ID: string
    AWS_S3_BUCKET_NAME: string
}

type DBConfig = {
    DB_HOST: string
    DB_USER: string
    DB_PASSWORD: string
    DB_NAME: string
}

type FrontendConfig= {
    FRONTEND_URL: string
}

dotenv.config();

export const serverConfig: ServerConfig =  {
    PORT: Number(process.env.PORT) || 3000,
    SALT : Number(process.env.SALT),
    JWT_SECRET : String(process.env.JWT_SECRET),
    JWT_EXPRIRES_IN : String(process.env.JWT_EXPRIRES_IN),
    REDIS_HOST: process.env.REDIS_Host || 'localhost',
    REDIS_PORT: Number(process.env.REDIS_PORT) || 6379
};

export const dbConfig: DBConfig = {
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_USER: process.env.DB_USER || 'root',
    DB_PASSWORD: process.env.DB_PASSWORD || 'root',
    DB_NAME: process.env.DB_NAME || 'test_db'
};

export const awsConfig: AwsConfig = {
    AWS_REGION: String(process.env.AWS_REGION),
    AWS_ACCESS_KEY_ID: String(process.env.AWS_ACCESS_KEY_ID),
    AWS_SECRET_ACCESS_KEY: String(process.env.AWS_SECRET_ACCESS_KEY),
    AWS_S3_BUCKET_NAME: String(process.env.AWS_S3_BUCKET_NAME)
};

export const frontendConfig: FrontendConfig = {
    FRONTEND_URL: String(process.env.FRONTEND_URL)
};