import React, { useState } from 'react';
import IVRScreen from './IVRScreen';
import SummaryScreen from './SummaryScreen';
import { PhoneIcon } from './Icons';

const LandingScreen = ({ onStart }) => (
  <div className="text-center flex flex-col items-center justify-center h-full">
    <div className="bg-green-100 p-6 rounded-full mb-6 animate-pulse">
         <PhoneIcon className="w-12 h-12 text-green-600" />
    </div>
    <h2 className="text-3xl font-bold text-green-800 mb-2">Prani Mitra Live</h2>
    <p className="text-gray-600 mb-8 max-w-md">Your intelligent farming assistant is just a call away.</p>
    <button
      onClick={onStart}
      className="bg-green-600 text-white font-bold py-4 px-12 rounded-full shadow-lg hover:bg-green-700 transition-transform transform hover:scale-105 text-lg flex items-center gap-2"
    >
      Start Call
    </button>
  </div>
);

const LanguageSelectionScreen = ({ onSelect }) => (
    <div className="text-center flex flex-col items-center justify-center h-full">
      <h2 className="text-2xl font-bold text-green-800 mb-2">Select Language</h2>
      <p className="text-gray-600 mb-6 max-w-md">Please choose your preferred language.</p>
      <div className="flex flex-col sm:flex-row gap-4">
        <button onClick={() => onSelect('Telugu')} className="bg-white border-2 border-green-600 text-green-700 font-bold py-3 px-8 rounded-full shadow-md hover:bg-green-600 hover:text-white transition-colors">తెలుగు</button>
        <button onClick={() => onSelect('Hindi')} className="bg-white border-2 border-green-600 text-green-700 font-bold py-3 px-8 rounded-full shadow-md hover:bg-green-600 hover:text-white transition-colors">हिन्दी</button>
        <button onClick={() => onSelect('English')} className="bg-white border-2 border-green-600 text-green-700 font-bold py-3 px-8 rounded-full shadow-md hover:bg-green-600 hover:text-white transition-colors">English</button>
      </div>
    </div>
);

const ServiceSelectionScreen = ({ onSelect }) => (
    <div className="text-center flex flex-col items-center justify-center h-full">
      <h2 className="text-2xl font-bold text-green-800 mb-2">Select Service</h2>
      <p className="text-gray-600 mb-6 max-w-md">Please select the topic you need help with.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg px-4">
        {[
            { id: 'Farming', label: 'Farming', icon: '🌾' },
            { id: 'Animal Health', label: 'Animal Health', icon: '🐄' },
            { id: 'Government Schemes', label: 'Government Schemes', icon: '🏛️' },
            { id: 'General Queries', label: 'General Queries', icon: '❓' }
        ].map((s) => (
             <button key={s.id} onClick={() => onSelect(s.id)} className="bg-white border-2 border-green-100 hover:border-green-600 text-gray-800 hover:text-green-800 font-semibold py-4 px-6 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center space-x-4 text-left group">
                <span className="text-3xl group-hover:scale-110 transition-transform">{s.icon}</span>
                <span className="text-lg">{s.label}</span>
            </button>
        ))}
      </div>
    </div>
);

const ConfirmationDialog = ({ onConfirm, onCancel, service, language }) => (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div className="bg-white rounded-2xl shadow-xl p-6 m-4 max-w-sm text-center w-full">
        <h3 id="dialog-title" className="text-xl font-semibold text-gray-800 mb-2">Ready to start?</h3>
        <div className="mb-6 text-gray-600 space-y-1">
            <p>Language: <span className="font-semibold text-green-700">{language}</span></p>
            <p>Service: <span className="font-semibold text-green-700">{service}</span></p>
            <p className="text-xs mt-2 text-gray-500">Ensure you are in a quiet environment.</p>
        </div>
        <div className="flex justify-center gap-4">
          <button
            onClick={onCancel}
            className="px-6 py-2 rounded-full font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 rounded-full font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );

const IVRFlow = () => {
  const [step, setStep] = useState('landing');
  const [transcript, setTranscript] = useState([]);
  const [language, setLanguage] = useState('English');
  const [service, setService] = useState('General Queries');
  const [recordingUrl, setRecordingUrl] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleStartRequest = () => {
      setStep('language');
  };

  const handleLanguageSelect = (lang) => {
    setLanguage(lang);
    setStep('service');
  };

  const handleServiceSelect = (svc) => {
      setService(svc);
      setShowConfirmation(true);
  };

  const handleConfirmStartCall = () => {
    setShowConfirmation(false);
    setStep('ivr');
  };

  const handleCancelStartCall = () => {
    setShowConfirmation(false);
  };

  const handleCallEnd = (finalTranscript, url) => {
    setTranscript(finalTranscript);
    setRecordingUrl(url);
    setStep('summary');
  };

  const handleRestart = () => {
      setTranscript([]);
      setRecordingUrl(null);
      setStep('landing');
  };

  const handleStartupError = () => {
    setStep('landing');
  };
  
  switch (step) {
    case 'landing':
        return <LandingScreen onStart={handleStartRequest} />;
    case 'language':
        return <LanguageSelectionScreen onSelect={handleLanguageSelect} />;
    case 'service':
        return (
            <div className="relative h-full">
                <ServiceSelectionScreen onSelect={handleServiceSelect} />
                {showConfirmation && <ConfirmationDialog onConfirm={handleConfirmStartCall} onCancel={handleCancelStartCall} service={service} language={language} />}
            </div>
        );
    case 'ivr':
      return <IVRScreen onCallEnd={handleCallEnd} language={language} service={service} onStartupError={handleStartupError} />;
    case 'summary':
      return <SummaryScreen transcript={transcript} onRestart={handleRestart} language={language} recordingUrl={recordingUrl} />;
    default:
      return <LandingScreen onStart={handleStartRequest} />;
  }
};

export default IVRFlow;
