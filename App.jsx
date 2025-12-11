
import React, { useState } from 'react';
import IVRFlow from './components/IVRFlow';
import ChatFlow from './components/ChatFlow';
import { PhoneIcon, ChatBubbleLeftRightIcon, DownloadIcon } from './components/Icons'; // Added DownloadIcon import
import { downloadLogs } from './utils/questionLogger';

const App = () => {
  const [view, setView] = useState('ivr');

  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{height: '90vh'}}>
        <header className="bg-green-800 text-white p-4 flex justify-between items-center shadow-md">
          <div>
            <h1 className="text-2xl font-bold">🌱 Prani Mitra</h1>
            <p className="text-sm opacity-90">Your AI Farming Assistant</p>
          </div>
          <button 
            onClick={downloadLogs}
            className="text-xs bg-green-700 hover:bg-green-600 text-white py-1 px-3 rounded flex items-center transition-colors"
            title="Download User Question Logs"
          >
            <DownloadIcon className="w-4 h-4 mr-1" />
            Logs
          </button>
        </header>

        <main className="flex-grow overflow-y-auto p-4 md:p-6 bg-gray-50">
          {view === 'ivr' && <IVRFlow />}
          {view === 'chat' && <ChatFlow />}
        </main>
        
        <nav className="border-t border-gray-200 bg-white">
          <div className="flex justify-around">
            <button
              onClick={() => setView('ivr')}
              className={`flex-1 flex flex-col items-center p-3 text-sm font-medium transition-colors duration-200 ${view === 'ivr' ? 'text-green-600 bg-green-50' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <PhoneIcon className="w-6 h-6 mb-1" />
              Live Call
            </button>
            <button
              onClick={() => setView('chat')}
              className={`flex-1 flex flex-col items-center p-3 text-sm font-medium transition-colors duration-200 ${view === 'chat' ? 'text-green-600 bg-green-50' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <ChatBubbleLeftRightIcon className="w-6 h-6 mb-1" />
              Text Chat
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
};

export default App;
