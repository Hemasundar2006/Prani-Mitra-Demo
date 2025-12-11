
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { MicIcon, PhoneHangupIcon } from './Icons';
import { encode, decode, decodeAudioData } from '../utils/audioUtils';
import { knowledgeBase } from '../utils/knowledgeBase';
import { logQuestion } from '../utils/questionLogger';

const IVRScreen = ({ onCallEnd, language, service, onStartupError }) => {
  const [status, setStatus] = useState('connecting');
  const [transcript, setTranscript] = useState([]);
  const [currentTranscription, setCurrentTranscription] = useState({ user: '', ai: '' });
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  const sessionPromiseRef = useRef(null);
  const inputAudioContextRef = useRef(null);
  const outputAudioContextRef = useRef(null);
  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef(new Set());
  const scriptProcessorRef = useRef(null);
  const mediaStreamSourceRef = useRef(null);
  const recordingSourceNodeRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const mergedStreamDestRef = useRef(null);
  const retryCountRef = useRef(0);
  const mountedRef = useRef(true);

  const stopAudioProcessing = useCallback(() => {
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
        mediaStreamSourceRef.current = null;
    }
    if (recordingSourceNodeRef.current) {
        recordingSourceNodeRef.current.disconnect();
        recordingSourceNodeRef.current = null;
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

      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const audioUrl = URL.createObjectURL(audioBlob);
            onCallEnd(transcript, audioUrl);
        };
        mediaRecorderRef.current.stop();
      } else {
        onCallEnd(transcript, null);
      }
      stopAudioProcessing();
    }
  }, [status, transcript, onCallEnd, stopAudioProcessing]);


  const startCall = useCallback(async (isRetry = false) => {
    if (!mountedRef.current) return;
    setStatus('connecting');
    setPermissionDenied(false);

    if (!isRetry) {
        setTranscript([]);
        setCurrentTranscription({ user: '', ai: '' });
    }
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Check if mounted after async operation
        if (!mountedRef.current) return;

        inputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
        mergedStreamDestRef.current = outputAudioContextRef.current.createMediaStreamDestination();
        nextStartTimeRef.current = 0;
        
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const knowledgeText = knowledgeBase.map(qa => `Q: ${qa.question}\nA: ${qa.answer}`).join('\n\n');
        
        let serviceInstruction = "";
        switch (service) {
            case 'Farming':
                serviceInstruction = "The user has explicitly selected 'Farming' services. You must STRICTLY LIMIT your responses to questions about crops, soil, plants, irrigation, fertilizers, weather impact on crops, and pest management for crops. You must answer these questions based primarily on the provided Knowledge Base. DO NOT answer questions about animals, livestock, or veterinary advice. If the user asks about animals, politely inform them in the selected language that you can only answer farming-related questions in this mode.";
                break;
            case 'Animal Health':
                serviceInstruction = "The user has explicitly selected 'Animal Health' services. You must STRICTLY LIMIT your responses to questions about livestock, cattle, poultry, sheep, goats, pigs, animal diseases, animal nutrition, and veterinary advice. You must answer these questions based primarily on the provided Knowledge Base. DO NOT answer questions about growing crops, soil, or plant farming. If the user asks about crops, politely inform them in the selected language that you can only answer animal health questions in this mode.";
                break;
            case 'Government Schemes':
                serviceInstruction = "The user has selected 'Government Schemes'. Focus primarily on explaining government schemes available for farmers. You may use external general knowledge for major Indian schemes if not found in the knowledge base. Do not answer detailed technical farming or veterinary questions unless they relate to a scheme.";
                break;
            default:
                serviceInstruction = "The user has selected 'General Queries'. You may answer questions regarding both Farming and Animal Health based on the provided Knowledge Base.";
                break;
        }

        const closingMessages = {
            'English': "Thank you for calling Prani Mitra",
            'Hindi': "प्राणी मित्र को कॉल करने के लिए धन्यवाद",
            'Telugu': "ప్రాణి మిత్రకు కాల్ చేసినందుకు ధన్యవాదాలు"
        };
        const closingMessage = closingMessages[language] || closingMessages['English'];

        const systemInstruction = `You are Prani Mitra, a friendly and helpful AI assistant for Indian farmers. You must respond ONLY in ${language}.
        
        ${serviceInstruction}
        
        Use the following Knowledge Base to answer questions. If a question is within the selected service domain but the answer is not in the Knowledge Base, you may provide general helpful advice based on standard agricultural practices in India, but prioritize the Knowledge Base.

        When the conversation ends or the user says goodbye, you MUST say EXACTLY: "${closingMessage}". Do not add the service name or any other text to this closing phrase.
        
        ---START OF KNOWLEDGE BASE---
        ${knowledgeText}
        ---END OF KNOWLEDGE BASE---`;

        const newSessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                systemInstruction: systemInstruction,
                inputAudioTranscription: {},
                outputAudioTranscription: {},
            },
            callbacks: {
                onopen: () => {
                    if (!mountedRef.current) return;
                    setStatus('active');
                    retryCountRef.current = 0; // Reset retry count on success
                    
                    // Create two separate source nodes from the same stream for each audio context.
                    const inputSourceNode = inputAudioContextRef.current.createMediaStreamSource(stream);
                    const recordingSourceNode = outputAudioContextRef.current.createMediaStreamSource(stream);
                    
                    mediaStreamSourceRef.current = inputSourceNode;
                    recordingSourceNodeRef.current = recordingSourceNode;

                    // Route user's mic (from the output context) to the merged stream for recording.
                    recordingSourceNode.connect(mergedStreamDestRef.current);

                    const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
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
                    inputSourceNode.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContextRef.current.destination);
                    
                    // Start recording from the destination stream
                    mediaRecorderRef.current = new MediaRecorder(mergedStreamDestRef.current.stream);
                    audioChunksRef.current = [];
                    mediaRecorderRef.current.ondataavailable = (event) => {
                        if (event.data.size > 0) {
                            audioChunksRef.current.push(event.data);
                        }
                    };
                    mediaRecorderRef.current.start();
                },
                onmessage: async (message) => {
                    if (!mountedRef.current) return;
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
                            const newHistory = [...prev];
                            const fullInput = currentTranscription.user + tempUser;
                            const fullOutput = currentTranscription.ai + tempAi;
                            if (fullInput.trim()) {
                                newHistory.push({ speaker: 'user', text: fullInput.trim() });
                                // Log the user's spoken question to the file (localStorage)
                                logQuestion(fullInput.trim());
                            }
                            if (fullOutput.trim()) newHistory.push({ speaker: 'ai', text: fullOutput.trim() });
                            return newHistory;
                        });
                        setCurrentTranscription({ user: '', ai: '' });
                    }

                    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (base64Audio) {
                        const audioContext = outputAudioContextRef.current;
                        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContext.currentTime);
                        const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
                        const sourceNode = audioContext.createBufferSource();
                        sourceNode.buffer = audioBuffer;
                        
                        // Connect to speakers for playback
                        sourceNode.connect(audioContext.destination);

                        // Also connect to the recording stream
                        if (mergedStreamDestRef.current) {
                           sourceNode.connect(mergedStreamDestRef.current);
                        }

                        sourceNode.addEventListener('ended', () => {
                            audioSourcesRef.current.delete(sourceNode);
                        });
                        sourceNode.start(nextStartTimeRef.current);
                        nextStartTimeRef.current += audioBuffer.duration;
                        audioSourcesRef.current.add(sourceNode);
                    }
                },
                onerror: (e) => {
                    console.error('Session error:', e);
                    
                    // Attempt retry if we encounter a network error during connection phase
                    if (mountedRef.current && status === 'connecting' && retryCountRef.current < 1) {
                         console.log("Retrying connection...");
                         retryCountRef.current += 1;
                         stopAudioProcessing();
                         setTimeout(() => {
                             startCall(true);
                         }, 1000);
                         return;
                    }

                    setStatus('idle');
                    stopAudioProcessing();
                },
                onclose: (e) => {
                   console.log("Session closed.");
                },
            },
        });
        sessionPromiseRef.current = newSessionPromise;

    } catch (error) {
        console.error('Failed to start call:', error);
        setStatus('idle');
        
        if (error instanceof Error && (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError')) {
             setPermissionDenied(true);
             return;
        }

        // Only alert if we haven't already retried to avoid spamming alerts
        if (retryCountRef.current >= 1) {
                alert(`An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`);
        } else {
                // Silent retry for initial failure
                retryCountRef.current += 1;
                setTimeout(() => startCall(true), 1000);
                return;
        }
        
        onStartupError();
    }
  }, [stopAudioProcessing, language, service, onStartupError, status]);

  useEffect(() => {
    mountedRef.current = true;
    startCall();
    return () => {
        mountedRef.current = false;
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

  if (permissionDenied) {
    return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="bg-red-100 p-6 rounded-full mb-6">
                <MicIcon className="w-10 h-10 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">Microphone Access Required</h3>
            <p className="text-gray-600 mb-8 max-w-sm mx-auto">
                Prani Mitra needs access to your microphone to hear your questions. 
                Please allow microphone access in your browser settings and try again.
            </p>
            <div className="flex gap-4">
                 <button 
                    onClick={onStartupError}
                    className="px-6 py-3 rounded-full font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors"
                >
                    Cancel
                </button>
                <button 
                    onClick={() => startCall(true)}
                    className="px-6 py-3 rounded-full font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors shadow-lg"
                >
                    Retry Access
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h3 className="font-bold text-lg text-gray-800">Live Conversation: {service}</h3>
            <CallStatusIndicator />
        </div>
        <div className="flex-grow overflow-y-auto p-4 space-y-4">
            {transcript.map((entry, index) => (
                <div key={index} className={`flex ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`rounded-xl p-3 max-w-xs md:max-w-md shadow-sm ${entry.speaker === 'user' ? 'bg-green-100 text-green-900' : 'bg-white text-gray-800 border border-gray-200'}`}>
                        <p className="text-sm">{entry.text}</p>
                    </div>
                </div>
            ))}
            {currentTranscription.user && (
                 <div className="flex justify-end">
                    <div className="rounded-xl p-3 max-w-xs md:max-w-md bg-green-50 text-green-900 opacity-60 border border-green-100">
                        <p className="text-sm">{currentTranscription.user}</p>
                    </div>
                </div>
            )}
             {currentTranscription.ai && (
                 <div className="flex justify-start">
                    <div className="rounded-xl p-3 max-w-xs md:max-w-md bg-white text-gray-800 opacity-60 border border-gray-200">
                        <p className="text-sm">{currentTranscription.ai}</p>
                    </div>
                </div>
            )}
        </div>
        <div className="p-6 border-t border-gray-200 text-center bg-white">
            {status === 'active' && (
                <div className="flex flex-col items-center mb-4">
                    <div className="relative w-20 h-20 flex items-center justify-center">
                        <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20"></div>
                        <div className="relative bg-green-600 rounded-full p-5 shadow-lg"><MicIcon className="w-10 h-10 text-white"/></div>
                    </div>
                    <p className="mt-3 text-sm text-gray-500 font-medium">Listening...</p>
                </div>
            )}
             <button
                onClick={endCall}
                disabled={status === 'ending' || status === 'idle'}
                className="bg-red-600 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-red-700 disabled:bg-red-300 transition-colors flex items-center justify-center mx-auto"
            >
                <PhoneHangupIcon className="w-5 h-5 mr-2" />
                End Call
            </button>
        </div>
    </div>
  );
};

export default IVRScreen;
