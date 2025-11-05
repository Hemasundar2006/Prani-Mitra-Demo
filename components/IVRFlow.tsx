
import React, { useState } from 'react';
import IVRScreen from './IVRScreen';
import SummaryScreen from './SummaryScreen';

export type TranscriptEntry = {
  speaker: 'user' | 'ai';
  text: string;
};

const WelcomeScreen: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <div className="text-center flex flex-col items-center justify-center h-full">
    <h2 className="text-2xl font-bold text-green-800 mb-2">Welcome to Prani Mitra Live</h2>
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
  const [step, setStep] = useState<'welcome' | 'ivr' | 'summary'>('welcome');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  const handleCallEnd = (finalTranscript: TranscriptEntry[]) => {
    setTranscript(finalTranscript);
    setStep('summary');
  };

  const handleRestart = () => {
      setTranscript([]);
      setStep('welcome');
  };

  switch (step) {
    case 'welcome':
      return <WelcomeScreen onStart={() => setStep('ivr')} />;
    case 'ivr':
      return <IVRScreen onCallEnd={handleCallEnd} />;
    case 'summary':
      return <SummaryScreen transcript={transcript} onRestart={handleRestart} />;
    default:
      return <WelcomeScreen onStart={() => setStep('ivr')} />;
  }
};

export default IVRFlow;
