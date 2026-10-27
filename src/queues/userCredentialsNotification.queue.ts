import { Queue } from 'bullmq';

import { bullMqConnection } from '../configs/bullMq.config';
import {
    USER_CREDENTIALS_NOTIFICATION_PAYLOAD,
    USER_CREDENTIALS_NOTIFICATION_QUEUE,
} from '../constants/notificationQueue';
import { UserCredentialsNotificationDto } from '../dtos/userCredentialsNotification.dto';

const userCredentialsNotificationQueue =
    new Queue<UserCredentialsNotificationDto>(
        USER_CREDENTIALS_NOTIFICATION_QUEUE,
        {
            connection: bullMqConnection,

            defaultJobOptions: {
                attempts: Number(process.env.QUEUE_JOB_ATTEMPTS) || 5,
                backoff: {
                    type: 'exponential',
                    delay:
                        Number(process.env.QUEUE_RETRY_BACKOFF_MS) ||
                        30_000,
                },
                removeOnComplete: true,
                removeOnFail: {
                    age:
                        (Number(process.env.QUEUE_FAILED_RETENTION_DAYS) ||
                            1) *
                        24 *
                        60 *
                        60,
                    count:
                        Number(process.env.QUEUE_FAILED_RETENTION_COUNT) ||
                        5000,
                },
            },
        },
    );

export { USER_CREDENTIALS_NOTIFICATION_PAYLOAD };
export default userCredentialsNotificationQueue;