import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EvalTabs({ tab, setTab }) {
  return (
    <Tabs value={tab} onValueChange={setTab} className="mb-4">
      <TabsList>
        <TabsTrigger value="empathy">共情+积极回应问卷</TabsTrigger>
        <TabsTrigger value="goal">目标一致性问卷</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}