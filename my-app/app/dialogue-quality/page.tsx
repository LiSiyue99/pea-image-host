'use client';
import { PageHeader } from '../../components/ui/page-header';
import { DialogueQualityPanel } from '../../components/dialogue-quality/DialogueQualityPanel';

export default function DialogueQuality() {
  return (
    <div className="container mx-auto py-6 px-4">
      <PageHeader 
        title="生成对话质量评估" 
        description="通过提示词生成对话，并评估对话质量"
      />
      <DialogueQualityPanel />
    </div>
  );
} 