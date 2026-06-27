import express from 'express';
import cors from 'cors';
import { env } from './src/config/env.js';
import { initDb } from './src/config/db.js';
import transactionRouter from './src/routes/transaction.route.js';
import { rateLimiter } from './src/middleware/rateLimiter.js';
import { errorHandler } from './src/middleware/errorHandler.js';

const app = express();

// Middleware registration
app.use(express.json());
app.use(cors());
app.use('/api', rateLimiter);

// Router registration
app.use('/api/transactions', transactionRouter);

// Global error handler registration
app.use(errorHandler);

// Server startup and DB initialization
const startServer = async () => {
  await initDb();

  const server = app.listen(env.port, () => {
    console.log(`Server started on port ${env.port} (${env.nodeEnv} mode)`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(
        `Port ${env.port} is already in use. Please check if another process is running or change the PORT in your .env file.`,
      );
    } else {
      console.error('Server error:', error);
    }
    process.exit(1);
  });
};

startServer();
