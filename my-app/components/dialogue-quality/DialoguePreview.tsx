'use client';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface DialoguePreviewProps {
  dialogue: Message[];
  isLoading: boolean;
}

export function DialoguePreview({ dialogue, isLoading }: DialoguePreviewProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>生成对话中...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (dialogue.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>生成的对话</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {dialogue.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === 'assistant' ? 'justify-start' : 'justify-end'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'assistant'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                <p className="text-sm font-medium">
                  {message.role === 'assistant' ? '教练' : '用户'}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 