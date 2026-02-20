export function isValidContentVersion(versionPattern) {
    if (typeof versionPattern !== 'string') return false;
    return /^(\d+)\.(\d+)\.(\d)$/.test(versionPattern);
}