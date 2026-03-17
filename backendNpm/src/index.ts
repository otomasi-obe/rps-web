import RPSAPIServer from './apiserver/index.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

// Get configuration from environment or use defaults
const port = parseInt(process.env.API_PORT || '5000', 10);
const host = process.env.API_HOST || '0.0.0.0';

// Create and start server
const server = new RPSAPIServer(port, host);
server.start();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️ Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️ Shutting down gracefully...');
  process.exit(0);
});
