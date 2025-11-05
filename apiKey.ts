// The API key is now hardcoded for convenience during development.
// In a production environment, this should be handled securely (e.g., via environment variables).
const API_KEY = 'API_KEY';

/**
 * Returns the configured Google AI API Key.
 * @returns The API key string.
 */
export function getApiKey(): string {
  if (!API_KEY) {
    // This will help diagnose if the key was accidentally removed.
    throw new Error("API Key is not configured in apiKey.ts");
  }
  return API_KEY;
}
