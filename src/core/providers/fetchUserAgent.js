import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { setRuntimeHeader } from '../runtime/headers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, '../../config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

export async function fetchUserAgent(platform, rl) {
    if (!platform) {
        throw new Error('Platform is required to fetch user agent.');
    }

    const defaultPaths = {
        steam: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Dead by Daylight\\DeadByDaylight\\Content\\Version\\DeadByDaylightVersionNumber.txt',
        egs: 'C:\\Program Files\\Epic Games\\DeadByDaylight\\DeadByDaylight\\Content\\Version\\DeadByDaylightVersionNumber.txt'
    };

    let filePath = defaultPaths[platform];

    if (!fs.existsSync(filePath)) {
        console.warn(`\nWarning: DeadbyDaylightVersionNumber.txt not found in expected default location for ${platform}.\n`);

        if (!rl) {
            throw new Error('No readline interface available to prompt for file path.');
        }
        
        filePath = await new Promise(resolve => {
            rl.question('Enter the absolute file path to DeadByDaylightVersionNumber.txt: ', answer => {
                let resolvedFilePath = answer.trim();

                if (
                    (resolvedFilePath.startsWith('"') && resolvedFilePath.endsWith('"')) ||
                    (resolvedFilePath.startsWith("'") && resolvedFilePath.endsWith("'"))
                ) {
                    resolvedFilePath = resolvedFilePath.slice(1, -1);
                }

                resolve(path.normalize(resolvedFilePath));
            });
        });

        if (!fs.existsSync(filePath)) {
            throw new Error('File does not exist at the provided file path.');
        }
    }

    if (path.basename(filePath) !== 'DeadByDaylightVersionNumber.txt') {
        throw new Error('File must be named "DeadByDaylightVersionNumber.txt".');
    }

    const content = fs.readFileSync(filePath, 'utf-8').trim();

    if (!content.startsWith('DBD')) {
        throw new Error('File content must start with "DBD".');
    }

    const platformIndicator = platform === 'steam' ? 'Windows' : 'EGS';
    const clientOs = config.platforms[platform].headers['x-kraken-client-os'];
    const userAgent = `DeadByDaylight/${content} (http-legacy) ${platformIndicator}/${clientOs}`;

    setRuntimeHeader('userAgent', userAgent);
    console.log(`Fetched user agent (${platform}):`, userAgent);

    return userAgent;
}