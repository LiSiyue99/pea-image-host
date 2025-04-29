'use client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import Link from "next/link";
import { BarChart3, MessageSquareText, BarChart2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  
  const features = [
    {
      title: "人类与AI结果评估比较",
      description: "比较人类与AI模型的评估结果差异",
      href: "/human-ai-comparison",
      icon: <BarChart3 className="h-8 w-8 text-blue-500" />
    },
    {
      title: "生成对话质量评估",
      description: "评估生成对话的质量与表现",
      href: "/dialogue-quality",
      icon: <BarChart2 className="h-8 w-8 text-green-500" />
    },
    {
      title: "模拟对话",
      description: "模拟不同场景下的人机对话",
      href: "/simulate-dialogue",
      icon: <MessageSquareText className="h-8 w-8 text-purple-500" />
    }
  ];
  
  const handleNavigate = (href: string) => {
    router.push(href);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-16 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3 text-gray-900">AI评估系统</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">全面的AI对话生成与评估平台，深入比较人类与AI模型的评估结果差异</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-xl transition-shadow border-t-4 border-t-primary">
              <CardHeader>
                <div className="mb-4">{feature.icon}</div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">{feature.description}</CardDescription>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  onClick={() => handleNavigate(feature.href)}
                >
                  进入功能
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}