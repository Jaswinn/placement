export const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
export const PORT = process.env.PORT || 4000;
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
// Allow both common Vite ports
export const ALLOWED_ORIGINS = ['http://localhost:5173', 'http://localhost:5174'];
