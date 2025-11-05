import React, { useState, useEffect, useRef, useCallback } from 'react';
// fix: Remove `LiveSession` from import as it is not an exported member.
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import type { TranscriptEntry } from './IVRFlow';
// fix: Removed unused StopCircleIcon import.
import { MicIcon, PhoneHangupIcon } from './Icons';
import { encode, decode, decodeAudioData } from '../utils/audioUtils';
import { getApiKey } from '../apiKey';

type CallStatus = 'idle' | 'connecting' | 'active' | 'ending';

// fix: Define a minimal `LiveSession` interface locally for type safety, as it's not exported from the SDK.
interface LiveSession {
  sendRealtimeInput(input: { media: { data: string; mimeType: string; } }): void;
  close(): void;
}

const IVRScreen: React.FC<{ onCallEnd: (transcript: TranscriptEntry[]) => void, language: string }> = ({ onCallEnd, language }) => {
  const [status, setStatus] = useState<CallStatus>('connecting');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentTranscription, setCurrentTranscription] = useState({ user: '', ai: '' });
  
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const stopAudioProcessing = useCallback(() => {
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
        mediaStreamSourceRef.current = null;
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      inputAudioContextRef.current.close().catch(console.error);
    }
    audioSourcesRef.current.forEach(source => source.stop());
    audioSourcesRef.current.clear();
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
        outputAudioContextRef.current.close().catch(console.error);
    }
  }, []);

  const endCall = useCallback(() => {
    if (status === 'active' || status === 'connecting') {
      setStatus('ending');
      sessionPromiseRef.current?.then(session => {
        session.close();
      }).catch(e => console.error("Error closing session:", e));
      stopAudioProcessing();
      onCallEnd(transcript);
    }
  }, [status, transcript, onCallEnd, stopAudioProcessing]);


  const startCall = useCallback(async () => {
    setStatus('connecting');
    setTranscript([]);
    setCurrentTranscription({ user: '', ai: '' });
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // fix: Add `(window as any)` to handle vendor-prefixed `webkitAudioContext` for Safari compatibility.
        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        // fix: Add `(window as any)` to handle vendor-prefixed `webkitAudioContext` for Safari compatibility.
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        nextStartTimeRef.current = 0;
        
        const ai = new GoogleGenAI({ apiKey: getApiKey() });
        
        sessionPromiseRef.current = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                systemInstruction: `You are Prani Mitra, a friendly and helpful AI assistant for Indian farmers. Speak in a clear, simple, and supportive tone. You must respond ONLY in ${language}. Keep your answers concise and actionable. Your expertise is strictly limited to farming and animal healthcare. If a user asks a question outside of these topics, you must politely decline to answer and remind them that you are a farming assistant. Your goal is to provide practical advice on farming practices, crop diseases, animal health, weather, and government schemes relevant to agriculture.`,
                inputAudioTranscription: {},
                outputAudioTranscription: {},
            },
            callbacks: {
                onopen: () => {
                    setStatus('active');
                    const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                    mediaStreamSourceRef.current = source;
                    const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                    scriptProcessorRef.current = scriptProcessor;
                    
                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const l = inputData.length;
                        const int16 = new Int16Array(l);
                        for (let i = 0; i < l; i++) {
                            int16[i] = inputData[i] * 32768;
                        }
                        const pcmBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };

                        sessionPromiseRef.current?.then((session) => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContextRef.current!.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    let tempUser = '';
                    let tempAi = '';

                    if (message.serverContent?.inputTranscription) {
                        tempUser = message.serverContent.inputTranscription.text;
                        setCurrentTranscription(prev => ({ ...prev, user: prev.user + tempUser }));
                    }

                    if (message.serverContent?.outputTranscription) {
                        tempAi = message.serverContent.outputTranscription.text;
                        setCurrentTranscription(prev => ({ ...prev, ai: prev.ai + tempAi }));
                    }

                    if (message.serverContent?.turnComplete) {
                        setTranscript(prev => {
                            const newHistory: TranscriptEntry[] = [...prev];
                            const fullInput = currentTranscription.user + tempUser;
                            const fullOutput = currentTranscription.ai + tempAi;
                            if (fullInput.trim()) newHistory.push({ speaker: 'user', text: fullInput.trim() });
                            if (fullOutput.trim()) newHistory.push({ speaker: 'ai', text: fullOutput.trim() });
                            return newHistory;
                        });
                        setCurrentTranscription({ user: '', ai: '' });
                    }

                    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                    if (base64Audio) {
                        const audioContext = outputAudioContextRef.current!;
                        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContext.currentTime);
                        const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
                        const source = audioContext.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(audioContext.destination);
                        source.addEventListener('ended', () => {
                            audioSourcesRef.current.delete(source);
                        });
                        source.start(nextStartTimeRef.current);
                        nextStartTimeRef.current += audioBuffer.duration;
                        audioSourcesRef.current.add(source);
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error('Session error:', e);
                    setStatus('idle');
                    stopAudioProcessing();
                },
                onclose: (e: CloseEvent) => {
                   // This is called when the session is closed, either by client or server.
                   // The endCall function handles the state transition.
                   console.log("Session closed.");
                },
            },
        });
    } catch (error) {
        console.error('Failed to start call:', error);
        setStatus('idle');
        alert('Could not access microphone. Please allow microphone permissions and try again.');
    }
  }, [stopAudioProcessing, language]);

  useEffect(() => {
    startCall();
    return () => {
        sessionPromiseRef.current?.then(session => session.close()).catch(console.error);
        stopAudioProcessing();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const CallStatusIndicator = () => {
    switch (status) {
        case 'connecting':
            return <div className="text-sm text-yellow-600 animate-pulse">Connecting...</div>;
        case 'active':
            return <div className="text-sm text-green-600 flex items-center"><span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>Live</div>;
        case 'ending':
            return <div className="text-sm text-gray-500">Call Ended</div>;
        default:
            return <div className="text-sm text-red-500">Error</div>;
    }
  };

  return (
    <div className="flex flex-col h-full">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-bold text-lg">Live Conversation</h3>
            <CallStatusIndicator />
        </div>
        <div className="flex-grow overflow-y-auto p-4 space-y-4">
            {transcript.map((entry, index) => (
                <div key={index} className={`flex ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`rounded-xl p-3 max-w-xs md:max-w-md ${entry.speaker === 'user' ? 'bg-green-100 text-green-900' : 'bg-gray-100 text-gray-800'}`}>
                        <p className="text-sm">{entry.text}</p>
                    </div>
                </div>
            ))}
            {currentTranscription.user && (
                 <div className="flex justify-end">
                    <div className="rounded-xl p-3 max-w-xs md:max-w-md bg-green-100 text-green-900 opacity-60">
                        <p className="text-sm">{currentTranscription.user}</p>
                    </div>
                </div>
            )}
             {currentTranscription.ai && (
                 <div className="flex justify-start">
                    <div className="rounded-xl p-3 max-w-xs md:max-w-md bg-gray-100 text-gray-800 opacity-60">
                        <p className="text-sm">{currentTranscription.ai}</p>
                    </div>
                </div>
            )}
        </div>
        <div className="p-4 border-t border-gray-200 text-center">
            {status === 'active' && (
                <div className="flex flex-col items-center">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                        <div className="absolute inset-0 bg-green-500 rounded-full animate-ping"></div>
                        <div className="relative bg-green-600 rounded-full p-4"><MicIcon className="w-8 h-8 text-white"/></div>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">Listening...</p>
                </div>
            )}
             <button
                onClick={endCall}
                disabled={status === 'ending' || status === 'idle'}
                className="bg-red-600 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:bg-red-700 disabled:bg-red-300 transition-colors flex items-center justify-center mx-auto"
            >
                <PhoneHangupIcon className="w-5 h-5 mr-2" />
                End Call
            </button>
        </div>
    </div>
  );
};

export default IVRScreen;