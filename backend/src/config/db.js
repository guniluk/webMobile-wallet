import { neon } from '@neondatabase/serverless';
import { env } from './env.js';

export const sql = neon(env.databaseUrl);

/**
 * Initialize database table schema and handle migration
 */
export const initDb = async () => {
  try {
    await sql`CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      title VARCHAR(255) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      category VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`;

    // Check if created_at column needs migration from DATE to TIMESTAMPTZ
    const checkColumn = await sql`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'transactions' AND column_name = 'created_at';
    `;
    
    if (checkColumn.length > 0 && checkColumn[0].data_type === 'date') {
      console.log('Migrating created_at column from DATE to TIMESTAMPTZ...');
      await sql`ALTER TABLE transactions ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at::timestamptz`;
      await sql`ALTER TABLE transactions ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP`;
      console.log('Migration completed successfully');
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error(' Database initialization error:', error);
    process.exit(1);
  }
};
