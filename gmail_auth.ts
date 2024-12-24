import { promises as fs } from 'fs';
import path from 'path';
import process from 'process';
import { authenticate } from '@google-cloud/local-auth';
import { google } from 'googleapis';
import { OAuth2Client, Credentials } from 'google-auth-library';
import { gmail_v1 } from 'googleapis';

// If modifying these scopes, delete token.json.
const SCOPES: string[] = ['https://www.googleapis.com/auth/gmail.modify'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first time.
const TOKEN_PATH: string = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH: string = path.join(process.cwd(), 'credentials.json');

interface CredentialsConfig {
  installed?: {
    client_id: string;
    client_secret: string;
  };
  web?: {
    client_id: string;
    client_secret: string;
  };
}

interface SavedCredentials {
  type: string;
  client_id: string;
  client_secret: string;
  refresh_token: string;
}

/**
 * Reads previously authorized credentials from the save file.
 *
 * @returns Promise resolving to OAuth2Client or null if credentials don't exist
 */
async function loadSavedCredentialsIfExist(): Promise<OAuth2Client | null> {
  try {
    const content = await fs.readFile(TOKEN_PATH, 'utf-8');
    const credentials: Credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials) as OAuth2Client;
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
 *
 * @param client - The authenticated OAuth2 client
 */
async function saveCredentials(client: OAuth2Client): Promise<void> {
  const content = await fs.readFile(CREDENTIALS_PATH, 'utf-8');
  const keys: CredentialsConfig = JSON.parse(content);
  const key = keys.installed || keys.web;
  
  if (!key) {
    throw new Error('No valid client configuration found');
  }

  const payload: SavedCredentials = {
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token || '',
  };
  
  await fs.writeFile(TOKEN_PATH, JSON.stringify(payload));
}

/**
 * Load or request authorization to call APIs.
 *
 * @returns Promise resolving to authenticated OAuth2 client
 */
async function authorize(): Promise<OAuth2Client> {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });

  if (!client) {
    throw new Error('Authentication failed');
  }

  if (client.credentials) {
    await saveCredentials(client);
  }
  
  return client;
}


// Export functions if you want to use them as a module
export {
  authorize,
  loadSavedCredentialsIfExist,
  saveCredentials,
};