'use client';
import App from '../../components/App';
import { PageHeader } from '../../components/ui/page-header';

export default function HumanAIComparison() {
  return (
    <>
      <div className="container mx-auto py-6">
        <PageHeader 
          title="人类与AI评估结果比较" 
          description="比较人类与AI模型的评估结果差异"
        />
      </div>
      <App />
    </>
  );
} 