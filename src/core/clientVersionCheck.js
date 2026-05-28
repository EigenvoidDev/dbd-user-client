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

export async function clientVersionCheck(platform, apiKey) {
    const platformConfig = config.platforms[platform];
    if (!platformConfig) {
        throw new Error(`Unsupported platform: ${platform}`);
    }

    if (!apiKey) {
        throw new Error('Missing api-key required to validate your client version.');
    }

    const url = getPlatformUrl(platform, 'clientVersionCheck');

    const { clientVersion, userAgent, longVersion } = runtimeHeaders;

    const missingHeaders = [];
    if (!clientVersion) missingHeaders.push('clientVersion');
    if (!userAgent) missingHeaders.push('userAgent');
    if (!longVersion) missingHeaders.push('longVersion');

    if (missingHeaders.length > 0) {
        throw new Error(`Missing runtime headers: ${missingHeaders.join(', ')}`);
    }

    const rsaPublicKey = await fetchKrakenRsaPublicKey(platform, apiKey);

    const encryptedLongVersion = rsaEncrypt(rsaPublicKey, longVersion);
    const encryptedShortVersion = rsaEncrypt(rsaPublicKey, clientVersion);

    const headers = {
        ...platformConfig.headers,
        'x-kraken-client-version': clientVersion,
        'x-kraken-analytics-dynamic-contents': '[""]',
        'api-key': apiKey,
        'User-Agent': userAgent
    };

    const body = JSON.stringify({
        longVersion: encryptedLongVersion,
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