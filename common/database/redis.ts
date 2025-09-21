import logger from '@common/util/logger';
import type { RedisClientType } from 'redis';
import { createClient } from 'redis';
import { config } from '../config/config';

export let redisClient: RedisClientType | null;

export async function initializeRedis() {
    if (!config.redis.enable) {
        return;
    }
    redisClient = createClient({
        socket: {
            host: config.redis.host,
            port: config.redis.port,
        },
        ...(config.redis.password && config.redis.username
            ? {
                  username: config.redis.username,
                  password: config.redis.password,
              }
            : {}),
    });

    await redisClient
        .connect()
        .then(() => {
            logger.log('Redis connected');
            // Any other initialization
        })
        .catch((err) => {
            logger.error('Redis connection error:', err);
            redisClient = null;
        });
}
