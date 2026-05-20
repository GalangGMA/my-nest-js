import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().port().default(3000),
  FRONTEND_URL: Joi.string().uri().optional(),
  DATABASE_URL: Joi.when('NODE_ENV', {
    is: 'test',
    then: Joi.string().uri().optional(),
    otherwise: Joi.string().uri().required(),
  }),
  REDIS_HOST: Joi.string().hostname().optional(),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().min(0).default(0),
  CACHE_TTL_SECONDS: Joi.number().min(1).default(60),
  QUEUE_PREFIX: Joi.string().default('my-nest'),
  JWT_SECRET: Joi.when('NODE_ENV', {
    is: 'test',
    then: Joi.string().min(16).default('test-jwt-secret-value'),
    otherwise: Joi.string().min(16).required(),
  }),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  JWT_REFRESH_SECRET: Joi.when('NODE_ENV', {
    is: 'test',
    then: Joi.string().min(16).default('test-refresh-secret-value'),
    otherwise: Joi.string().min(16).required(),
  }),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
});
