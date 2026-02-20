import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { base64Encode } from '../../utils/base64Encode.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, '../../config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const { clientId, clientSecret, deploymentId, scope } = config.platforms.egs.client;
const { devAuthToolCredentialsName, exchangeCodeHost, exchangeCodePort } = config.platforms.egs.account;

const tokenUrl = 'https://api.epicgames.dev/epic/oauth/v2/token';

async function getExchangeCode() {
    const exchangeCodeUrl = `http://${exchangeCodeHost}:${exchangeCodePort}/${devAuthToolCredentialsName}/exchange_code`;

    const response = await fetch(exchangeCodeUrl, {
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.exchange_code) {
        throw new Error('Dev Auth Tool response did not include an "exchange_code".');
    }

    return result.exchange_code;
}

async function getAccessTokenFromExchangeCode(exchangeCode) {
    const authHeader = 'Basic ' + base64Encode(`${clientId}:${clientSecret}`);

    const formData = new URLSearchParams();
    formData.append('grant_type', 'exchange_code');
    formData.append('scope', scope);
    formData.append('exchange_code', exchangeCode);
    formData.append('deployment_id', deploymentId);

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': authHeader
        },
        body: formData.toString()
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (result.errorCode) {
        throw new Error(result.errorMessage || `HTTP ${response.status} ${response.statusText}`);
    }

    return result;
}

export async function logInWithDevAuthTool() {
    console.log('Fetching Epic exchange code...\n');
    const exchangeCode = await getExchangeCode();
    console.log('Generated exchange code:', exchangeCode);

    console.log('\nRequesting access token...\n');
    const response = await getAccessTokenFromExchangeCode(exchangeCode);

    return response;
}