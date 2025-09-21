import type { RedisJSON } from '@redis/json/dist/commands';
import type { RedisClientType } from 'redis';
import { redisClient } from '../database/redis';
import { isDefined } from '../helper/isEmpty';
import type {
    ConvertToRedisJson,
    ConvertToString,
    CustomRedisJsonGetOptions,
    RedisJsonGetOptions,
} from '../types/redis';
import logger from '../util/logger';

export class RedisService {
    static async hSet(key: string, value: Record<string, string | number>, ttl?: number): Promise<boolean> {
        if (!RedisService.isRedisInitialized(redisClient)) {
            logger.warn('Redis client not initialized');
            return false;
        }
        try {
            await redisClient.hSet(key, value);
            if (ttl) {
                await redisClient.expire(key, ttl);
            }
            return true;
        } catch (error) {
            logger.error(`Error setting key ${key}: ${error}`);
            return false;
        }
    }

    static async hGet<FallbackReturnType = string | null>(
        key: string,
        field: string,
        fallback: () => Promise<FallbackReturnType> | FallbackReturnType,
        ttl?: number,
    ): Promise<string | null | undefined | FallbackReturnType> {
        if (!RedisService.isRedisInitialized(redisClient)) {
            logger.warn('Redis client not initialized');
            return fallback();
        }
        try {
            const value = await redisClient.hGet(key, field);
            if (ttl) {
                await redisClient.expire(key, ttl);
            }
            return value ? value : fallback();
        } catch (error) {
            logger.error(`Error getting key ${key}: ${error}`);
            return fallback();
        }
    }

    static async hGetAll<FallbackReturnType>(
        key: string,
        fallback: () => Promise<FallbackReturnType> | FallbackReturnType,
        ttl?: number,
    ): Promise<FallbackReturnType | ConvertToString<FallbackReturnType> | null> {
        if (!RedisService.isRedisInitialized(redisClient)) {
            logger.warn('Redis is not enabled. Please check configuration to enable.');
            return fallback();
        }

        try {
            let result = await redisClient.hGetAll(key);
            if (Object.keys(result).length && ttl && ttl > 0) {
                await redisClient.expire(key, ttl);
            }

            return Object.keys(result).length ? (result as ConvertToString<FallbackReturnType>) : fallback();
        } catch (error: unknown) {
            logger.error('Error retrieving redis key', error);
            return fallback();
        }
    }

    static async hDel(key: string, field: string | string[]) {
        if (!RedisService.isRedisInitialized(redisClient)) {
            logger.warn('Redis client not initialized');
            return false;
        }
        try {
            await redisClient.hDel(key, field);
            return true;
        } catch (error) {
            logger.error(`Error deleting key ${key}: ${error}`);
            return false;
        }
    }

    static async jsonSet(
        key: string,
        path: string,
        value: RedisJSON,
        options?: {
            ttl?: number;
        },
    ) {
        if (!RedisService.isRedisInitialized(redisClient)) {
            logger.warn('Redis is not enabled. Please check configuration to enable.');
            return false;
        }

        try {
            await redisClient.json.set(key, path, value);
            if (options?.ttl) {
                await redisClient.expire(key, options.ttl);
            }

            return true;
        } catch (error: unknown) {
            logger.error('Error setting redis json', error);
            return false;
        }
    }

    static async jsonGet<FallbackReturnType>(
        key: string,
        fallback: () => Promise<FallbackReturnType> | FallbackReturnType,
        options?: RedisJsonGetOptions,
        customOptions?: CustomRedisJsonGetOptions,
    ): Promise<ConvertToRedisJson<FallbackReturnType> | FallbackReturnType> {
        if (!RedisService.isRedisInitialized(redisClient)) {
            logger.warn('Redis is not enabled. Please check configuration to enable.');
            return fallback();
        }

        let { ttl, resetIfNotFound = true } = customOptions ?? {};

        try {
            let result = await redisClient.json.get(key, options);
            if (!result && resetIfNotFound) {
                let dataToCache = await fallback();
                await RedisService.jsonSet(key, '$', dataToCache as RedisJSON, {
                    ttl,
                });

                return dataToCache;
            }

            if (result && ttl && ttl > 0) {
                await redisClient.expire(key, ttl);
            }

            return result ? (result as ConvertToRedisJson<FallbackReturnType>) : fallback();
        } catch (error: unknown) {
            logger.error('Error retrieving redis json key', error);
            return fallback();
        }
    }

    static async set(
        key: string,
        value: string,
        options?: {
            ttl?: number;
        },
    ): Promise<boolean> {
        if (!RedisService.isRedisInitialized(redisClient)) {
            logger.warn('Redis is not enabled. Please check configuration to enable.');
            return false;
        }

        let { ttl } = options ?? {};
        try {
            await redisClient.set(key, value);
            if (isDefined(ttl)) {
                await redisClient.expire(key, ttl);
            }

            return true;
        } catch (error: unknown) {
            logger.error('Error setting redis key', error);
            return false;
        }
    }

    static async get<FallbackReturnType extends string | undefined = string>(
        key: string,
        fallback: () => Promise<FallbackReturnType>,
        customOptions?: {
            ttl?: number;
            resetIfNotFound?: boolean;
            bypassFallbackIfNotFound?: boolean;
        },
    ) {
        if (!RedisService.isRedisInitialized(redisClient)) {
            logger.warn('Redis is not enabled. Please check configuration to enable.');
            return fallback();
        }

        const { ttl, resetIfNotFound = true, bypassFallbackIfNotFound } = customOptions ?? {};

        try {
            const result = await redisClient.get(key);
            if (!result && resetIfNotFound) {
                const dataToCache = await fallback();

                if (dataToCache) {
                    await RedisService.set(key, dataToCache, {
                        ttl,
                    });
                }

                return dataToCache;
            }

            if (bypassFallbackIfNotFound) {
                return result;
            }

            return result ? result : fallback();
        } catch (error: unknown) {
            logger.error('Error retrieving redis key', error);
            return fallback();
        }
    }

    static async del(key: string): Promise<boolean> {
        if (!RedisService.isRedisInitialized(redisClient)) {
            logger.warn('Redis is not enabled. Please check configuration to enable.');
            return true;
        }
        try {
            await redisClient.del(key);
            return true;
        } catch (error: unknown) {
            logger.error('Error deleting redis key', error);
            return false;
        }
    }

    private static isRedisInitialized(redis: RedisClientType | null): redis is RedisClientType {
        return !!redis;
    }
}
