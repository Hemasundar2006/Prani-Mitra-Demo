
// This file contains functions for encoding and decoding raw audio data,
// as required for the Gemini Live API.

/**
 * Encodes a Uint8Array of raw bytes into a Base64 string.
 * @param bytes The Uint8Array to encode.
 * @returns A Base64 encoded string.
 */
export function encode(bytes) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Decodes a Base64 string into a Uint8Array of raw bytes.
 * @param base64 The Base64 string to decode.
 * @returns A Uint8Array of the decoded bytes.
 */
export function decode(base64) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

/**
 * Decodes raw PCM audio data into an AudioBuffer that can be played by the Web Audio API.
 * The Gemini Live API returns raw audio streams, not standard audio files, so this
 * manual decoding is necessary.
 * @param data The raw audio data as a Uint8Array.
 * @param ctx The AudioContext to use for creating the buffer.
 * @param sampleRate The sample rate of the audio (e.g., 24000 for Gemini output).
 * @param numChannels The number of audio channels (typically 1 for mono).
 * @returns A Promise that resolves to an AudioBuffer.
 */
export async function decodeAudioData(
    data,
    ctx,
    sampleRate,
    numChannels,
) {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            // Convert 16-bit PCM to float range [-1.0, 1.0]
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}
