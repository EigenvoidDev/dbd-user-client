const endpointMap = {
    banDecayAndGetDisconnectionPenaltyPoints: '/api/v1/players/ban/decayAndGetDisconnectionPenaltyPoints',
    banStatus: '/api/v1/players/ban/status',
    blockedPlayers: '/api/v1/players/me/blocked-players',
    claimRankRewards: '/api/v1/ranks/claim-rank-rewards',
    clientVersionCheck: '/api/v1/clientVersion/check',
    config: '/api/v1/config',
    contentVersion: '/api/v1/utils/contentVersion/version',
    dbdCharacterDataGetAll: '/api/v1/dbd-character-data/get-all',
    dbdInventories: '/api/v1/dbd-inventories/all',
    dbdLoadoutGetAllPresets: '/api/v1/dbd-loadout/get-all-presets',
    dbdPlayerCardGet: '/api/v1/dbd-player-card/get',
    dbdRewardsGiftUpdateGifts: '/api/v1/dbd-rewards/gift/update-gifts',
    fullProfile: '/api/v1/players/me/states/FullProfile/binary',
    getPlayerLevel: '/api/v1/extensions/playerLevels/getPlayerLevel',
    location: '/api/v1/me/location',
    logout: '/api/v1/me/logout',
    messages: '/api/v1/messages/listV2',
    mysteryBoxClaim: '/api/v1/mystery-box/StoreFeaturedWeekly/claim',
    mysteryBoxStatus: '/api/v1/mystery-box/status',
    news: '/api/v1/extensions/news?locale=en',
    onboarding: '/api/v1/onboarding',
    playername: '/api/v1/playername',
    resetGetPipsV2: '/api/v1/ranks/reset-get-pips-v2',
    usersamplingMeInPool: '/api/v1/usersampling/me/in-pool',
    wallet: '/api/v1/wallet/currencies'
};

export function getPlatformUrl(platform, endpoint) {
    const path = endpointMap[endpoint];

    if (!path) {
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }

    return `https://${platform}.live.bhvrdbd.com${path}`;
}