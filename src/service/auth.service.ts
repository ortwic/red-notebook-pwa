import { writable } from 'svelte/store';
import { googleLogout, GoogleOAuthProvider } from 'google-oauth-gsi';
import type { SuccessTokenResponse, ErrorTokenResponse } from 'google-oauth-gsi';

// Discovery doc URL for APIs
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES = 'https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/drive.file';

export type AuthResult = Awaited<ReturnType<typeof createAuth>>;
export const token = writable<SuccessTokenResponse | null>();
export const error = writable<ErrorTokenResponse>();

export async function createAuth(initToken: SuccessTokenResponse) {    
    const { VITE_API_KEY, VITE_CLIENT_ID } = import.meta.env.SSR ? process.env : import.meta.env;
    if (!VITE_API_KEY || !VITE_CLIENT_ID) {
        throw Error('dotenv variables are not defined!');
    }

    token.set(initToken);
    await gapi.client.init({
        apiKey: VITE_API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
    });

    const provider = new GoogleOAuthProvider({
        clientId: VITE_CLIENT_ID,
        onScriptLoadError: () => console.log('onScriptLoadError'),
        onScriptLoadSuccess: () => console.log('onScriptLoadSuccess'),
    });
    
    const authorize = provider.useGoogleLogin({
        scope: SCOPES,
        prompt: 'consent',
        onSuccess: (res: SuccessTokenResponse) => token.set(res),
        onError: (err: ErrorTokenResponse) => error.set(err),
    });

    return {
        signIn: authorize,
        signOut: () => {
            token.set(null);
            googleLogout();
        },
        config: {
            apiKey: VITE_API_KEY,
            discoveryDocs: [DISCOVERY_DOC],
        }
    }
}
