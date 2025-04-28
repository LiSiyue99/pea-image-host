// components/ComparisonTable.jsx
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../components/ui/table";
import { Badge } from "../components/ui/badge";

// 渲染一致性badge
function boolBadge(matched) {
  return (
    <Badge className={matched ? "bg-green-600" : "bg-red-600"}>
      {matched ? "true" : "false"}
    </Badge>
  );
}

/**
 * 根据 tab 动态渲染共情/目标一致性两套问卷内容
 * @param {string} tab - "empathy" 或 "goal"
 * @param {object} humanEval - 人类评估对象
 * @param {object} aiEval - AI 评估对象
 */
export default function ComparisonTable({ tab, humanEval, aiEval }) {
  if (!humanEval || !aiEval) return null;

  let rows = [];
  if (tab === "empathy") {
    rows = [
      { label: "是否需要共情?", human: humanEval.r5_needs_empathy, ai: aiEval.r5_needs_empathy, match: humanEval.r5_needs_empathy === aiEval.r5_needs_empathy },
      { label: "└─ 谁需要共情？", human: humanEval.r5_empathy_target, ai: aiEval.r5_empathy_target, match: humanEval.r5_empathy_target === aiEval.r5_empathy_target },
      { label: "是否使用了共情?", human: humanEval.r5_has_empathy, ai: aiEval.r5_has_empathy, match: humanEval.r5_has_empathy === aiEval.r5_has_empathy },
      { label: "└─ 实际共情对象是谁?", human: humanEval.r5_actual_empathy_target, ai: aiEval.r5_actual_empathy_target, match: humanEval.r5_actual_empathy_target === aiEval.r5_actual_empathy_target },
      { label: "└─ 共情回复和情绪是否一致？", human: humanEval.r5_emotion_match, ai: aiEval.r5_emotion_match, match: humanEval.r5_emotion_match === aiEval.r5_emotion_match },
      { label: "└─ 共情程度是否合适？", human: humanEval.r5_empathy_degree, ai: aiEval.r5_empathy_degree, match: humanEval.r5_empathy_degree === aiEval.r5_empathy_degree },
      { label: "是否需要积极关注?", human: humanEval.r5_needs_positive_regard, ai: aiEval.r5_needs_positive_regard, match: humanEval.r5_needs_positive_regard === aiEval.r5_needs_positive_regard },
      { label: "└─ 谁需要积极关注？", human: humanEval.r5_positive_regard_target, ai: aiEval.r5_positive_regard_target, match: humanEval.r5_positive_regard_target === aiEval.r5_positive_regard_target },
      { label: "是否使用了积极关注?", human: humanEval.r5_has_positive_regard, ai: aiEval.r5_has_positive_regard, match: humanEval.r5_has_positive_regard === aiEval.r5_has_positive_regard },
      { label: "└─ 积极关注对象是谁?", human: humanEval.r5_actual_positive_regard_target, ai: aiEval.r5_actual_positive_regard_target, match: humanEval.r5_actual_positive_regard_target === aiEval.r5_actual_positive_regard_target },
      { label: "└─ 积极关注对象是否准确?", human: humanEval.r5_positive_regard_accuracy, ai: aiEval.r5_positive_regard_accuracy, match: humanEval.r5_positive_regard_accuracy === aiEval.r5_positive_regard_accuracy },
    ];
  } else if (tab === "goal") {
    rows = [
      { label: "前15轮目标是否属于心理学范畴", human: humanEval.main_psychology, ai: aiEval.main_psychology, match: humanEval.main_psychology === aiEval.main_psychology },
      { label: "教练是否努力与家长达成目标共识", human: humanEval.main_consensus, ai: aiEval.main_consensus, match: humanEval.main_consensus === aiEval.main_consensus },
      { label: "教练是否和家长确认具体目标", human: humanEval.main_confirm_goal, ai: aiEval.main_confirm_goal, match: humanEval.main_confirm_goal === aiEval.main_confirm_goal },
      { label: "└─ 目标是否客观可评估", human: humanEval.followup_objective, ai: aiEval.followup_objective, match: humanEval.followup_objective === aiEval.followup_objective },
      { label: "└─ 目标能否在一定时间内达成", human: humanEval.followup_timebound, ai: aiEval.followup_timebound, match: humanEval.followup_timebound === aiEval.followup_timebound },
      { label: "教练是否成功聚焦收窄目标", human: humanEval.main_focus, ai: aiEval.main_focus, match: humanEval.main_focus === aiEval.main_focus },
      { label: "目标是否发生变化", human: humanEval.main_goal_changed, ai: aiEval.main_goal_changed, match: humanEval.main_goal_changed === aiEval.main_goal_changed },
      { label: "└─ 目标变化时能否动态协商调整", human: humanEval.followup_dynamic_adjust, ai: aiEval.followup_dynamic_adjust, match: humanEval.followup_dynamic_adjust === aiEval.followup_dynamic_adjust },
      { label: "来访者参与程度评价", human: humanEval.main_participation, ai: aiEval.main_participation, match: humanEval.main_participation === aiEval.main_participation },
    ];
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>问题</TableHead>
          <TableHead>人类评估</TableHead>
          <TableHead>AI评估</TableHead>
          <TableHead>一致性</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, idx) => (
          <TableRow key={idx}>
            <TableCell>{row.label}</TableCell>
            <TableCell>{row.human === undefined ? "N/A" : row.human === true ? "是" : row.human === false ? "否" : row.human}</TableCell>
            <TableCell>{row.ai === undefined ? "N/A" : row.ai === true ? "是" : row.ai === false ? "否" : row.ai}</TableCell>
            <TableCell>{boolBadge(row.match)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}