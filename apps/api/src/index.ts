/**
 * RetentIQ API Application Entry Point
 * Validates environment configuration on startup and initializes the Express HTTP server.
 */
import { validateEnv } from './config.js';

// Perform strict environment startup validation
validateEnv();

// Export the main application and server
export { app } from './server.js';
