import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

const defaultPrompts = {
  empathy: "请你扮演心理学专家，评估对话中教练在第5轮和第10轮是否有共情和积极回应。评估标准包括是否需要共情，共情对象是谁，共情程度是否合适等。",
  goal: "请你扮演心理学专家，评估对话中教练与家长的目标是否一致。评估标准包括目标是否属于心理学范畴，教练是否努力达成共识，目标是否具体等。"
};

export default function PromptSection({ tab }) {
  const [prompt, setPrompt] = useState(defaultPrompts[tab]);

  useEffect(() => {
    setPrompt(defaultPrompts[tab]);
  }, [tab]);

  const handleRunEval = () => {
    alert(`运行${tab === "empathy" ? "共情" : "目标"}评估，Prompt内容：\n${prompt}`);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <h3 className="text-lg font-semibold">
          {tab === "empathy" ? "共情+积极回应问卷 - Prompt" : "目标一致性问卷 - Prompt"}
        </h3>
      </CardHeader>
      <CardContent>
        <textarea
          className="w-full min-h-[80px] p-2 border rounded mb-4"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
        />
        <Button onClick={handleRunEval}>
          运行{tab === "empathy" ? "共情" : "目标"}评估
        </Button>
      </CardContent>
    </Card>
  );
}