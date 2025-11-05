
import React, { useState, useEffect, useCallback } from 'react';
import type { TranscriptEntry } from './IVRFlow';
import { GoogleGenAI, Modality } from '@google/genai';
import { SpeakerWaveIcon, ArrowPathIcon } from './Icons';
import { decode, decodeAudioData } from '../utils/audioUtils';

const SummaryScreen: React.FC<{ transcript: TranscriptEntry[], onRestart: () => void }> = ({ transcript, onRestart }) => {
  const [summary, setSummary] = useState('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const audioSourceRef = React.useRef<AudioBufferSourceNode | null>(null);

  const generateSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    if (transcript.length === 0) {
      setSummary("No conversation was recorded.");
      setIsLoadingSummary(false);
      return;
    }

    const conversationText = transcript.map(t => `${t.speaker === 'user' ? 'Farmer' : 'Assistant'}: ${t.text}`).join('\n');
    const prompt = `Based on the following conversation with a farmer, please provide a concise summary of the key points and advice given. Format it as a simple, easy-to-read text message that could be sent via SMS.\n\nConversation:\n${conversationText}\n\nSummary:`;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });
      setSummary(response.text);
    } catch (error) {
      console.error('Error generating summary:', error);
      setSummary('Could not generate a summary at this time.');
    } finally {
      setIsLoadingSummary(false);
    }
  }, [transcript]);

  useEffect(() => {
    generateSummary();
  }, [generateSummary]);

  const handleReadAloud = async () => {
    if (isSpeaking || !summary) return;

    setIsSpeaking(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Here is the summary of your call: ${summary}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          // fix: Add `(window as any)` to handle vendor-prefixed `webkitAudioContext` for Safari compatibility.
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const audioContext = audioContextRef.current;
        const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
        const source = audioContext.createBufferSource();
        audioSourceRef.current = source;
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.onended = () => setIsSpeaking(false);
        source.start();
      }
    } catch (error) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center text-center h-full">
      <h2 className="text-2xl font-bold text-green-800 mb-2">Call Summary</h2>
      <p className="text-gray-600 mb-6">Here's a summary of your conversation, like an SMS.</p>
      
      <div className="w-full max-w-md p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-left mb-6 min-h-[150px]">
        {isLoadingSummary ? (
          <div className="flex items-center justify-center h-full">
             <ArrowPathIcon className="w-6 h-6 animate-spin text-gray-500" />
          </div>
        ) : (
          <p className="text-gray-800 whitespace-pre-wrap">{summary}</p>
        )}
      </div>

      <div className="flex space-x-4">
        <button
          onClick={handleReadAloud}
          disabled={isSpeaking || isLoadingSummary || !summary}
          className="bg-blue-500 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:bg-blue-600 transition-colors flex items-center disabled:bg-blue-300"
        >
          <SpeakerWaveIcon className="w-5 h-5 mr-2" />
          {isSpeaking ? 'Speaking...' : 'Read Aloud'}
        </button>
        <button
          onClick={onRestart}
          className="bg-gray-200 text-gray-800 font-bold py-3 px-6 rounded-full shadow-lg hover:bg-gray-300 transition-colors"
        >
          New Call
        </button>
      </div>
    </div>
  );
};

export default SummaryScreen;
