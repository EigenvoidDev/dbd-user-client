import { setRuntimeHeader } from '../runtime/headers.js';

import { compareSemver } from '../../utils/compareSemver.js';
import { getPlatformUrl } from '../../utils/platformUrls.js';
import { isValidContentVersion } from '../../utils/isValidContentVersion.js';

export async function fetchClientVersion(platform) {
    if (!platform) {
        throw new Error('Platform is required to fetch client version.');
    }

    const url = getPlatformUrl(platform, 'contentVersion');
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to fetch client version: HTTP ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const versionMap = result.availableVersions;

    if (!versionMap) {
        throw new Error('Missing "availableVersions" in response from API.');
    }

    const versionKeys = Object.keys(versionMap).filter(key => key.includes('_'));
    if (!versionKeys.length) {
        throw new Error('No client data versions returned from API.');
    }

    const versionEntries = versionKeys.map(key => {
        const [versionPattern, buildPart] = key.split('_');
        if (!buildPart) {
            throw new Error(`Unexpected key format: ${key}`);
        }

        const buildNumber = parseInt(buildPart.replace('live', ''), 10);
        if (Number.isNaN(buildNumber)) {
            throw new Error(`Invalid build number in key: ${key}`);
        }

        return {
            key,
            versionPattern,
            buildNumber
        };
    })
    .filter(entry => isValidContentVersion(entry.versionPattern));

    if (!versionEntries.length) {
        throw new Error('No valid client data versions returned from API.');
    }

    const latestVersion = versionEntries.reduce((a, b) => {
        const semverCompare = compareSemver(a.versionPattern, b.versionPattern);

        if (semverCompare !== 0) {
            return semverCompare > 0 ? a : b;
        }

        return a.buildNumber > b.buildNumber ? a : b;
    });

    const clientVersion = latestVersion.versionPattern;

    setRuntimeHeader('clientVersion', clientVersion);
    console.log(`Fetched client version (${platform}):`, clientVersion);

    return clientVersion;
}