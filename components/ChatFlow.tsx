import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { PaperAirplaneIcon, ArrowPathIcon } from './Icons';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

type InitializationState = 'initializing' | 'ready' | 'error';

const LanguageSelection: React.FC<{ onSelect: (lang: string) => void }> = ({ onSelect }) => (
    <div className="text-center flex flex-col items-center justify-center h-full">
      <h2 className="text-2xl font-bold text-green-800 mb-2">Select Language</h2>
      <p className="text-gray-600 mb-6 max-w-md">Please choose your preferred language to start chatting.</p>
      <div className="flex flex-col sm:flex-row gap-4">
        <button onClick={() => onSelect('Telugu')} className="bg-green-600 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-green-700 transition-transform transform hover:scale-105">తెలుగు</button>
        <button onClick={() => onSelect('Hindi')} className="bg-green-600 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-green-700 transition-transform transform hover:scale-105">हिन्दी</button>
        <button onClick={() => onSelect('English')} className="bg-green-600 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-green-700 transition-transform transform hover:scale-105">English</button>
      </div>
    </div>
);


const ChatFlow: React.FC = () => {
  const [language, setLanguage] = useState<string | null>(null);
  const [initState, setInitState] = useState<InitializationState>('initializing');
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const initializeChat = useCallback(async () => {
    if (!language) return;
    setInitState('initializing');
    setError(null);
    setChat(null);
    setMessages([]);

    const welcomeMessages: { [key: string]: string } = {
        'English': 'Hello! How can I help you with your farming questions today?',
        'Hindi': 'नमस्ते! आज मैं आपकी खेती-किसानी से जुड़े सवालों में कैसे मदद कर सकता हूँ?',
        'Telugu': 'నమస్కారం! ఈ రోజు మీ వ్యవసాయ ప్రశ్నలతో నేను మీకు ఎలా సహాయపడగలను?',
    };

    const systemInstructions: { [key: string]: string } = {
        'English': 'You are Prani Mitra, a helpful AI assistant for Indian farmers. Your expertise is strictly limited to topics about farming and animal healthcare. You must answer ONLY in English. Answer questions clearly and concisely. If asked about any other topic, you must politely decline and state that you can only assist with farming and animal health-related queries.',
        'Hindi': 'आप प्राणी मित्र हैं, जो भारतीय किसानों के लिए एक सहायक एआई हैं। आपकी विशेषज्ञता केवल खेती और पशु स्वास्थ्य देखभाल के विषयों तक ही सीमित है। आपको केवल हिंदी में जवाब देना है। सवालों के जवाब स्पष्ट और संक्षिप्त रूप से दें। यदि किसी अन्य विषय के बारे में पूछा जाता है, तो आपको विनम्रता से मना करना होगा और यह बताना होगा कि आप केवल खेती और पशु स्वास्थ्य से संबंधित प्रश्नों में सहायता कर सकते हैं।',
        'Telugu': 'మీరు ప్రాణి మిత్ర, భారతీయ రైతులకు సహాయపడే ఒక AI సహాయకుడు. మీ నైపుణ్యం వ్యవసాయం మరియు పశు ఆరోగ్య సంరక్షణ అంశాలకు మాత్రమే పరిమితం. మీరు కేవలం తెలుగులో మాత్రమే సమాధానం ఇవ్వాలి. ప్రశ్నలకు స్పష్టంగా మరియు సంక్షిప్తంగా సమాధానం ఇవ్వండి. ఇతర ఏ విషయం గురించి అయినా అడిగితే, మీరు వినయంగా తిరస్కరించాలి మరియు మీరు కేవలం వ్యవసాయం మరియు పశు ఆరోగ్య సంబంధిత ప్రశ్నలతో మాత్రమే సహాయపడగలరని చెప్పాలి.',
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const chatSession = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: systemInstructions[language] || systemInstructions['English']
        }
      });
      setChat(chatSession);
      setMessages([{ role: 'model', text: welcomeMessages[language] || welcomeMessages['English'] }]);
      setInitState('ready');
    } catch (e) {
      console.error('Failed to initialize chat:', e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(`Failed to initialize chat. This might be due to an invalid API key or a network issue. Error: ${errorMessage}`);
      setInitState('error');
    }
  }, [language]);

  useEffect(() => {
    if (language) {
      initializeChat();
    }
  }, [language, initializeChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !chat) return;

    const userMessage: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chat.sendMessage({ message: input });
      const modelMessage: ChatMessage = { role: 'model', text: response.text };
      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = { role: 'model', text: 'Sorry, I encountered an error. Please try again.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!language) {
    return <LanguageSelection onSelect={setLanguage} />;
  }
  
  if (initState === 'initializing') {
    return (
      <div className="flex items-center justify-center h-full">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (initState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
          <p className="text-red-600 mb-4">
            {error || 'Failed to initialize chat. Please try again.'}
          </p>
          <button
              onClick={initializeChat}
              className="bg-green-600 text-white font-bold py-2 px-6 rounded-full shadow-lg hover:bg-green-700"
          >
              Retry
          </button>
           <button
              onClick={() => setLanguage(null)}
              className="mt-4 text-sm text-gray-500 hover:underline"
          >
              Change Language
          </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`rounded-xl p-3 max-w-xs md:max-w-md ${msg.role === 'user' ? 'bg-green-100 text-green-900' : 'bg-gray-100 text-gray-800'}`}>
              <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex justify-start">
                <div className="rounded-xl p-3 bg-gray-100 text-gray-800">
                    <div className="flex items-center space-x-1">
                        <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></span>
                    </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask a question..."
            className="flex-grow border border-gray-300 rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={isLoading || initState !== 'ready'}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim() || initState !== 'ready'}
            className="bg-green-600 text-white p-3 rounded-full hover:bg-green-700 disabled:bg-green-300 transition-colors"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatFlow;
