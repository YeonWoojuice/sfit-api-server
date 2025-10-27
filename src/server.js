require('dotenv').config();

const http = require('http');
const createApp = require('./app');
const { verifyConnection } = require('./config/database');

const port = process.env.PORT || 4000;
const app = createApp();
const server = http.createServer(app);

async function start() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not defined');
    }

    await verifyConnection();

    server.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

start();
