
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { PaperAirplaneIcon, ArrowPathIcon } from './Icons';
import { knowledgeBase } from '../utils/knowledgeBase';
import { logQuestion } from '../utils/questionLogger';

const LanguageSelection = ({ onSelect }) => (
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

const ServiceSelection = ({ onSelect }) => (
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


const ChatFlow = () => {
  const [language, setLanguage] = useState(null);
  const [service, setService] = useState(null);
  const [initState, setInitState] = useState('initializing');
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const initializeChat = useCallback(async () => {
    if (!language || !service) return;
    setInitState('initializing');
    setError(null);
    setChat(null);
    setMessages([]);

    const welcomeMessages = {
        'English': `Hello! I am your Prani Mitra Assistant for ${service}. How can I help you today?`,
        'Hindi': `नमस्ते! मैं ${service} के लिए आपका प्राणी मित्र सहायक हूँ। आज मैं आपकी कैसे मदद कर सकता हूँ?`,
        'Telugu': `నమస్కారం! నేను ${service} కోసం మీ ప్రాణి మిత్ర సహాయకుడిని. ఈ రోజు నేను మీకు ఎలా సహాయపడగలను?`,
    };

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

    const systemInstructions = {
        'English': `You are Prani Mitra, a helpful AI assistant for Indian farmers. Your expertise is strictly limited to the selected service: ${service}. You must answer ONLY in English. ${serviceInstruction}\n\nUse the following Knowledge Base. If the answer is not in the Knowledge Base, you may use general agricultural knowledge suitable for India, but ONLY if it falls within the strict scope of ${service}. If the user ends the conversation, say "Thank you for calling Prani Mitra" and nothing else.\n\n---START OF KNOWLEDGE BASE---\n${knowledgeText}\n---END OF KNOWLEDGE BASE---`,
        'Hindi': `आप प्राणी मित्र हैं, जो भारतीय किसानों के लिए एक सहायक एआई हैं। आपकी विशेषज्ञता चयनित सेवा: ${service} तक सीमित है। आपको केवल हिंदी में जवाब देना है। ${serviceInstruction}\n\nनिम्नलिखित ज्ञान आधार का उपयोग करें। यदि उत्तर ज्ञान आधार में नहीं है, तो आप भारत के लिए उपयुक्त सामान्य कृषि ज्ञान का उपयोग कर सकते हैं, लेकिन केवल तभी जब वह ${service} के सख्त दायरे में आता है। यदि उपयोगकर्ता बातचीत समाप्त करता है, तो केवल "प्राणी मित्र को कॉल करने के लिए धन्यवाद" कहें।\n\n---START OF KNOWLEDGE BASE---\n${knowledgeText}\n---END OF KNOWLEDGE BASE---`,
        'Telugu': `మీరు ప్రాణి మిత్ర, భారతీయ రైతులకు సహాయపడే ఒక AI సహాయకుడు. మీ నైపుణ్యం ఎంచుకున్న సేవ: ${service} కు ఖచ్చితంగా పరిమితం. మీరు కేవలం తెలుగులో మాత్రమే సమాధానం ఇవ్వాలి. ${serviceInstruction}\n\nదిగువ ఉన్న నాలెడ్జ్ బేస్ ఉపయోగించండి. సమాధానం నాలెడ్జ్ బేస్‌లో లేకపోతే, మీరు భారతదేశానికి సరిపోయే సాధారణ వ్యవసాయ జ్ఞానాన్ని ఉపయోగించవచ్చు, కానీ అది ${service} యొక్క పరిధిలో ఉంటే మాత్రమే. వినియోగదారు సంభాషణను ముగించినట్లయితే, "ప్రాణి మిత్రకు కాల్ చేసినందుకు ధన్యవాదాలు" అని మాత్రమే చెప్పండి.\n\n---START OF KNOWLEDGE BASE---\n${knowledgeText}\n---END OF KNOWLEDGE BASE---`,
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
  }, [language, service]);

  useEffect(() => {
    if (language && service) {
      initializeChat();
    }
  }, [language, service, initializeChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !chat) return;

    const userMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    
    // Log the user's question to the file (localStorage)
    logQuestion(input);

    setInput('');
    setIsLoading(true);

    try {
      const response = await chat.sendMessage({ message: input });
      const modelMessage = { role: 'model', text: response.text };
      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = { role: 'model', text: 'Sorry, I encountered an error. Please try again.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetChat = () => {
    setLanguage(null);
    setService(null);
    setMessages([]);
    setChat(null);
    setInitState('initializing');
  };

  if (!language) {
    return <LanguageSelection onSelect={setLanguage} />;
  }

  if (!service) {
      return (
          <div className="h-full flex flex-col">
               <div className="p-4">
                   <button onClick={() => setLanguage(null)} className="text-sm text-green-600 hover:underline mb-2">&larr; Back to Language</button>
               </div>
               <div className="flex-grow">
                  <ServiceSelection onSelect={setService} />
               </div>
          </div>
      )
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
              onClick={resetChat}
              className="mt-4 text-sm text-gray-500 hover:underline"
          >
              Start Over
          </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
       <div className="bg-white border-b border-gray-200 px-4 py-2 flex justify-between items-center text-xs text-gray-500">
            <span>{language} | {service}</span>
            <button onClick={resetChat} className="hover:text-green-600">Change Settings</button>
       </div>
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
