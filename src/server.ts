import './db/models/associations';

import cors from 'cors';
import express from 'express';
import cookieParser from 'cookie-parser';

import logger from './configs/logger.config';
import { frontendConfig, serverConfig } from './configs/server.config';
import sequelize from './db/models/sequelize';
import { attachCorrelationIdMiddleware } from './middlewares/correlation.middleware';
import { appErrorHandler, genericErrorHandler } from './middlewares/error.middleware';
import apiRouter from './routes';

const app = express();
app.use(cors({
    origin: [frontendConfig.FRONTEND_URL],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

app.use(attachCorrelationIdMiddleware);

app.use(cookieParser());

app.use('/api', apiRouter);

app.get('/health', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is healthy'
    });
});

app.use(appErrorHandler);
app.use(genericErrorHandler);

app.listen(serverConfig.PORT, async () => {
    logger.info(`Server is running on http://localhost:${serverConfig.PORT}`);
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully');
});