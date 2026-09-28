const crypto = require("crypto");

// RFC 4648 Base32 alphabet
const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Generate random Base32 secret for TOTP (Microsoft / Google Authenticator)
 */
function generateSecret(length = 20) {
    const randomBytes = crypto.randomBytes(length);
    let secret = "";
    for (let i = 0; i < randomBytes.length; i++) {
        secret += BASE32_CHARS[randomBytes[i] % 32];
    }
    return secret;
}

/**
 * Generate standard otpauth:// URI for QR Code scanning
 */
function generateURI({ issuer, label, secret }) {
    const encodedIssuer = encodeURIComponent(issuer || "SIVA");
    const encodedLabel = encodeURIComponent(label || "user");
    return `otpauth://totp/${encodedIssuer}:${encodedLabel}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Decode Base32 string to Buffer
 */
function base32ToBuffer(base32) {
    const cleanBase32 = String(base32 || "").toUpperCase().replace(/=+$/, "");
    let bits = "";
    for (let i = 0; i < cleanBase32.length; i++) {
        const val = BASE32_CHARS.indexOf(cleanBase32[i]);
        if (val === -1) continue;
        bits += val.toString(2).padStart(5, "0");
    }
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.substr(i, 8), 2));
    }
    return Buffer.from(bytes);
}

/**
 * Generate 6-digit HOTP token from secret and counter
 */
function generateHOTP(secret, counter) {
    const key = base32ToBuffer(secret);
    const buf = Buffer.alloc(8);
    buf.writeBigInt64BE(BigInt(counter));
    const hmac = crypto.createHmac("sha1", key).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000;
    return code.toString().padStart(6, "0");
}

/**
 * Verify 6-digit TOTP token with time-window tolerance
 */
function verifySync({ token, secret, epochTolerance = 30 }) {
    if (!token || !secret) return { valid: false };
    const cleanToken = String(token).trim();
    if (!/^\d{6}$/.test(cleanToken)) return { valid: false };

    const timeStep = 30; // 30s per standard RFC 6238
    const currentCounter = Math.floor(Date.now() / 1000 / timeStep);
    const window = Math.max(1, Math.round(epochTolerance / timeStep));

    for (let i = -window; i <= window; i++) {
        const expected = generateHOTP(secret, currentCounter + i);
        if (expected === cleanToken) {
            return { valid: true };
        }
    }
    return { valid: false };
}

module.exports = {
    generateSecret,
    generateURI,
    verifySync
};
