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

const ConfirmationDialog: React.FC<{ onConfirm: () => void; onCancel: () => void }> = ({ onConfirm, onCancel }) => (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div className="bg-white rounded-2xl shadow-xl p-6 m-4 max-w-sm text-center w-full">
        <h3 id="dialog-title" className="text-xl font-semibold text-gray-800 mb-2">Ready to start your call?</h3>
        <p className="text-sm text-gray-600 mb-6">
          Please ensure you are in a quiet environment for the best experience.
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={onCancel}
            className="px-6 py-2 rounded-full font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
            aria-label="Cancel starting the call"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 rounded-full font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
            aria-label="Confirm to start the call"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );

const IVRFlow: React.FC = () => {
  const [step, setStep] = useState<'language' | 'welcome' | 'ivr' | 'summary'>('language');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [language, setLanguage] = useState<string>('English');
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleLanguageSelect = (lang: string) => {
    setLanguage(lang);
    setStep('welcome');
  };

  const handleCallEnd = (finalTranscript: TranscriptEntry[], url: string | null) => {
    setTranscript(finalTranscript);
    setRecordingUrl(url);
    setStep('summary');
  };

  const handleRestart = () => {
      setTranscript([]);
      setRecordingUrl(null);
      setStep('language');
  };

  const handleStartupError = () => {
    setStep('welcome');
  };
  
  const handleStartCallRequest = () => {
    setShowConfirmation(true);
  };

  const handleConfirmStartCall = () => {
    setShowConfirmation(false);
    setStep('ivr');
  };

  const handleCancelStartCall = () => {
    setShowConfirmation(false);
  };


  switch (step) {
    case 'language':
        return <LanguageSelectionScreen onSelect={handleLanguageSelect} />;
    case 'welcome':
      return (
        <div className="relative h-full">
            <WelcomeScreen onStart={handleStartCallRequest} language={language} />
            {showConfirmation && <ConfirmationDialog onConfirm={handleConfirmStartCall} onCancel={handleCancelStartCall} />}
        </div>
      );
    case 'ivr':
      return <IVRScreen onCallEnd={handleCallEnd} language={language} onStartupError={handleStartupError} />;
    case 'summary':
      return <SummaryScreen transcript={transcript} onRestart={handleRestart} language={language} recordingUrl={recordingUrl} />;
    default:
      return <LanguageSelectionScreen onSelect={handleLanguageSelect} />;
  }
};

export default IVRFlow;