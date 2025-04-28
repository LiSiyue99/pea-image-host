import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default function DialogueTable({ tab, data, onSelectDialogue }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>对话ID</TableHead>
          <TableHead>对话文本(部分)</TableHead>
          <TableHead>操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item, idx) => (
          <TableRow key={item.id || idx}>
            <TableCell>{item.id}</TableCell>
            <TableCell className="max-w-[400px] truncate">{item.dialogue}</TableCell>
            <TableCell>
              <Button size="sm" onClick={() => onSelectDialogue(item)}>
                展开
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}