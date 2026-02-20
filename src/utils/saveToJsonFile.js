import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function formatTimestamp(date = new Date()) {
    return date.toISOString()
        .replace(/:/g, '-')
        .replace(/\..+/, '') + 'Z';
}

export function saveToJsonFile({ data, platform, category, identifier }) {
    const outputDir = path.resolve(__dirname, '../../output', platform, category);

    fs.mkdirSync(outputDir, { recursive: true });

    const timestamp = formatTimestamp();

    const fileName = `${identifier}-${timestamp}.json`;
    const filePath = path.join(outputDir, fileName);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

    return filePath;
}