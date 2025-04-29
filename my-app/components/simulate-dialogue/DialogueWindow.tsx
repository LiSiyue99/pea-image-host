'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface Message {
  role: 'coach' | 'user';
  content: string;
  timestamp: Date;
}

interface DialogueWindowProps {
  messages: Message[];
  isGenerating: boolean;
}

export function DialogueWindow({ messages, isGenerating }: DialogueWindowProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // 滚动到最新消息
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current;
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, [messages]);

  // 格式化时间
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="border shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex justify-between items-center">
          <span>实时对话</span>
          <span className="text-xs rounded-full bg-gray-100 px-2 py-1">
            {messages.length} 条消息
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div 
          ref={scrollAreaRef} 
          className="h-[400px] overflow-y-auto p-4"
        >
          {messages.length === 0 && !isGenerating ? (
            <div className="flex h-full items-center justify-center text-gray-400">
              <p>对话将在此处显示</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`flex ${message.role === 'coach' ? 'justify-start' : 'justify-end'}`}
                >
                  <div 
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === 'coach' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium">
                        {message.role === 'coach' ? '教练' : '用户'}
                      </span>
                      <span className="text-xs opacity-70 ml-2">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                  </div>
                </div>
              ))}
              
              {isGenerating && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg px-4 py-2 bg-gray-100">
                    <div className="flex space-x-1 items-center">
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 