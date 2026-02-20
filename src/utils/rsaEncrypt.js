import crypto from 'crypto';

export function rsaEncrypt(rsaPublicKey, plaintext) {
    if (!rsaPublicKey || typeof rsaPublicKey !== 'string') {
        throw new Error('Valid RSA public key is required.');
    }

    if (typeof plaintext !== 'string') {
        throw new Error('Plaintext must be a string.');
    }

    const pemKey = `
-----BEGIN PUBLIC KEY-----
${rsaPublicKey}
-----END PUBLIC KEY-----
`.trim();

    const buffer = Buffer.from(plaintext, 'utf8');

    const encrypted = crypto.publicEncrypt(
        {
            key: pemKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha1'
        },
        buffer
    );

    return encrypted.toString('base64');
}