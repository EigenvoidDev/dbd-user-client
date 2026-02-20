import { setRuntimeHeader } from '../runtime/headers.js';

import { compareSemver } from '../../utils/compareSemver.js';

const url = 'https://keyapi.deadbyqueue.com/keys';

export async function fetchContentSecretKey() {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to fetch content secret key: HTTP ${response.status} ${response.statusText}`);
    }

    const result = await response.text();

    const lines = result.split('\n').map(line => line.trim()).filter(Boolean);

    const liveEntries = lines.map(line => {
        const match = line.match(/^"(.+?)":\s*"(.+)"$/);
        if (!match) return null;
        const [, key, value] = match;
        const [versionPattern, branch] = key.split('_');
        if (branch !== 'live') return null;
        return {
            key,
            versionPattern,
            value
        };
    }).filter(Boolean);

    if (!liveEntries.length) {
        throw new Error('No content secret keys for the "live" branch returned from API.');
    }

    const latestVersion = liveEntries.reduce((a, b) =>
        compareSemver(a.versionPattern, b.versionPattern) > 0 ? a : b
    );

    const contentSecretKey = latestVersion.value;

    setRuntimeHeader('contentSecretKey', contentSecretKey);
    console.log(`Fetched content secret key (${latestVersion.key}):`, contentSecretKey);

    return contentSecretKey;
}