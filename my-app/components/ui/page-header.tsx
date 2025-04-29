'use client';

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "./button";

interface PageHeaderProps {
  title: string;
  description?: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="flex flex-col items-start gap-4 mb-8">
      <Link href="/">
        <Button variant="ghost" size="sm" className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          返回首页
        </Button>
      </Link>
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
      </div>
    </div>
  );
} 