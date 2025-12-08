import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// MySQL connection pool
export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'ecommerce',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Test connection
pool.getConnection()
  .then((connection) => {
    console.log('✅ Database connected');
    connection.release();
  })
  .catch((err) => {
    console.error('❌ Database connection error:', err);
  });

// Helper function to execute queries
// Converts PostgreSQL-style $1, $2 parameters to MySQL ? placeholders
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    // Convert PostgreSQL parameter style ($1, $2) to MySQL style (?)
    let mysqlQuery = text;
    if (params && params.length > 0) {
      // Replace $1, $2, etc. with ?
      mysqlQuery = text.replace(/\$(\d+)/g, '?');
    }

    const connection = await pool.getConnection();
    try {
      // Convert undefined to null for MySQL compatibility
      const sanitizedParams = params ? params.map(p => p === undefined ? null : p) : params;
      const [rows, fields] = await connection.execute(mysqlQuery, sanitizedParams) as [any, any];
      const duration = Date.now() - start;
      const rowCount = Array.isArray(rows) ? rows.length : (rows as any).affectedRows || 0;
      console.log('Executed query', { query: mysqlQuery.substring(0, 100), duration, rows: rowCount });
      
      // Return in similar format to pg for compatibility
      // Also include insertId for INSERT queries
      const result: any = {
        rows: Array.isArray(rows) ? rows : [rows],
        rowCount: rowCount,
        insertId: (connection as any).insertId || (rows as any).insertId,
      };
      
      return result;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
};

