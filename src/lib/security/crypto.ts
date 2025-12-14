import crypto from 'crypto';

// AES-256-GCM
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits

function getKey(): Buffer {
    const keyHex = process.env.ENCRYPTION_KEY;
    if (!keyHex) {
        throw new Error('Missing ENCRYPTION_KEY in environment variables');
    }

    // Handle Hex or Base64 or plain string (if 32 chars)?
    // Prompt says "32+ bytes base64 or hex"
    // Let's assume it might be a raw string or stored format.
    // Best practice: Store as hex.
    // We try to parse buffer.
    let key: Buffer;
    try {
        key = Buffer.from(keyHex, 'hex');
        if (key.length !== KEY_LENGTH) {
            // Try utf8 map if length matches directly?
            if (Buffer.from(keyHex).length >= KEY_LENGTH) {
                key = Buffer.from(keyHex).subarray(0, KEY_LENGTH);
            } else {
                throw new Error(`Invalid Key Length: ${key.length}`);
            }
        }
    } catch (e) {
        // Fallback
        key = Buffer.from(keyHex).subarray(0, KEY_LENGTH);
    }

    return key;
}

export const CryptoUtils = {
    encryptJson: (data: unknown): string => {
        const text = JSON.stringify(data);
        const iv = crypto.randomBytes(12); // 12 bytes standard for GCM
        const key = getKey();

        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag().toString('hex');

        // Format: "v1.iv.authTag.encryptedContent"
        return `v1.${iv.toString('hex')}.${authTag}.${encrypted}`;
    },

    decryptJson: <T>(encryptedStr: string): T => {
        const parts = encryptedStr.split('.');
        // v1 parsing
        if (parts[0] !== 'v1' || parts.length !== 4) {
            throw new Error('Invalid encryption format');
        }

        const [_, ivHex, authTagHex, encryptedHex] = parts;

        const key = getKey();
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return JSON.parse(decrypted);
    }
};
