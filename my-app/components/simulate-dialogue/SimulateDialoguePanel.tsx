'use client';

import { useState, useEffect, useRef } from 'react';
import { PromptInputForm } from './PromptInputForm';
import { DialogueWindow } from './DialogueWindow';
import { getNextMessage, getRandomDelay, DialogueMessage } from './mockDialogueGenerator';
import { AlertCircle } from 'lucide-react';

export function SimulateDialoguePanel() {
  const [messages, setMessages] = useState<DialogueMessage[]>([]);
  const [isDialogueActive, setIsDialogueActive] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  // 当前暂时未使用的状态，将来会用于实际API调用
  const [, setCoachPrompt] = useState('');
  const [, setUserPrompt] = useState('');
  
  // 用于存储对话生成的定时器ID
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  // 追踪当前是否是教练的回合
  const isCoachTurnRef = useRef(true);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // 开始对话
  const handleStartDialogue = (coachPrompt: string, userPrompt: string) => {
    setCoachPrompt(coachPrompt);
    setUserPrompt(userPrompt);
    setMessages([]);
    setIsDialogueActive(true);
    setIsGenerating(true);
    
    // 总是从教练开始对话
    isCoachTurnRef.current = true;
    generateNextMessage();
  };

  // 停止对话
  const handleStopDialogue = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsDialogueActive(false);
    setIsGenerating(false);
  };

  // 生成下一条消息
  const generateNextMessage = () => {
    setIsGenerating(true);
    
    const delay = getRandomDelay();
    timeoutRef.current = setTimeout(() => {
      // 获取新消息
      const newMessage = getNextMessage(messages, isCoachTurnRef.current);
      
      // 添加到对话历史中
      setMessages(prev => [...prev, newMessage]);
      
      // 切换角色
      isCoachTurnRef.current = !isCoachTurnRef.current;
      
      // 简短暂停后开始生成下一条消息
      setIsGenerating(false);
      
      // 如果对话仍处于活动状态，继续生成
      if (isDialogueActive) {
        timeoutRef.current = setTimeout(generateNextMessage, 500);
      }
    }, delay);
  };

  return (
    <div className="space-y-8">
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
        <div className="flex">
          <AlertCircle className="h-6 w-6 text-yellow-500 mr-2" />
          <div>
            <h3 className="text-yellow-800 font-medium">这是一个模拟对话</h3>
            <p className="text-yellow-700 text-sm">
              教练和用户角色由系统模拟，对话内容是预设的。真实系统中将使用AI模型生成响应。
            </p>
          </div>
        </div>
      </div>
      
      <PromptInputForm 
        onStartDialogue={handleStartDialogue}
        isDialogueActive={isDialogueActive}
        onStopDialogue={handleStopDialogue}
      />
      
      <div className="mt-8">
        <DialogueWindow 
          messages={messages} 
          isGenerating={isGenerating}
        />
      </div>
      
      {messages.length > 0 && (
        <div className="text-center text-sm text-gray-500">
          已自动生成 {messages.length} 条消息
          {isDialogueActive ? '，对话进行中...' : '，对话已停止'}
        </div>
      )}
    </div>
  );
} 