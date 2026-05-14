---
title: "FSClient"
sidebar_position: 1
description: "FSClient class API: constructor config, token management, auto-auth, and guest mode."
---

# FSClient

**`FSClient`**

**In React:** You don't create `FSClient` directly. `FunctionSpaceProvider` creates and manages it. Access it via `useContext(FunctionSpaceContext).client`, or use hooks and trading widgets that access the client internally.

```typescript
class FSClient {
  constructor(config: FSConfig)

  get base(): string               // The base URL
  get isAuthenticated(): boolean    // Whether a token is set

  setToken(token: string): void     // Manually set a Bearer token
  clearToken(): void                // Remove the current token
  authenticate(): Promise<void>     // Login using the credentials from config

  setStoredUsername(username: string): void  // Store username for passwordless re-auth
  getStoredUsername(): string | null         // Retrieve stored username
  clearStoredUsername(): void                // Remove stored username

  get<T>(path: string, params?: Record<string, string>, signal?: AbortSignal): Promise<T>
  post<T>(path: string, body?: unknown, params?: Record<string, string>, signal?: AbortSignal): Promise<T>
}
```

**Constructor config `FSConfig`:**

```typescript
interface FSConfig {
  baseUrl: string;            // API base URL (e.g., "https://api.example.com")
  username?: string;          // Credentials for auto-authentication
  password?: string;          // Credentials for auto-authentication
  autoAuthenticate?: boolean; // Reserved for future use
}
```

**Authentication behavior:**

* **With credentials** (`username` + `password` provided): The client auto-authenticates on the first API call that requires a token. If a 401 is received, it clears the token, re-authenticates, and retries the request once.
* **Guest mode** (no credentials): GET requests go through with a `Username: guest` header. `previewPayoutCurve()` also works in guest mode even though it uses a POST under the hood. Authenticated write actions such as `buy()` and `sell()` still throw `"Authentication required. Please sign in to perform this action."`.
* **Manual token**: Call `setToken(token)` if you obtain a token through your own auth flow (e.g., from `loginUser`).

**Example (standalone usage):**

```typescript
import { FSClient, loginUser, queryMarketState } from '@functionspace/core';

// Option 1: Auto-auth via credentials
const client = new FSClient({
  baseUrl: 'https://api.example.com',
  username: 'trader1',
  password: 'secret',
});
// First API call triggers automatic login
const market = await queryMarketState(client, 42);

// Option 2: Manual token management
const guest = new FSClient({ baseUrl: 'https://api.example.com' });
const { token } = await loginUser(guest, 'trader1', 'secret');
guest.setToken(token);
// Now guest is authenticated for mutations
```



