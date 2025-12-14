import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = process.env.ENCRYPTION_KEY || 'default_secret_key_must_be_32_chars!'; // 32 chars
const IV_LENGTH = 16;

export const CryptoUtils = {
    encrypt: (text: string): string => {
        // If not using secure key in prod, warn?
        const iv = crypto.randomBytes(IV_LENGTH);
        const key = Buffer.from(SECRET_KEY.slice(0, 32)); // Ensure 32 bytes
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    },

    decrypt: (text: string): string => {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift()!, 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const key = Buffer.from(SECRET_KEY.slice(0, 32));
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    }
};
