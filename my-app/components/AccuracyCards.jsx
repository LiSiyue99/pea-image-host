'use client';
import { Card, CardContent } from "../components/ui/card";
import React from "react";

/**
 * 动态展示准确率卡片，数据只在客户端渲染，避免 SSR hydration 问题
 * 现在补全目标一致性（goal）相关字段的准确率统计，遇到 'NA' 不计入准确率
 */
export default function AccuracyCards({ tab, data }) {
  const [accuracies, setAccuracies] = React.useState({
    empathyAccuracy: 0,
    goalAccuracy: 0,
    totalAccuracy: 0,
  });

  React.useEffect(() => {
    let empathyMatch = 0, empathyTotal = 0, goalMatch = 0, goalTotal = 0;
    // 共情相关字段
    const empathyKeys = [
      'r5_needs_empathy','r5_empathy_target','r5_has_empathy','r5_actual_empathy_target','r5_emotion_match','r5_empathy_degree',
      'r5_needs_positive_regard','r5_positive_regard_target','r5_has_positive_regard','r5_actual_positive_regard_target','r5_positive_regard_accuracy'
    ];
    // 目标一致性相关字段
    const goalKeys = [
      'main_psychology',
      'main_consensus',
      'main_confirm_goal',
      'followup_objective',
      'followup_timebound',
      'main_focus',
      'main_goal_changed',
      'followup_dynamic_adjust',
      'main_participation'
    ];
    data.forEach(item => {
      // 共情
      const h = item.empathyHumanEval, a = item.empathyAIEval;
      if (h && a) {
        empathyKeys.forEach(k => {
          if (h[k] !== undefined && a[k] !== undefined && h[k] !== 'NA' && a[k] !== 'NA') {
            empathyTotal++;
            if (h[k] === a[k]) empathyMatch++;
          }
        });
      }
      // 目标一致性
      const gh = item.goalHumanEval, ga = item.goalAIEval;
      if (gh && ga) {
        goalKeys.forEach(k => {
          if (gh[k] !== undefined && ga[k] !== undefined && gh[k] !== 'NA' && ga[k] !== 'NA') {
            goalTotal++;
            if (gh[k] === ga[k]) goalMatch++;
          }
        });
      }
    });
    // 总体准确率 = 两类题的总和
    const totalMatch = empathyMatch + goalMatch;
    const totalCount = empathyTotal + goalTotal;
    setAccuracies({
      empathyAccuracy: empathyTotal ? (empathyMatch / empathyTotal * 100).toFixed(1) : 0,
      goalAccuracy: goalTotal ? (goalMatch / goalTotal * 100).toFixed(1) : 0,
      totalAccuracy: totalCount ? (totalMatch / totalCount * 100).toFixed(1) : 0
    });
  }, [data]);

  return (
    <div className="flex gap-4 mb-6">
      <Card className="flex-1 shadow-lg rounded-xl">
        <CardContent className="py-4 text-center">
          <div className="text-sm text-gray-500 mb-1">共情评估准确率</div>
          <div className="text-2xl font-bold text-green-600">{accuracies.empathyAccuracy}%</div>
        </CardContent>
      </Card>
      <Card className="flex-1 shadow-lg rounded-xl">
        <CardContent className="py-4 text-center">
          <div className="text-sm text-gray-500 mb-1">目标一致性评估准确率</div>
          <div className="text-2xl font-bold text-blue-600">{accuracies.goalAccuracy}%</div>
        </CardContent>
      </Card>
      <Card className="flex-1 shadow-lg rounded-xl">
        <CardContent className="py-4 text-center">
          <div className="text-sm text-gray-500 mb-1">总体准确率</div>
          <div className="text-2xl font-bold text-purple-600">{accuracies.totalAccuracy}%</div>
        </CardContent>
      </Card>
    </div>
  );
}