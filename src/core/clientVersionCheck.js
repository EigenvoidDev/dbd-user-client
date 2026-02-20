import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { fetchKrakenRsaPublicKey } from '../core/providers/fetchKrakenRsaPublicKey.js';
import { runtimeHeaders } from '../core/runtime/headers.js';

import { getPlatformUrl } from '../utils/platformUrls.js';
import { rsaEncrypt } from '../utils/rsaEncrypt.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, '../config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

export async function clientVersionCheck(platform, bhvrSessionCookie, apiKey) {
    const platformConfig = config.platforms[platform];
    if (!platformConfig) {
        throw new Error(`Unsupported platform: ${platform}`);
    }

    if (!bhvrSessionCookie || !apiKey) {
        throw new Error('Missing Cookie or api-key required to validate your client version.');
    }

    const url = getPlatformUrl(platform, 'clientVersionCheck');

    const { clientVersion, userAgent } = runtimeHeaders;

    const missingHeaders = [];
    if (!clientVersion) missingHeaders.push('clientVersion');
    if (!userAgent) missingHeaders.push('userAgent');

    if (missingHeaders.length > 0) {
        throw new Error(`Missing runtime headers: ${missingHeaders.join(', ')}`);
    }

    const rsaPublicKey = await fetchKrakenRsaPublicKey(platform, bhvrSessionCookie, apiKey);

    const encryptedShortVersion = rsaEncrypt(rsaPublicKey, clientVersion);

    const headers = {
        ...platformConfig.headers,
        'x-kraken-client-version': clientVersion,
        'User-Agent': userAgent,
        'Cookie': bhvrSessionCookie,
        'api-key': apiKey
    };

    const body = JSON.stringify({
        longVersion: 'klNTEPtrvV8ddmthgttnVYAgDR0E6OOaNRaAJASoe+SnGoe+RrnWeDgcn9eKsDHv/jyg76Q4Srgk1alznBUpuHUz8LCQLTzTs2cpnhq0YhG4WwVkngXm3ELQwmQ0uW5vDrfJO2y1NXQBF6LZMkz2jBp2QwN/JWpcXwDZrchn2CKtPsuZQYvTeAVWF40JKURisesdfYlFay7spCH8ykFscIxrhKxHH6D/dOOQk34AO6WeRhTPYbKrwB2PeDKh4oMOFVP9a9+rcBuAq7AYq13spirRqXoiswywTAjpTFV+cTtMwurees5mLlfGWYOF/EtTclWEjyCea8ox3NS9VdL6Yg==',
        shortVersion: encryptedShortVersion
    });

    const response = await fetch(url, {
        method: 'POST',
        headers,
        body
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(JSON.stringify(result, null, 2));
    }

    return result;
}