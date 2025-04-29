'use client';

import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Textarea } from '../ui/textarea';

interface DialogueGenerationFormProps {
  onGenerate: () => void;
  isLoading: boolean;
}

export function DialogueGenerationForm({ onGenerate, isLoading }: DialogueGenerationFormProps) {
  const [generationPrompt, setGenerationPrompt] = useState<string>("你是一位专业教练，帮助人们设定目标、克服障碍，并实现个人成长。你善于倾听、提问和给予建设性的反馈。");
  const [evalPrompt, setEvalPrompt] = useState<string>("评估以下对话的质量，从1-10打分，并给出评分原因。评估维度包括：共情度、明确度、有效性和专业性。");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 将来实现真实API时可以从此处传递参数
    onGenerate();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>教练角色定义</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <div className="text-sm font-medium" id="generationPromptLabel">角色提示词 (Generation Prompt)</div>
              <Textarea
                id="generationPrompt"
                placeholder="描述教练的角色、风格和行为方式..."
                className="min-h-[200px]"
                value={generationPrompt}
                onChange={(e) => setGenerationPrompt(e.target.value)}
                aria-labelledby="generationPromptLabel"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>评估提示词</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <div className="text-sm font-medium" id="evalPromptLabel">评估提示词 (Evaluation Prompt)</div>
              <Textarea
                id="evalPrompt"
                placeholder="描述如何评估对话质量..."
                className="min-h-[200px]"
                value={evalPrompt}
                onChange={(e) => setEvalPrompt(e.target.value)}
                aria-labelledby="evalPromptLabel"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 text-center">
        <Button type="submit" size="lg" disabled={isLoading}>
          {isLoading ? "生成中..." : "生成对话并评估"}
        </Button>
      </div>
    </form>
  );
} 