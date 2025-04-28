import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "../components/ui/dialog";
import ComparisonTable from "./ComparisonTable";
import { Button } from "../components/ui/button";

export default function DetailPanel({ open, dialogue, onClose, tab }) {
  if (!dialogue) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>详细评估结果（对话ID: {dialogue.id}）</DialogTitle>
          <DialogClose asChild>
            <Button variant="outline" size="sm" className="float-right">关闭</Button>
          </DialogClose>
        </DialogHeader>
        <div className="mb-4 font-mono text-sm text-gray-500">{dialogue.dialogue}</div>
        <ComparisonTable
          tab={tab}
          humanEval={tab === "empathy" ? dialogue.empathyHumanEval : dialogue.goalHumanEval}
          aiEval={tab === "empathy" ? dialogue.empathyAIEval : dialogue.goalAIEval}
        />
      </DialogContent>
    </Dialog>
  );
}