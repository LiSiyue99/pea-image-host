'use client';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

interface EvaluationResultProps {
  evaluation: {
    score: number;
    feedback: string;
    dimensions?: {
      empathy?: number;
      clarity?: number;
      effectiveness?: number;
      professionalism?: number;
    };
  } | null;
  isLoading: boolean;
}

export function EvaluationResult({ evaluation, isLoading }: EvaluationResultProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>评估中...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!evaluation) {
    return null;
  }

  const { score, feedback, dimensions } = evaluation;

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'bg-green-100 text-green-800';
    if (score >= 6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>对话质量评估</span>
          <Badge className={getScoreColor(score)} variant="outline">
            总分: {score}/10
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {dimensions && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(dimensions).map(([key, value]) => (
                <div key={key} className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium">{getDimensionName(key)}</p>
                  <p className={`text-2xl font-bold ${getTextColor(value as number)}`}>
                    {value}/10
                  </p>
                </div>
              ))}
            </div>
          )}

          <div>
            <h3 className="text-lg font-medium mb-2">评估反馈:</h3>
            <p className="whitespace-pre-wrap text-gray-700">{feedback}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getDimensionName(key: string): string {
  const map: Record<string, string> = {
    empathy: '共情度',
    clarity: '明确度',
    effectiveness: '有效性',
    professionalism: '专业性',
  };
  return map[key] || key;
}

function getTextColor(score: number): string {
  if (score >= 8) return 'text-green-600';
  if (score >= 6) return 'text-yellow-600';
  return 'text-red-600';
} 