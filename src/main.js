#!/usr/bin/env node

import { createRequire } from 'module';
import readline from 'readline';

import { claimMysteryBox } from './core/claimMysteryBox.js';
import { claimRankRewards } from './core/claimRankRewards.js';
import { clientVersionCheck } from './core/clientVersionCheck.js';
import { dbdCharacterDataGetAll } from './core/dbdCharacterDataGetAll.js';
import { getBanStatus } from './core/getBanStatus.js';
import { getDPP } from './core/getDPP.js';
import { getLocation } from './core/getLocation.js';
import { getMeInUserSamplingPool } from './core/getMeInUserSamplingPool.js';
import { getOnboardingProgress } from './core/getOnboardingProgress.js';
import { getPlayerLevel } from './core/getPlayerLevel.js';
import { getPlayerName } from './core/getPlayerName.js';
import { getPlayerPipsV2 } from './core/getPlayerPipsV2.js';
import { loadBlocklist } from './core/loadBlocklist.js';
import { loadEquippedPlayerCard } from './core/loadEquippedPlayerCard.js';
import { loadFullProfile } from './core/loadFullProfile.js';
import { loadInventory } from './core/loadInventory.js';
import { loadLoadoutPresets } from './core/loadLoadoutPresets.js';
import { loadMessages } from './core/loadMessages.js';
import { loadMysteryBoxStatus } from './core/loadMysteryBoxStatus.js';
import { loadNews } from './core/loadNews.js';
import { loadWallet } from './core/loadWallet.js';
import { login } from './core/login.js';
import { logout } from './core/logout.js';
import { updateGifts } from './core/updateGifts.js';

import { fetchClientVersion } from './core/providers/fetchClientVersion.js';
import { fetchContentSecretKey } from './core/providers/fetchContentSecretKey.js';
import { fetchContentVersion } from './core/providers/fetchContentVersion.js';
import { fetchUserAgent } from './core/providers/fetchUserAgent.js';

import { logInWithDevAuthTool } from './platforms/egs/authManager.js';

import { initSteam, getSteamIdentity, getAuthTicketForWebApi, cancelAuthTicket } from './platforms/steam/getAuthSessionTicket.js';

import { saveToJsonFile } from './utils/saveToJsonFile.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

function isLoggedIn(session, message) {
    if (!session.bhvrSessionCookie || !session.apiKey) {
        console.log(`\n${message}`);
        return false;
    }
    return true;
}

async function askQuestion(rl, question) {
    return new Promise(resolve => rl.question(question, resolve));
}

async function runAction(action) {
    try {
        await action();
    } catch (error) {
        console.error(error.message);
    }
}

async function askPlatform() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const validInputs = ['1', 'steam', '2', 'egs'];

    let platform = '';
    
    while (!validInputs.includes(platform)) {
        console.log('Which platform would you like to use to authenticate to Dead by Daylight?');
        console.log('[1] Steam');
        console.log('[2] Epic Games\n');

        platform = (await askQuestion(rl, 'Enter your selection: ')).trim().toLowerCase();

        if (!validInputs.includes(platform)) {
            console.log('\nInvalid selection. Please enter "1" or "2".\n');
        }
    }

    rl.close();
    return (platform === '1' || platform === 'steam') ? 'steam' : 'egs';
}

async function authenticatePlatform(platform) {
    switch (platform) {
        case 'steam': {
            const client = initSteam(381210);
            if (!client) return null;

            const identity = getSteamIdentity();
            if (!identity) return null;

            console.log(`\nLogged in as ${identity.name}. Simulating play session for Dead by Daylight.\n`);

            const authData = await getAuthTicketForWebApi('KRAKEN_DBD');
            if (!authData) return null;

            console.log('\nRetrieved authentication ticket:', authData.hexTicket);

            return {
                platform: 'steam',
                client,
                identity,
                authTicket: authData.authTicket,
                hexTicket: authData.hexTicket
            };
        }

        case 'egs': {
            const oauthResult = await logInWithDevAuthTool();
            if (!oauthResult) return null;

            const hours = Math.round(oauthResult.expires_in / 3600);
            const hourLabel = hours === 1 ? 'hour' : 'hours';

            const previewToken = oauthResult.access_token.length > 48 ? `${oauthResult.access_token.slice(0, 24)}…${oauthResult.access_token.slice(-8)}` : oauthResult.access_token;

            console.table([
                { Field: 'Access Token (Preview)', Value: previewToken },
                { Field: 'Account ID', Value: oauthResult.account_id },
                { Field: 'Authentication Time', Value: oauthResult.auth_time },
                { Field: 'Token Expires At', Value: `${oauthResult.expires_at} (${hours} ${hourLabel})` }
            ]);

            console.log('\nFull Access Token:', oauthResult.access_token);

            return {
                platform: 'egs',
                authResult: oauthResult
            };
        }

        default:
            throw new Error(`Unsupported platform: ${platform}`);
    }
}

function exitWithCleanup(platform, platformAuth) {
    if (platform === 'steam' && platformAuth?.authTicket) {
        console.log('\nCanceling Steam auth ticket...');
        cancelAuthTicket(platformAuth.authTicket);
        platformAuth.authTicket = null;
    } else if (platform === 'egs' && platformAuth?.authResult) {
        console.log('\nEnding Epic Games session...');
    }

    console.log('Exiting process.');
    process.exit(0);
}

async function runActionMenu({ platform, platformAuth }) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    let session = {
        bhvrSessionCookie: null,
        apiKey: null
    };

    const identifier = platform === 'steam' ? platformAuth.identity.steamId64 : platformAuth.authResult.account_id;

    process.on('SIGINT', () => {
        rl.close();
        exitWithCleanup(platform, platformAuth);
    });

    while (true) {
        console.log('\nSelect an action:');
        console.log('[1] Log in to Dead by Daylight');
        console.log('[2] Validate Client Version');
        console.log('[3] Get HVS Flag');
        console.log('[4] Load Messages');
        console.log('[5] Load News');
        console.log('[6] Get Location');
        console.log('[7] Get Player Name');
        console.log('[8] Load Mystery Box Status');
        console.log('[9] Load Free Gifts');
        console.log('[10] Load Inventory');
        console.log('[11] Load Profile');
        console.log('[12] Load Wallet');
        console.log('[13] Load Character Data');
        console.log('[14] Load Loadout Presets');
        console.log('[15] Load Player Card');
        console.log('[16] Load Blocklist');
        console.log('[17] Reset Rank and Get Player Pips');
        console.log('[18] Get Ban Status');
        console.log('[19] Get Player Level');
        console.log('[20] Get Onboarding Progress');
        console.log('[21] Get Disconnection Penalty Points');
        console.log('[22] Claim Season Refresh Rewards');
        console.log('[23] Claim Mystery Box');
        console.log('[24] Log out of Dead by Daylight');
        console.log('[25] Exit\n');

        const value = (await askQuestion(rl, 'Enter your selection: ')).trim();

        switch (value) {
            case '1':
                await runAction(async () => {
                    console.log('\nInitializing runtime headers...\n');

                    await fetchClientVersion(platform);
                    await fetchContentVersion(platform);
                    await fetchContentSecretKey();
                    await fetchUserAgent(platform, rl);

                    const authToken = platform === 'steam'
                        ? platformAuth.hexTicket
                        : platformAuth.authResult.access_token;

                    if (!authToken) throw new Error('Failed to get auth token.');

                    const result = await login(platform, authToken);

                    if (result) {
                        session.bhvrSessionCookie = result.bhvrSessionCookie;
                        session.apiKey = result.apiKey;

                        console.log('\nLogin successful.\n');
                        console.log('Cookie:', session.bhvrSessionCookie);
                        console.log('api-key:', session.apiKey);
                    }
                });
                break;

            case '2':
                if (!isLoggedIn(session, 'You must be logged in to validate your client version.')) break;

                await runAction(async () => {
                    console.log('\nValidating client version...\n');
                    const result = await clientVersionCheck(platform, session.bhvrSessionCookie, session.apiKey);
                    console.log(JSON.stringify(result, null, 2));
                });
                break;

            case '3':
                if (!isLoggedIn(session, 'You must be logged in to retrieve your HVS flag.')) break;

                await runAction(async () => {
                    console.log('\nRetrieving HVS flag...\n');
                    const result = await getMeInUserSamplingPool(platform, session.bhvrSessionCookie, session.apiKey);
                    console.log(JSON.stringify(result, null, 2));
                });
                break;

            case '4':
                if (!isLoggedIn(session, 'You must be logged in to load your messages.')) break;

                await runAction(async () => {
                    console.log('\nLoading messages...\n');
                    const result = await loadMessages(platform, session.bhvrSessionCookie, session.apiKey);

                    const filePath = saveToJsonFile({
                        data: result,
                        platform,
                        category: 'MessagesData',
                        identifier
                    });

                    console.log(`Messages data saved to: ${filePath}`);
                });
                break;

            case '5':
                if (!isLoggedIn(session, 'You must be logged in to load your news.')) break;

                await runAction(async () => {
                    console.log('\nLoading news...\n');
                    const result = await loadNews(platform, session.bhvrSessionCookie, session.apiKey);

                    const filePath = saveToJsonFile({
                        data: result,
                        platform,
                        category: 'NewsData',
                        identifier
                    });

                    console.log(`News data saved to: ${filePath}`);
                });
                break;

            case '6':
                if (!isLoggedIn(session, 'You must be logged in to retrieve your location.')) break;

                await runAction(async () => {
                    console.log('\nRetrieving location...\n');
                    const result = await getLocation(platform, session.bhvrSessionCookie, session.apiKey);
                    console.log(JSON.stringify(result, null, 2));
                });
                break;

            case '7':
                if (!isLoggedIn(session, 'You must be logged in to retrieve your player name.')) break;

                await runAction(async () => {
                    console.log('\nRetrieving player name...\n');
                    const result = await getPlayerName(platform, session.bhvrSessionCookie, session.apiKey);
                    console.log(JSON.stringify(result, null, 2));
                });
                break;

            case '8':
                if (!isLoggedIn(session, 'You must be logged in to load your mystery box status.')) break;

                await runAction(async () => {
                    console.log('\nLoading mystery box status...\n');
                    const result = await loadMysteryBoxStatus(platform, session.bhvrSessionCookie, session.apiKey);
                    console.log(JSON.stringify(result, null, 2));
                });
                break;

            case '9':
                if (!isLoggedIn(session, 'You must be logged in to load your free gifts.')) break;

                await runAction(async () => {
                    console.log('\nLoading free gifts...\n');
                    const result = await updateGifts(platform, session.bhvrSessionCookie, session.apiKey);
                    console.log(JSON.stringify(result, null, 2));
                });
                break;

            case '10':
                if (!isLoggedIn(session, 'You must be logged in to load your inventory.')) break;

                await runAction(async () => {
                    console.log('\nLoading inventory...\n');
                    const result = await loadInventory(platform, session.bhvrSessionCookie, session.apiKey);

                    const filePath = saveToJsonFile({
                        data: result,
                        platform,
                        category: 'InventoryData',
                        identifier
                    });

                    console.log(`Inventory data saved to: ${filePath}`);
                });
                break;

            case '11':
                if (!isLoggedIn(session, 'You must be logged in to load your profile.')) break;

                await runAction(async () => {
                    console.log('\nLoading profile...\n');
                    const result = await loadFullProfile(platform, session.bhvrSessionCookie, session.apiKey);
                    console.log(result);
                });
                break;

            case '12':
                if (!isLoggedIn(session, 'You must be logged in to load your wallet.')) break;

                await runAction(async () => {
                    console.log('\nLoading wallet...\n');
                    const result = await loadWallet(platform, session.bhvrSessionCookie, session.apiKey);

                    const filePath = saveToJsonFile({
                        data: result,
                        platform,
                        category: 'WalletData',
                        identifier
                    });

                    console.log(`Wallet data saved to: ${filePath}`);
                });
                break;

            case '13':
                if (!isLoggedIn(session, 'You must be logged in to load your character data.')) break;

                await runAction(async () => {
                    console.log('\nLoading character data...\n');
                    const result = await dbdCharacterDataGetAll(platform, session.bhvrSessionCookie, session.apiKey);

                    const filePath = saveToJsonFile({
                        data: result,
                        platform,
                        category: 'CharacterData',
                        identifier
                    });

                    console.log(`Character data saved to: ${filePath}`);
                });
                break;

            case '14':
                if (!isLoggedIn(session, 'You must be logged in to load your loadout presets.')) break;

                await runAction(async () => {
                    console.log('\nLoading loadout presets...\n');
                    const result = await loadLoadoutPresets(platform, session.bhvrSessionCookie, session.apiKey);
                    console.log(JSON.stringify(result, null, 2));
                });
                break;

            case '15':
                if (!isLoggedIn(session, 'You must be logged in to load your player card.')) break;

                await runAction(async () => {
                    console.log('\nLoading player card...\n');
                    const result = await loadEquippedPlayerCard(platform, session.bhvrSessionCookie, session.apiKey);
                    console.log(JSON.stringify(result, null, 2));
                });
                break;

            case '16':
                if (!isLoggedIn(session, 'You must be logged in to load your blocklist.')) break;

                await runAction(async () => {
                    console.log('\nLoading blocklist...\n');
                    const result = await loadBlocklist(platform, session.bhvrSessionCookie, session.apiKey);
                    console.log(JSON.stringify(result, null, 2));
                });
                break;

            case '17':
                if (!isLoggedIn(session, 'You must be logged in to reset your rank and retrieve your player pips.')) break;

                await runAction(async () => {
                    console.log('\nAttempting to reset rank and retrieve player pips...\n');
                    const result = await getPlayerPipsV2(platform, session.bhvrSessionCookie, session.apiKey);
                    console.log(JSON.stringify(result, null, 2));
                });
                break;

            case '18':
                if (!isLoggedIn(session, 'You must be logged in to retrieve your ban status.')) break;

                await runAction(async () => {
                    console.log('\nRetrieving ban status...\n');
                    const result = await getBanStatus(platform, session.bhvrSessionCookie, session.apiKey);
                    console.log(JSON.stringify(result, null, 2));
                });
                break;

            case '19':
                if (!isLoggedIn(session, 'You must be logged in to retrieve your player level.')) break;

                await runAction(async () => {
                    console.log('\nRetrieving player level...\n');
                    const result = await getPlayerLevel(platform, session.bhvrSessionCookie, session.apiKey);
                    console.log(JSON.stringify(result, null, 2));
                });
                break;

            case '20':
                if (!isLoggedIn(session, 'You must be logged in to retrieve your onboarding progress.')) break;

                await runAction(async () => {
                    console.log('\nRetrieving onboarding progress...\n');
                    const result = await getOnboardingProgress(platform, session.bhvrSessionCookie, session.apiKey);
                    
                    const filePath = saveToJsonFile({
                        data: result,
                        platform,
                        category: 'OnboardingSaveData',
                        identifier
                    });

                    console.log(`Onboarding progress saved to: ${filePath}`);
                });
                break;

            case '21':
                if (!isLoggedIn(session, 'You must be logged in to retrieve your disconnection penalty points.')) break;

                await runAction(async () => {
                    console.log('\nRetrieving disconnection penalty points...\n');
                    const result = await getDPP(platform, session.bhvrSessionCookie, session.apiKey);
                    console.log(JSON.stringify(result, null, 2));
                });
                break;

            case '22':
                if (!isLoggedIn(session, 'You must be logged in to claim your season refresh rewards.')) break;

                await runAction(async () => {
                    console.log('\nAttempting to claim season refresh rewards...\n');
                    const result = await claimRankRewards(platform, session.bhvrSessionCookie, session.apiKey);
                    console.log(JSON.stringify(result, null, 2));
                });
                break;

            case '23':
                if (!isLoggedIn(session, 'You must be logged in to claim your mystery box.')) break;

                await runAction(async () => {
                    console.log('\nAttempting to claim mystery box...\n');
                    const result = await claimMysteryBox(platform, session.bhvrSessionCookie, session.apiKey);
                    console.log(JSON.stringify(result, null, 2));
                });
                break;

            case '24':
                if (!isLoggedIn(session, 'You must be logged in to log out.')) break;

                await runAction(async () => {
                    console.log('\nLogging out...\n');
                    const result = await logout(platform, session.bhvrSessionCookie, session.apiKey);
                    console.log(JSON.stringify(result, null, 2));

                    session.bhvrSessionCookie = null;
                    session.apiKey = null;
                });
                break;

            case '25':
                rl.close();
                exitWithCleanup(platform, platformAuth);
                break;

            default:
                console.log('\nInvalid selection. Please enter a number between 1 and 25 inclusive.');
        }
    }
}

async function main() {
    try {
        console.clear();

        console.log(`${pkg.displayName} v${pkg.version}`);
        console.log(`Author: ${pkg.author}`);
        console.log('Website: https://eigenvoid.dev\n');

        const platform = await askPlatform();

        const platformDisplayNames = {
            steam: 'Steam',
            egs: 'Epic Games'
        };
        const platformName = platformDisplayNames[platform];

        console.log(`\nYou have selected ${platformName} as your platform. Initializing ${platformName} authentication flow...\n`);

        let platformAuth = null;

        try {
            platformAuth = await authenticatePlatform(platform);
        } catch (error) {
            platformAuth = null;
        }

        if (!platformAuth) {
            if (platform === 'steam') {
                console.error(
                    'Steam authentication failed. Ensure that the following requirements are met:\n\n' +
                    '1. The Steam client is running.\n' +
                    '2. You are logged in to Steam.\n' +
                    '3. The account that you are logged in to owns Dead by Daylight.\n' +
                    '4. Dead by Daylight is installed and updated to the latest version.\n\n' +
                    'After verifying that these requirements are met, restart this application.'
                );
            } else if (platform === 'egs') {
                console.error(
                    'Epic Games authentication failed. Ensure that the following requirements are met:\n\n' +
                    '1. The Developer Authentication Tool is running.\n' +
                    '2. You are logged in to Epic Games in the Developer Authentication Tool.\n' +
                    '3. Your config.json file is configured correctly:\n' +
                    '   - devAuthToolCredentialsName matches the credential name in the Developer Authentication Tool\n' +
                    '   - exchangeCodePort matches the port the Developer Authentication Tool is listening on\n' +
                    '4. The account that you are logged in to owns Dead by Daylight.\n' +
                    '5. Dead by Daylight is installed and updated to the latest version.\n\n' +
                    'After verifying that these requirements are met, restart this application.'
                );
            }
            process.exit(1);
        }

        await runActionMenu({ platform, platformAuth });
        process.exit(0);

    } catch (error) {
        console.error('An unexpected error occurred:', error.message);
        process.exit(1);
    }
}

main();