# DBD User Client

[Dead by Daylight](https://deadbydaylight.com/) is an online asymmetric multiplayer survival horror video game developed and published by Canadian studio [Behaviour Interactive](https://www.bhvr.com/).

**DBD User Client** is a desktop client for authenticating and interacting with Dead by Daylight's private API across both Steam and Epic Games. It provides structured CLI access to player profile data, inventory contents, progression status, reward claiming, and other account-level API endpoints.

## Disclaimer

DBD User Client is not affiliated with or endorsed by Behaviour Interactive Inc. (BHVR) and constitutes third-party software. Its use carries inherent risks, including potential enforcement action against your Dead by Daylight account, up to and including suspension or termination. This software is provided for educational and personal use only. By using it, you acknowledge and accept these risks, agree to proceed at your own discretion, and release the author from any responsibility or liability for any consequences arising from its use.

## Installation

1. Install [Node.js](https://nodejs.org/en/download) (v18 or later).
2. Clone the repository.
3. Run `npm install` in the project's root directory to install the required dependencies.

## Platform Setup

### Steam

Steam authentication requires the Steam client and ownership of Dead by Daylight.

Before launching DBD User Client, ensure that:
1. The Steam client is running.
2. You are logged in to Steam.
3. The account that you are logged in to owns Dead by Daylight.
4. Dead by Daylight is installed and updated to the latest version.

Once the above requirements are met, run the following command from the project's root directory:
```
npm start
```

### Epic Games

Epic Games authentication requires the Epic Games Developer Authentication Tool and ownership of Dead by Daylight.

#### 1. Download and Launch the Developer Authentication Tool
1. Download the [Epic Online Services SDK for PC (C or C#)](https://onlineservices.epicgames.com/en-US/sdk).
2. Extract the downloaded archive to a directory of your choice.
3. Navigate to the extracted folder: `SDK/Tools/`
4. Extract the `EOS_DevAuthTool` for your platform.
   - Use the win32 version for Windows.
5. Open the extracted `EOS_DevAuthTool` folder and launch the application.
6. When prompted, enter a port to serve developer authorization and click **Start**.
   - The default port is `8080`.
7. Log in to your Epic Games account within the tool.
8. After logging in, enter a name for your credential and click **Add**.

Keep the Developer Authentication Tool running while using DBD User Client.

#### 2. Configure DBD User Client
After setting up the Developer Authentication Tool, update your `config.json`:
```json
"account": {
  "devAuthToolCredentialsName": "YOUR_CREDENTIAL_NAME_HERE",
  "exchangeCodeHost": "127.0.0.1",
  "exchangeCodePort": "8080"
}
```
   - `devAuthToolCredentialsName` must match the credential name you entered in the Developer Authentication Tool.
   - `exchangeCodePort` must match the port the Developer Authentication Tool is listening on.

Ensure that Dead by Daylight is installed and updated to the latest version.

Once configured, run the following command from the project's root directory:
```
npm start
```

## Client Data Version Configuration

DBD User Client automatically computes runtime header values to match the client data version expected by the API and includes them in all outgoing requests.

The runtime headers that control client data versioning are:
- `clientVersion`
- `contentVersionPayload`

If these values do not match the version expected by the API, the requests will be rejected.

### Manually Overriding Runtime Header Values

In some cases, you may need to manually override these values when the API expects a newer client data version than what is currently available in your local game installation.

When performing a manual override, obtain the correct runtime header values from the content version API endpoint for your platform:
- [Steam](https://steam.live.bhvrdbd.com/api/v1/utils/contentVersion/version)
- [Epic Games](https://egs.live.bhvrdbd.com/api/v1/utils/contentVersion/version)

1. Open the relevant provider file:
   - `src/core/providers/fetchClientVersion.js`
   - `src/core/providers/fetchContentVersion.js`
2. Locate where `clientVersion` or `contentVersionPayload` is initially assigned a value.
3. Replace the computed value with a static version string that corresponds to the highest client data version available in your local game installation. Ensure that you save the file after making changes.

Examples:
```javascript
// Before
const clientVersion = latestVersion.versionPattern;

// After
const clientVersion = '9.4.1';
```

```javascript
// Before
const contentVersionPayload = JSON.stringify({
    contentVersionId: latestVersion.key
});

// After
const contentVersionPayload = JSON.stringify({
    contentVersionId: '9.4.1_3084999live'
});
```

4. Restart the application.

## Important Notes

### Live Branch Only
DBD User Client is designed for use with the live branch of Dead by Daylight. It does not support the Player Test Build (PTB) or any other branches.

### Internet Connection Required
The client requires an active internet connection to communicate with Dead by Daylight's live API endpoints.

### Steam Location Endpoint Limitation
The `Get Location` endpoint is not supported when authenticating via Steam.

### Authentication Token Handling
For security reasons, authentication tokens are invalidated when the application closes:
- **Steam:** The client explicitly revokes the token upon exit.
- **Epic Games:** Tokens are not explicitly revoked but will expire automatically according to Epic's token lifecycle.

After closing the application, you must re-authenticate before issuing additional requests.

### User-Agent Requirements
DBD User Client derives its `User-Agent` value from your local game installation by reading the `DeadByDaylightVersionNumber.txt` file.

Default installation paths (Windows):
- **Steam:** `C:\Program Files (x86)\Steam\steamapps\common\Dead by Daylight\DeadByDaylight\Content\Version\DeadByDaylightVersionNumber.txt`
- **Epic Games:** `C:\Program Files\Epic Games\DeadByDaylight\DeadByDaylight\Content\Version\DeadByDaylightVersionNumber.txt`

If the file cannot be found at the default location, you must provide its file path manually. The client cannot construct a valid `User-Agent` without it.

## License

DBD User Client is licensed under the [MIT License](https://github.com/EigenvoidDev/dbd-user-client/blob/main/LICENSE).
