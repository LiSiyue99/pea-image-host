import React, { useState } from "react";
import EvalTabs from "./EvalTabs";
import PromptSection from "./PromptSection";
import AccuracyCards from "./AccuracyCards";
import DialogueTable from "./DialogueTable";
// 这里暂时不引入详情卡片，后续补充
import mockData from "./mockData"; // 你可以先用原有的 mock 数据
import DetailPanel from "./DetailPanel";

export default function App() {
  const [tab, setTab] = useState("empathy");
  const [selectedDialogue, setSelectedDialogue] = useState(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-10 px-2">
      <div className="container mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold mb-6 text-center tracking-tight">人类与AI评估结果比较</h1>
        <EvalTabs tab={tab} setTab={setTab} />
        <PromptSection tab={tab} />
        <AccuracyCards tab={tab} data={mockData} />
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <DialogueTable
            tab={tab}
            data={mockData}
            onSelectDialogue={setSelectedDialogue}
          />
        </div>
        <DetailPanel
          open={!!selectedDialogue}
          dialogue={selectedDialogue}
          onClose={() => setSelectedDialogue(null)}
          tab={tab}
        />
      </div>
    </div>
  );
}
