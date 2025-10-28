require('dotenv').config();

const http = require('http');
const createApp = require('./app');
const { verifyConnection } = require('./config/database');

const port = process.env.PORT || 4000;
const app = createApp();
const server = http.createServer(app);

async function start() {
  try {
    if (process.env.DATABASE_URL) {
      console.log('Using DATABASE_URL from environment');
      await verifyConnection();
    } else {
      console.warn(
        'DATABASE_URL is not defined. Server will start, but database features are disabled until it is set.'
      );
    }

    server.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

start();
