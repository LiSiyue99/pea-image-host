'use client';

import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Textarea } from '../ui/textarea';

interface PromptInputFormProps {
  onStartDialogue: (coachPrompt: string, userPrompt: string) => void;
  isDialogueActive: boolean;
  onStopDialogue: () => void;
}

export function PromptInputForm({ 
  onStartDialogue, 
  isDialogueActive, 
  onStopDialogue 
}: PromptInputFormProps) {
  const [coachPrompt, setCoachPrompt] = useState<string>(
    "你是一位专业教练，帮助人们设定目标、克服障碍，并实现个人成长。你善于倾听、提问和给予建设性的反馈。"
  );
  const [userPrompt, setUserPrompt] = useState<string>(
    "你是一位正在寻求职业发展建议的用户。你感到当前工作存在瓶颈，想要突破但不确定方向。你愿意分享信息并回应教练的问题。"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartDialogue(coachPrompt, userPrompt);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>教练角色设定</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <div className="text-sm font-medium" id="coachPromptLabel">
                教练系统提示词
              </div>
              <Textarea
                id="coachPrompt"
                placeholder="描述教练的角色、风格和行为方式..."
                className="min-h-[150px]"
                value={coachPrompt}
                onChange={(e) => setCoachPrompt(e.target.value)}
                aria-labelledby="coachPromptLabel"
                disabled={isDialogueActive}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>用户角色设定</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <div className="text-sm font-medium" id="userPromptLabel">
                用户系统提示词
              </div>
              <Textarea
                id="userPrompt"
                placeholder="描述用户的背景、需求和行为方式..."
                className="min-h-[150px]"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                aria-labelledby="userPromptLabel"
                disabled={isDialogueActive}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 text-center">
        {!isDialogueActive ? (
          <Button type="submit" size="lg">
            开始对话
          </Button>
        ) : (
          <Button 
            type="button" 
            size="lg" 
            variant="destructive" 
            onClick={onStopDialogue}
          >
            停止对话
          </Button>
        )}
      </div>
    </form>
  );
} 