import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { runtimeHeaders } from '../core/runtime/headers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, '../config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

export async function login(platform, authToken) {
    const platformConfig = config.platforms[platform];
    if (!platformConfig) {
        throw new Error(`Unsupported platform: ${platform}`);
    }

    const { clientVersion, contentVersion, contentSecretKey, userAgent } = runtimeHeaders;

    const missingHeaders = [];
    if (!clientVersion) missingHeaders.push('clientVersion');
    if (!contentVersion) missingHeaders.push('contentVersion');
    if (!contentSecretKey) missingHeaders.push('contentSecretKey');
    if (!userAgent) missingHeaders.push('userAgent');

    if (missingHeaders.length > 0) {
        throw new Error(`Missing runtime headers: ${missingHeaders.join(', ')}`);
    }

    let url;
    let headers;
    let body;

    if (platform === 'steam') {
        url = 'https://steam.live.bhvrdbd.com/api/v1/auth/provider/steam/login';
        headers = {
            ...platformConfig.headers,
            'x-kraken-client-version': clientVersion,
            'x-kraken-content-version': contentVersion,
            'x-kraken-content-secret-key': contentSecretKey,
            'User-Agent': userAgent
        };
        body = JSON.stringify({
            abortIfAlreadyLoggedInUnifiedAccount: true,
            clientData: {},
            token: authToken
        });
    } else {
        url = `https://egs.live.bhvrdbd.com/api/v1/auth/provider/egs/login?token=${authToken}`;
        headers = {
            ...platformConfig.headers,
            'x-kraken-client-version': clientVersion,
            'x-kraken-content-version': contentVersion,
            'x-kraken-content-secret-key': contentSecretKey,
            'User-Agent': userAgent
        };
        body = JSON.stringify({
            abortIfAlreadyLoggedInUnifiedAccount: true,
            clientData: {}
        });
    }

    const response = await fetch(url, {
        method: 'POST',
        headers,
        body
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(`\nLogin failed:\n\n${JSON.stringify(result, null, 2)}`);
    }

    const setCookieHeader = response.headers.get('set-cookie');
    if (!setCookieHeader) {
        throw new Error('\nLogin response did not return a "Set-Cookie" header.');
    }

    const bhvrSessionCookie = setCookieHeader.split(';')[0]?.trim();
    if (!bhvrSessionCookie || !bhvrSessionCookie.startsWith('bhvrSession=')) {
        throw new Error(`\nLogin response did not include a valid "bhvrSession" cookie. Received ${bhvrSessionCookie ?? 'nothing.'}`);
    }

    const apiKey = result?.token ?? null;
    if (!apiKey) {
        throw new Error('\nLogin response did not include a "token".');
    }

    return {
        bhvrSessionCookie,
        apiKey
    };
}