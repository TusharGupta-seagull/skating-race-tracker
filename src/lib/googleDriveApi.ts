/**
 * Google Identity Services & Google Drive REST API integration
 */

export interface GoogleUserProfile {
  sub: string;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email: string;
  email_verified?: boolean;
}

export interface GoogleDriveFileInfo {
  id: string;
  name: string;
  size?: string;
  modifiedTime?: string;
}

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  error?: string;
  error_description?: string;
  error_uri?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
            error_callback?: (err: any) => void;
          }) => {
            requestAccessToken: (config?: { prompt?: string }) => void;
          };
          revoke?: (token: string, done?: () => void) => void;
        };
      };
    };
  }
}

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

export const BACKUP_FILE_NAME = 'skating_race_tracker_backup.json';

/**
 * Dynamically loads the Google Identity Services client script if not already present.
 */
export function loadGoogleGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }

    const existing = document.querySelector(`script[src="${GIS_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services script.')));
      return;
    }

    const script = document.createElement('script');
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services script. Check internet connectivity.'));
    document.head.appendChild(script);
  });
}

/**
 * Requests an OAuth 2.0 access token using Google Identity Services token client.
 */
export async function requestGoogleAccessToken(clientId: string): Promise<string> {
  if (!clientId || !clientId.trim()) {
    throw new Error('A Google Cloud OAuth Client ID is required. Please provide a valid Client ID.');
  }

  await loadGoogleGsiScript();

  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services SDK is not available.');
  }

  return new Promise((resolve, reject) => {
    try {
      const tokenClient = window.google!.accounts.oauth2.initTokenClient({
        client_id: clientId.trim(),
        scope: DRIVE_SCOPES,
        callback: (resp: GoogleTokenResponse) => {
          if (resp.error) {
            reject(new Error(resp.error_description || resp.error || 'Google authorization rejected'));
            return;
          }
          if (!resp.access_token) {
            reject(new Error('No access token returned by Google authorization.'));
            return;
          }
          resolve(resp.access_token);
        },
        error_callback: (err: any) => {
          reject(new Error(err?.message || 'Google authorization window closed or cancelled.'));
        },
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Fetches user profile using the Google OAuth2 access token.
 */
export async function fetchGoogleUserProfile(accessToken: string): Promise<GoogleUserProfile> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Google profile: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/**
 * Searches for existing backup file in Google Drive.
 */
export async function findDriveBackupFile(accessToken: string): Promise<GoogleDriveFileInfo | null> {
  const query = encodeURIComponent(`name = '${BACKUP_FILE_NAME}' and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,size,modifiedTime)&spaces=drive`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Drive search failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0];
  }
  return null;
}

/**
 * Saves (creates or updates) the race backup JSON file in Google Drive.
 */
export async function saveBackupToGoogleDrive(
  accessToken: string,
  backupPayload: string
): Promise<{ fileId: string; isNew: boolean; sizeBytes: number }> {
  const existingFile = await findDriveBackupFile(accessToken);

  if (existingFile) {
    // Update existing file content
    const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`;
    const res = await fetch(uploadUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: backupPayload,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google Drive file update failed (${res.status}): ${err}`);
    }

    const updated = await res.json();
    return {
      fileId: updated.id || existingFile.id,
      isNew: false,
      sizeBytes: new Blob([backupPayload]).size,
    };
  }

  // Create new file via multipart upload
  const boundary = '-------skating_tracker_314159';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const metadata = {
    name: BACKUP_FILE_NAME,
    mimeType: 'application/json',
    description: 'Speed Skating Race Tracker cloud backup and sync file',
  };

  const multipartBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    backupPayload +
    closeDelim;

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Drive file creation failed (${res.status}): ${err}`);
  }

  const created = await res.json();
  return {
    fileId: created.id,
    isNew: true,
    sizeBytes: new Blob([backupPayload]).size,
  };
}

/**
 * Downloads the backup payload from Google Drive.
 */
export async function downloadBackupFromGoogleDrive(accessToken: string): Promise<string | null> {
  const existingFile = await findDriveBackupFile(accessToken);
  if (!existingFile) return null;

  const url = `https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to download backup from Google Drive (${res.status})`);
  }

  return res.text();
}
