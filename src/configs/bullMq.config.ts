import { ConnectionOptions } from 'bullmq';

import { serverConfig } from './server.config';

export const bullMqConnection: ConnectionOptions = {
    host: serverConfig.REDIS_HOST,
    port: serverConfig.REDIS_PORT,
    maxRetriesPerRequest: null
};