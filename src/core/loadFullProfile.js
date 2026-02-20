import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { runtimeHeaders } from '../core/runtime/headers.js';

import { getPlatformUrl } from '../utils/platformUrls.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, '../config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

export async function loadFullProfile(platform, bhvrSessionCookie, apiKey) {
    const platformConfig = config.platforms[platform];
    if (!platformConfig) {
        throw new Error(`Unsupported platform: ${platform}`);
    }

    if (!bhvrSessionCookie || !apiKey) {
        throw new Error('Missing Cookie or api-key required to load your profile.');
    }

    const url = getPlatformUrl(platform, 'fullProfile');

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
        method: 'GET',
        headers
    });

    const result = await response.text();

    if (!response.ok) {
        let errorBody;
        try {
            errorBody = JSON.parse(result);
        } catch {
            errorBody = result;
        }
        throw new Error(
            typeof errorBody === 'string' ? errorBody : JSON.stringify(errorBody, null, 2)
        );
    }

    return result;
}