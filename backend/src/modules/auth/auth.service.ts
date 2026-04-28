import bcrypt from 'bcryptjs';

// bcryptjs is used to hash/verify opaque refresh tokens before storing them
export const hashToken   = (token: string): Promise<string> => bcrypt.hash(token, 10);
export const verifyToken = (token: string, hash: string): Promise<boolean> => bcrypt.compare(token, hash);
