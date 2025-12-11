
import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { SpeakerWaveIcon, ArrowPathIcon, ShareIcon, DownloadIcon } from './Icons';
import { decode, decodeAudioData } from '../utils/audioUtils';

const SummaryScreen = ({ transcript, onRestart, language, recordingUrl }) => {
  const [summary, setSummary] = useState('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const audioContextRef = React.useRef(null);
  const audioSourceRef = React.useRef(null);

  const thankYouMessages = {
    'English': 'Thank you for calling Prani Mitra',
    'Hindi': 'प्राणी मित्र को कॉल करने के लिए धन्यवाद',
    'Telugu': 'ప్రాణి మిత్రకు కాల్ చేసినందుకు ధన్యవాదాలు',
  };

  // Clean up the object URL to avoid memory leaks
  useEffect(() => {
    return () => {
      if (recordingUrl) {
        URL.revokeObjectURL(recordingUrl);
      }
    };
  }, [recordingUrl]);

  const generateSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    if (transcript.length === 0) {
      setSummary("No conversation was recorded.");
      setIsLoadingSummary(false);
      return;
    }

    const conversationText = transcript.map(t => `${t.speaker === 'user' ? 'Farmer' : 'Assistant'}: ${t.text}`).join('\n');
    const prompt = `Based on the following conversation with a farmer, please provide a concise summary of the key points and advice given. The summary must be written in ${language}. Format it as a simple, easy-to-read text message that could be sent via SMS.\n\nConversation:\n${conversationText}\n\nSummary:`;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
  }, [transcript, language]);

  useEffect(() => {
    generateSummary();
  }, [generateSummary]);

  const handleReadAloud = async () => {
    if (isSpeaking || !summary) return;

    setIsSpeaking(true);

    const introMessages = {
        'English': 'Here is the summary of your call:',
        'Hindi': 'आपके कॉल का सारांश यहाँ है:',
        'Telugu': 'మీ కాల్ సారాంశం ఇక్కడ ఉంది:',
    };

    const thankYou = thankYouMessages[language] || thankYouMessages['English'];
    const intro = introMessages[language] || introMessages['English'];
    
    const ttsPrompt = `${thankYou}. ${intro} ${summary}`;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: ttsPrompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
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

  const handleShareSms = () => {
    if (!summary) return;
    const encodedSummary = encodeURIComponent(summary);
    // Use the sms: URI scheme to open the default messaging app.
    const smsLink = `sms:?body=${encodedSummary}`;
    window.location.href = smsLink;
  };

  return (
    <div className="flex flex-col items-center text-center h-full p-4">
      <h2 className="text-2xl font-bold text-green-800 mb-2">Call Summary</h2>
      <p className="text-green-600 font-medium mb-4">{thankYouMessages[language] || thankYouMessages['English']}</p>
      
      {recordingUrl && (
        <div className="w-full max-w-md mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-gray-700 font-semibold mb-2 text-sm text-left">Call Recording</p>
            <div className="flex items-center space-x-2">
                <audio controls src={recordingUrl} className="w-full"></audio>
                <a
                    href={recordingUrl}
                    download="prani-mitra-recording.webm"
                    title="Download Recording"
                    className="flex-shrink-0 bg-gray-600 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
                >
                    <DownloadIcon className="w-5 h-5" />
                </a>
            </div>
        </div>
      )}

      <p className="text-gray-600 mb-4">Here's a summary of your conversation, like an SMS.</p>
      
      <div className="w-full max-w-md p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left mb-6 min-h-[100px]">
        {isLoadingSummary ? (
          <div className="flex items-center justify-center h-full">
             <ArrowPathIcon className="w-6 h-6 animate-spin text-gray-500" />
          </div>
        ) : (
          <p className="text-gray-800 whitespace-pre-wrap text-sm">{summary}</p>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        <button
          onClick={handleReadAloud}
          disabled={isSpeaking || isLoadingSummary || !summary}
          className="bg-blue-500 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:bg-blue-600 transition-colors flex items-center disabled:bg-blue-300"
        >
          <SpeakerWaveIcon className="w-5 h-5 mr-2" />
          {isSpeaking ? 'Speaking...' : 'Read Aloud'}
        </button>
        <button
          onClick={handleShareSms}
          disabled={isLoadingSummary || !summary}
          className="bg-green-500 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:bg-green-600 transition-colors flex items-center disabled:bg-green-300"
        >
          <ShareIcon className="w-5 h-5 mr-2" />
          Share SMS
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
