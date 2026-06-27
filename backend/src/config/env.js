import 'dotenv/config';

// Throw an error if a required environment variable is missing, blocking application startup.
if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not defined in your environment variables (.env)',
  );
}

export const env = {
  port: process.env.PORT || 3001,
  databaseUrl: process.env.DATABASE_URL,
  nodeEnv: process.env.NODE_ENV || 'development',
  rateLimit: {
    windowMs: 30 * 60 * 1000, // 30 minutes
    max: 50, // Maximum 50 requests
  },
};
