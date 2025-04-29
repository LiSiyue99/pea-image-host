'use client';
import { PageHeader } from '../../components/ui/page-header';
import { SimulateDialoguePanel } from '../../components/simulate-dialogue/SimulateDialoguePanel';

export default function SimulateDialogue() {
  return (
    <div className="container mx-auto py-6 px-4">
      <PageHeader 
        title="模拟对话" 
        description="设置角色提示词，自动模拟教练与用户之间的对话"
      />
      <SimulateDialoguePanel />
    </div>
  );
} 