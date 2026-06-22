import Auth0 from "react-native-auth0";
import { AUTH_CONFIG } from "./config";

/**
 * Single shared Auth0 client.
 *
 * Its native credentials manager is the ONE source of truth for tokens: it owns
 * the refresh token and handles rotation internally. Do not persist tokens
 * anywhere else (e.g. SecureStore) — a second copy rotates independently and,
 * with refresh-token rotation enabled, Auth0's breach detection will revoke the
 * whole session and force users to log in again.
 */
export const auth0 = new Auth0(AUTH_CONFIG);
