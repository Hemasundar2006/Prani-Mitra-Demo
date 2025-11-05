
let apiKey: string | undefined = undefined;

export function getApiKey(): string {
  if (!apiKey) {
    apiKey = window.prompt("Please enter your Google AI API Key:");
    if (!apiKey) {
        alert("API Key is required to run this application. Please reload and enter your key.");
        throw new Error("API Key not provided.");
    }
  }
  return apiKey;
}
