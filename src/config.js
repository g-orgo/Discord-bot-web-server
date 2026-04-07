export const PORT = process.env.PORT ?? 3001;
export const JWT_SECRET = process.env.JWT_SECRET ?? 'raptor-dev-secret-change-in-prod';
export const JWT_EXPIRES_IN = '7d';
export const DATA_PATH = process.env.DB_PATH ?? './data';
export const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
export const DISCORD_BOT_SECRET = process.env.DISCORD_BOT_SECRET ?? 'raptor-bot-secret-change-in-prod';
