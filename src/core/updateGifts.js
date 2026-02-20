import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { runtimeHeaders } from '../core/runtime/headers.js';

import { getPlatformUrl } from '../utils/platformUrls.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, '../config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

export async function updateGifts(platform, bhvrSessionCookie, apiKey) {
    const platformConfig = config.platforms[platform];
    if (!platformConfig) {
        throw new Error(`Unsupported platform: ${platform}`);
    }

    if (!bhvrSessionCookie || !apiKey) {
        throw new Error('Missing Cookie or api-key required to load your free gifts.');
    }

    const url = getPlatformUrl(platform, 'dbdRewardsGiftUpdateGifts');

    const { clientVersion, userAgent } = runtimeHeaders;

    const missingHeaders = [];
    if (!clientVersion) missingHeaders.push('clientVersion');
    if (!userAgent) missingHeaders.push('userAgent');

    if (missingHeaders.length > 0) {
        throw new Error(`Missing runtime headers: ${missingHeaders.join(', ')}`);
    }

    const headers = {
        ...platformConfig.headers,
        'x-kraken-client-version': clientVersion,
        'User-Agent': userAgent,
        'Cookie': bhvrSessionCookie,
        'api-key': apiKey
    };

    const response = await fetch(url, {
        method: 'POST',
        headers
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(JSON.stringify(result, null, 2));
    }

    return result;
}