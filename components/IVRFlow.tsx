
import React, { useState } from 'react';
import IVRScreen from './IVRScreen';
import SummaryScreen from './SummaryScreen';

export type TranscriptEntry = {
  speaker: 'user' | 'ai';
  text: string;
};

const LanguageSelectionScreen: React.FC<{ onSelect: (lang: string) => void }> = ({ onSelect }) => (
    <div className="text-center flex flex-col items-center justify-center h-full">
      <h2 className="text-2xl font-bold text-green-800 mb-2">Select Language</h2>
      <p className="text-gray-600 mb-6 max-w-md">Please choose your preferred language to continue.</p>
      <div className="flex flex-col sm:flex-row gap-4">
        <button onClick={() => onSelect('Telugu')} className="bg-green-600 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-green-700 transition-transform transform hover:scale-105">తెలుగు</button>
        <button onClick={() => onSelect('Hindi')} className="bg-green-600 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-green-700 transition-transform transform hover:scale-105">हिन्दी</button>
        <button onClick={() => onSelect('English')} className="bg-green-600 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-green-700 transition-transform transform hover:scale-105">English</button>
      </div>
    </div>
);

const WelcomeScreen: React.FC<{ onStart: () => void, language: string }> = ({ onStart, language }) => (
  <div className="text-center flex flex-col items-center justify-center h-full">
    <h2 className="text-2xl font-bold text-green-800 mb-2">Welcome to Prani Mitra Live</h2>
    <p className="text-gray-600 mb-2">Language: <span className="font-semibold">{language}</span></p>
    <p className="text-gray-600 mb-6 max-w-md">Get instant voice assistance for your farming needs. Press the button below to start your call.</p>
    <button
      onClick={onStart}
      className="bg-green-600 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-green-700 transition-transform transform hover:scale-105"
    >
      Start Call
    </button>
  </div>
);

const IVRFlow: React.FC = () => {
  const [step, setStep] = useState<'language' | 'welcome' | 'ivr' | 'summary'>('language');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [language, setLanguage] = useState<string>('English');

  const handleLanguageSelect = (lang: string) => {
    setLanguage(lang);
    setStep('welcome');
  };

  const handleCallEnd = (finalTranscript: TranscriptEntry[]) => {
    setTranscript(finalTranscript);
    setStep('summary');
  };

  const handleRestart = () => {
      setTranscript([]);
      setStep('language');
  };

  switch (step) {
    case 'language':
        return <LanguageSelectionScreen onSelect={handleLanguageSelect} />;
    case 'welcome':
      return <WelcomeScreen onStart={() => setStep('ivr')} language={language} />;
    case 'ivr':
      return <IVRScreen onCallEnd={handleCallEnd} language={language} />;
    case 'summary':
      return <SummaryScreen transcript={transcript} onRestart={handleRestart} language={language} />;
    default:
      return <LanguageSelectionScreen onSelect={handleLanguageSelect} />;
  }
};

export default IVRFlow;