'use client';

import { useState } from 'react';
import { DialogueGenerationForm } from './DialogueGenerationForm';
import { DialoguePreview } from './DialoguePreview';
import { EvaluationResult } from './EvaluationResult';
import { getMockDialogue, getMockEvaluation, Message, Evaluation } from './mockData';

export function DialogueQualityPanel() {
  const [dialogue, setDialogue] = useState<Message[]>([]);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const handleGenerate = async (generationPrompt: string, evalPrompt: string) => {
    // 模拟API调用
    setIsGenerating(true);
    setIsEvaluating(true);
    setDialogue([]);
    setEvaluation(null);
    
    // 模拟生成对话的延迟
    setTimeout(() => {
      const mockDialogue = getMockDialogue();
      setDialogue(mockDialogue);
      setIsGenerating(false);
      
      // 模拟评估对话的延迟
      setTimeout(() => {
        const mockEvaluation = getMockEvaluation();
        setEvaluation(mockEvaluation);
        setIsEvaluating(false);
      }, 2000);
    }, 1500);
  };

  return (
    <div className="space-y-8">
      <DialogueGenerationForm onGenerate={handleGenerate} isLoading={isGenerating} />
      
      {(dialogue.length > 0 || isGenerating) && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">结果预览</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DialoguePreview dialogue={dialogue} isLoading={isGenerating} />
            <EvaluationResult evaluation={evaluation} isLoading={isEvaluating} />
          </div>
        </div>
      )}
    </div>
  );
} 