import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Send, Bot, User, ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import PropertyCardList from '@/components/chatbot/PropertyCardList';
import { parsePropertyInfo, messageContainsProperties } from '@/components/chatbot/parsePropertyInfo';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  showPropertyCards?: boolean;
  predefinedOptions?: string[];
}

export default function WebBotPage() {
  // Function to extract text from webhook response (handles JSON parsing)
  const extractTextFromResponse = (responseData: string): string => {
    // First try to parse as JSON
    try {
      const jsonData = JSON.parse(responseData);
      
      // Check for common JSON response keys
      let extractedText = '';
      if (jsonData.output) {
        extractedText = jsonData.output;
      } else if (jsonData.message) {
        extractedText = jsonData.message;
      } else if (jsonData.response) {
        extractedText = jsonData.response;
      } else if (jsonData.text) {
        extractedText = jsonData.text;
      } else if (jsonData.result) {
        extractedText = jsonData.result;
      } else if (jsonData.data) {
        extractedText = jsonData.data;
      } else if (typeof jsonData === 'string') {
        extractedText = jsonData;
      } else {
        // If it's an object but no recognized key, look for any string value
        const values = Object.values(jsonData);
        for (const value of values) {
          if (typeof value === 'string' && value.trim().length > 0) {
            extractedText = value;
            break;
          }
        }
        // Last resort: return stringified JSON
        if (!extractedText) {
          extractedText = JSON.stringify(jsonData);
        }
      }
      
      // Clean up common escape sequences and formatting
      extractedText = extractedText
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r');
      
      return extractedText;
      
    } catch (parseError) {
      // If it contains JSON-like structure but isn't valid JSON, try to extract manually
      const jsonMatch = responseData.match(/\{"[^"]*":\s*"([^"]*(?:\\.[^"]*)*)"\}/);
      if (jsonMatch) {
        return jsonMatch[1]
          .replace(/\\"/g, '"')
          .replace(/\\n/g, '\n')
          .replace(/\\\\/g, '\\')
          .replace(/\\t/g, '\t')
          .replace(/\\r/g, '\r');
      }
      
      // Try to extract output field specifically with better regex
      const outputMatch = responseData.match(/"output":\s*"([^"]*(?:\\.[^"]*)*)"/s);
      if (outputMatch) {
        return outputMatch[1]
          .replace(/\\"/g, '"')
          .replace(/\\n/g, '\n')
          .replace(/\\\\/g, '\\')
          .replace(/\\t/g, '\t')
          .replace(/\\r/g, '\r');
      }
      
      // If all else fails, return as plain text
      return responseData;
    }
  };

  // Function to format text with better structure and proper line breaks
  const formatResponseText = (text: string): string => {
    let formattedText = text;

    // Add proper spacing around separators
    formattedText = formattedText.replace(/---/g, '\n\n---\n\n');
    
    // Handle emoji numbered lists (1️⃣, 2️⃣, 3️⃣, etc.) more effectively
    // Split text into lines and process each line
    const lines = formattedText.split('\n');
    const processedLines: string[] = [];
    
    lines.forEach(line => {
      // Check if line contains multiple emoji numbers
      const emojiPattern = /(\d+️⃣[^️]+?)(?=\d+️⃣|$)/g;
      const matches = line.match(emojiPattern);
      
      if (matches && matches.length > 1) {
        // Split into separate lines for each emoji number
        matches.forEach(match => {
          processedLines.push(match.trim());
        });
      } else {
        processedLines.push(line);
      }
    });
    
    formattedText = processedLines.join('\n');
    
    // Add line breaks before regular numbered lists (1., 2., 3., etc.)
    formattedText = formattedText.replace(/(\s)(\d+\.\s)/g, '\n\n$2');
    
    // Add line breaks before lettered lists (a., b., c., etc.)
    formattedText = formattedText.replace(/(\s)([a-z]\.\s)/g, '\n\n$2');
    
    // Add line breaks before emoji indicators for property details
    formattedText = formattedText
      .replace(/📍/g, '\n📍')       // Add line break before location
      .replace(/🏠/g, '\n🏠')       // Add line break before type
      .replace(/🔑/g, '\n🔑')       // Add line break before configuration
      .replace(/🟦/g, '\n🟦')       // Add line break before size
      .replace(/📆/g, '\n📆')       // Add line break before possession
      .replace(/💰/g, '\n💰')       // Add line break before price
      .replace(/📑/g, '\n📑')       // Add line break before RERA
      .replace(/🏢/g, '\n🏢');      // Add line break before building name

    // Add line breaks before common question starters
    formattedText = formattedText
      .replace(/(\s)(Would you like)/g, '\n\n$2')
      .replace(/(\s)(Could you)/g, '\n\n$2')
      .replace(/(\s)(Are you)/g, '\n\n$2')
      .replace(/(\s)(Do you)/g, '\n\n$2')
      .replace(/(\s)(May I)/g, '\n\n$2')
      .replace(/(\s)(Let me know)/g, '\n\n$2')
      .replace(/(\s)(Please)/g, '\n\n$2')
      .replace(/(\s)(Next,)/g, '\n\n$2')
      .replace(/(\s)(Options:)/g, '\n\n$2');

    // Add line breaks before common continuation phrases
    formattedText = formattedText
      .replace(/(\s)(This helps)/g, '\n\n$2')
      .replace(/(\s)(For example)/g, '\n\n$2')
      .replace(/(\s)(In other words)/g, '\n\n$2')
      .replace(/(\s)(Let's personalise)/g, '\n\n$2')
      .replace(/(\s)(To get you)/g, '\n\n$2');

    // Clean up excessive spacing but preserve structure
    formattedText = formattedText
      .replace(/\n\s*\n\s*\n/g, '\n\n')  // Clean up excessive line breaks
      .replace(/\n /g, '\n')             // Remove spaces after line breaks
      .replace(/^\n+/g, '')              // Remove leading line breaks
      .trim();
    
    return formattedText;
  };

  // Function to detect and extract help-related options from text
  const extractHelpOptions = (text: string): { cleanText: string; options: string[] } => {
    const options: string[] = [];
    let cleanText = text;

    // Pattern 1: "If you need help" patterns
    const helpPatterns = [
      /If you need help ([^.!?]+[.!?])/gi,
      /if you need help ([^.!?]+[.!?])/gi,
      /If you want help ([^.!?]+[.!?])/gi,
      /if you want help ([^.!?]+[.!?])/gi,
      /let me know if you need help ([^.!?]+[.!?])/gi,
      /Let me know if you need help ([^.!?]+[.!?])/gi,
      /just let me know if you need help/gi,
      /just let me know!/gi
    ];

    helpPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // Remove the match from clean text
          cleanText = cleanText.replace(match, '').replace(/\s+/g, ' ').trim();
          // Add "I need help" button
          if (!options.includes('I need help')) {
            options.push('I need help');
          }
        });
      }
    });

    // Pattern 2: Specific help phrases
    const specificHelpPhrases = [
      'choosing an area',
      'choosing the flat size',
      'figuring out your budget',
      'deciding on the timeline',
      'help deciding',
      'help figuring'
    ];

    specificHelpPhrases.forEach(phrase => {
      if (text.toLowerCase().includes(phrase)) {
        if (!options.includes('I need help')) {
          options.push('I need help');
        }
      }
    });

    // Pattern 3: Question mark with help context
    if (text.includes('?') && text.toLowerCase().includes('help')) {
      if (!options.includes('I need help')) {
        options.push('I need help');
      }
    }

    // Clean up the text by removing redundant phrases
    cleanText = cleanText
      .replace(/\s*,\s*just let me know!/gi, '')
      .replace(/\s*Let me know if you need help!/gi, '')
      .replace(/\s*If you need help[^.!?]*[.!?]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    return { cleanText, options };
  };

  // Function to format message content with proper structure
  const formatMessageContent = (text: string) => {
    // Split text into paragraphs
    const paragraphs = text.split('\n\n');
    
    return paragraphs.map((paragraph, index) => {
      // Check if paragraph contains bullet points (including various formats)
      if (paragraph.includes('• ') || paragraph.includes('- ') || /^\d+[\.\)]\s/.test(paragraph) || /^[a-zA-Z][\.\)]\s/.test(paragraph)) {
        const lines = paragraph.split('\n');
        const title = lines[0].includes('• ') || lines[0].includes('- ') || /^\d+[\.\)]\s/.test(lines[0]) || /^[a-zA-Z][\.\)]\s/.test(lines[0]) ? null : lines[0];
        const bullets = lines.filter(line => line.includes('• ') || line.includes('- ') || /^\d+[\.\)]\s/.test(line) || /^[a-zA-Z][\.\)]\s/.test(line));
        const otherLines = lines.filter(line => !line.includes('• ') && !line.includes('- ') && !/^\d+[\.\)]\s/.test(line) && !/^[a-zA-Z][\.\)]\s/.test(line) && line !== title);
        
        return (
          <div key={index} className={index > 0 ? 'mt-4' : ''}>
            {title && <p className="mb-2 font-medium">{title}</p>}
            {bullets.length > 0 && (
              <ul className="list-none space-y-1 mb-2">
                {bullets.map((bullet, bulletIndex) => (
                  <li key={bulletIndex} className="flex items-start">
                    <span className="text-[#1752FF] mr-2 mt-0.5 flex-shrink-0">•</span>
                    <span>{bullet.replace(/^[•-]\s*/, '').replace(/^\d+[\.\)]\s*/, '').replace(/^[a-zA-Z][\.\)]\s*/, '')}</span>
                  </li>
                ))}
              </ul>
            )}
            {otherLines.map((line, lineIndex) => (
              <p key={lineIndex} className="mb-1">{line}</p>
            ))}
          </div>
        );
      }
      
      // Check if paragraph contains numbered lists
      if (/^\d+\./.test(paragraph.trim())) {
        const lines = paragraph.split('\n');
        const numberedItems = lines.filter(line => /^\d+\./.test(line.trim()));
        const otherLines = lines.filter(line => !/^\d+\./.test(line.trim()));
        
        return (
          <div key={index} className={index > 0 ? 'mt-4' : ''}>
            {otherLines.map((line, lineIndex) => (
              <p key={lineIndex} className="mb-2">{line}</p>
            ))}
            {numberedItems.length > 0 && (
              <ol className="list-decimal list-inside space-y-1 ml-4">
                {numberedItems.map((item, itemIndex) => (
                  <li key={itemIndex}>{item.replace(/^\d+\.\s*/, '')}</li>
                ))}
              </ol>
            )}
          </div>
        );
      }
      
      // Regular paragraph - split by single line breaks for better readability
      const lines = paragraph.split('\n').filter(line => line.trim());
      
      return (
        <div key={index} className={index > 0 ? 'mt-4' : ''}>
          {lines.map((line, lineIndex) => (
            <p key={lineIndex} className={lineIndex > 0 ? 'mt-2' : ''}>
              {line}
            </p>
          ))}
        </div>
      );
    });
  };
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      text: 'Hello! Welcome to Relai - your unbiased real estate advisory company in Hyderabad.\n\nAre you looking for a property? I can help you find the best suitable property/home in Hyderabad from our database of 2000+ residential properties.\n\nRelai is an unbiased advisory company that helps you make informed decisions about real estate investments.\n\nHow can I assist you in finding your perfect home today?',
      sender: 'bot',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [sessionId] = useState<string>(`session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Keep input focused on mobile
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message
    const newUserMessage: Message = {
      id: `user_${Date.now()}`,
      text: userMessage,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newUserMessage]);

    // Add typing indicator
    const typingMessage: Message = {
      id: `typing_${Date.now()}`,
      text: 'Thinking...',
      sender: 'bot',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, typingMessage]);

    try {
      let responseText = '';
      let webhookWorked = false;

      // Try n8n webhook first
      const parameterFormats = [
        () => {
          const url = new URL('https://navaneeth03.app.n8n.cloud/webhook/my-webhook');
          url.searchParams.append('message', userMessage);
          url.searchParams.append('sessionId', sessionId);
          url.searchParams.append('context', 'property_search');
          url.searchParams.append('agent', 'Web Bot User');
          return url.toString();
        },
        () => {
          const url = new URL('https://navaneeth03.app.n8n.cloud/webhook/my-webhook');
          url.searchParams.append('query', userMessage);
          url.searchParams.append('sessionId', sessionId);
          return url.toString();
        },
        () => {
          const url = new URL('https://navaneeth03.app.n8n.cloud/webhook/my-webhook');
          url.searchParams.append('text', userMessage);
          url.searchParams.append('sessionId', sessionId);
          return url.toString();
        },
        () => {
          const url = new URL('https://navaneeth03.app.n8n.cloud/webhook/my-webhook');
          url.searchParams.append('input', userMessage);
          url.searchParams.append('sessionId', sessionId);
          return url.toString();
        }
      ];

      for (const formatFunc of parameterFormats) {
        try {
          const response = await fetch(formatFunc(), {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.text();
            console.log('Raw webhook response:', data);
            
            // Extract JSON from webhook response
            responseText = extractTextFromResponse(data);
            console.log('Extracted text:', responseText);
            
            // Format response text with better structure
            responseText = formatResponseText(responseText);
            console.log('Final response text after conversion:', responseText);
            
            webhookWorked = true;
            break;
          }
        } catch (error) {
          console.log('Format failed, trying next...', error);
        }
      }

      // Fallback to local responses if webhook fails
      if (!webhookWorked) {
        responseText = generateFallbackResponse(userMessage);
        responseText = formatResponseText(responseText);
      }

      // Extract help options from response text
      const { cleanText, options } = extractHelpOptions(responseText);
      
      // Remove typing indicator and add bot response
      setMessages(prev => {
        const withoutTyping = prev.filter(msg => msg.id !== typingMessage.id);
        const botResponse: Message = {
          id: `bot_${Date.now()}`,
          text: cleanText,
          sender: 'bot',
          timestamp: new Date(),
          showPropertyCards: messageContainsProperties(cleanText),
          predefinedOptions: options.length > 0 ? options : undefined
        };
        return [...withoutTyping, botResponse];
      });

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove typing indicator and add error response
      setMessages(prev => {
        const withoutTyping = prev.filter(msg => msg.id !== typingMessage.id);
        const errorResponse: Message = {
          id: `error_${Date.now()}`,
          text: 'I apologize, but I encountered an issue processing your request. Please try again or contact our support team for assistance.',
          sender: 'bot',
          timestamp: new Date(),
        };
        return [...withoutTyping, errorResponse];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateFallbackResponse = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return 'Hello! I\'m here to help you find the perfect property in Hyderabad.\n\nI can assist with property searches, market insights, pricing information, and area recommendations. What are you looking for today?';
    }
    
    if (lowerMessage.includes('property') || lowerMessage.includes('house') || lowerMessage.includes('apartment')) {
      return 'I can help you find properties in Hyderabad! Could you please tell me:\n\n• What type of property are you looking for? (apartment, villa, plot, etc.)\n• Your preferred location or area\n• Your budget range\n• Any specific requirements (BHK, amenities, etc.)\n\nThis will help me provide you with the most relevant options.';
    }
    
    if (lowerMessage.includes('location') || lowerMessage.includes('area')) {
      return 'Hyderabad has many excellent areas for real estate investment!\n\nSome popular locations include:\n\n• Gachibowli - IT hub with modern infrastructure\n• Madhapur - HITEC City area with premium properties\n• Kondapur - Well-connected with good amenities\n• Kukatpally - Established residential area\n• Miyapur - Growing suburb with metro connectivity\n\nWhich area interests you most, or would you like more details about any specific location?';
    }
    
    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('budget')) {
      return 'Property prices in Hyderabad vary by location and type:\n\n• Apartments: ₹40L - ₹2Cr+ depending on area and size\n• Villas: ₹80L - ₹5Cr+ based on location and amenities\n• Plots: ₹20L - ₹1Cr+ per unit\n\nCould you share your budget range and preferred property type? This will help me suggest suitable options for you.';
    }
    
    return 'Thank you for your question! I\'m here to help you with property-related queries in Hyderabad.\n\nI can assist with:\n\n• Property searches and recommendations\n• Market insights and pricing\n• Area information and connectivity\n• Investment advice\n• Legal and documentation guidance\n\nHow can I help you today?';
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Fixed Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#1752FF] rounded-full flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Relai AI Assistant
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Real Estate Expert for Hyderabad
            </p>
          </div>
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500">
          {messages.length > 1 ? `${messages.length - 1} messages` : 'New conversation'}
        </div>
      </div>

      {/* Scrollable Chat Messages */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        style={{ scrollBehavior: 'smooth' }}
      >
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
            >
              <div className={`flex max-w-[85%] ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2`}>
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback className={`${message.sender === 'user' ? 'bg-[#1752FF]' : 'bg-gray-600'} text-white`}>
                    {message.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>
                
                <div className={`rounded-2xl px-4 py-2 ${
                  message.sender === 'user' 
                    ? 'bg-[#1752FF] text-white ml-2' 
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm mr-2'
                }`}>
                  <div className="text-sm leading-relaxed">
                    {formatMessageContent(message.text)}
                  </div>
                  
                  {message.predefinedOptions && message.predefinedOptions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.predefinedOptions.map((option, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setInput(option);
                            setTimeout(() => handleSendMessage(), 100);
                          }}
                          className="text-sm bg-white dark:bg-gray-700 border-[#1752FF] text-[#1752FF] hover:bg-[#1752FF] hover:text-white"
                        >
                          {option}
                        </Button>
                      ))}
                    </div>
                  )}
                  
                  {message.showPropertyCards && (
                    <div className="mt-3">
                      <PropertyCardList properties={parsePropertyInfo(message.text)} />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start mb-4"
          >
            <div className="flex items-start space-x-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-gray-600 text-white">
                  <Bot className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-2 shadow-sm">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Typing...</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Fixed Input Area */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center space-x-2 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
              className="pr-12 border-gray-300 dark:border-gray-600 focus:border-[#1752FF] focus:ring-[#1752FF] rounded-full bg-gray-50 dark:bg-gray-700"
            />
            {input.trim() && (
              <Button
                onClick={handleSendMessage}
                disabled={isLoading}
                size="sm"
                className="absolute right-1 top-1 h-8 w-8 p-0 rounded-full bg-[#1752FF] hover:bg-[#1442CC]"
              >
                <ArrowUp className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          {/* Scroll to bottom button - only show on mobile when not at bottom */}
          <Button
            onClick={scrollToBottom}
            variant="outline"
            size="sm"
            className="md:hidden rounded-full w-10 h-10 p-0"
          >
            <ArrowUp className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
          Relai AI can make mistakes. Please verify important information.
        </div>
      </div>
    </div>
  );
}