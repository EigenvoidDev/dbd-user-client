import steamworks from 'steamworks.js';

let client;

export function initSteam(appId = 381210) {
    if (client) return client;

    try {
        client = steamworks.init(appId);
    } catch {
        return null;
    }

    return client;
}

export function getSteamIdentity() {
    if (!client) return null;

    const localplayer = client.localplayer;

    return {
        name: localplayer.getName(),
        steamId64: localplayer.getSteamId().steamId64
    };
}

export async function getAuthTicketForWebApi(identity = 'KRAKEN_DBD') {
    if (!client) return null;

    const authTicket = await client.auth.getAuthTicketForWebApi(identity);
    const ticketBytes  = authTicket.getBytes();

    return {
        authTicket,
        hexTicket: ticketBytes.toString('hex')
    };
}

export function cancelAuthTicket(authTicket) {
    if (authTicket) {
        authTicket.cancel();
    }
}