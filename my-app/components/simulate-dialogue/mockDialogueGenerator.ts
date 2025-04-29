export interface DialogueMessage {
  role: 'coach' | 'user';
  content: string;
  timestamp: Date;
}

// 教练回应内容
const coachResponses: string[] = [
  "你能告诉我更多关于你目前面临的挑战吗？",
  "听起来这个情况对你来说很困扰。你认为背后的原因是什么？",
  "你提到了职业瓶颈，能具体描述一下你希望在哪些方面有所突破吗？",
  "我理解这种感受。你曾经尝试过什么方法来解决这个问题？",
  "这是个很好的观察。你认为什么样的改变对你当前的情况最有帮助？",
  "从你的描述中，我注意到你似乎对自己的方向不够确定。你最看重职业生活中的哪些方面？",
  "让我们一起探索一下可能的解决方案。如果没有任何限制，你理想中的职业发展是什么样子的？",
  "这个视角很有价值。你能否设想一下，六个月后的理想状态是什么样子？",
  "我想请你思考一下，你当前拥有哪些资源和优势可以帮助你实现这个目标？",
  "这是一个复杂的情况，但我相信我们能找到前进的方向。你愿意尝试一个新的思路吗？"
];

// 用户回应内容
const userResponses: string[] = [
  "我觉得自己在当前岗位已经停滞不前了，做了三年却没有什么新的挑战。",
  "是的，我想尝试新的方向，但又担心改变带来的风险和不确定性。",
  "我的主要困扰是不知道自己真正想要什么，有时候感觉只是在随波逐流。",
  "我曾经尝试过申请公司内部的其他职位，但没有成功。也参加了一些培训，但不确定它们是否真的有帮助。",
  "我最看重工作的意义感和能够不断学习的机会，但现在的工作越来越例行公事。",
  "如果没有限制，我可能会选择一个更有创造性的角色，或者能够直接看到自己工作成果的岗位。",
  "我希望六个月后能够明确自己的职业方向，并开始朝着那个方向迈进，哪怕是小步骤也好。",
  "你的建议很有启发性，让我重新思考了自己的优势和真正想要的东西。",
  "确实，我可能需要跳出舒适区，主动寻找和创造机会，而不是等待它们出现。",
  "谢谢你的指导，我会尝试按照我们讨论的方向去行动，希望能有所突破。"
];

/**
 * 根据当前对话状态，随机生成下一条消息
 */
export function getNextMessage(
  currentMessages: DialogueMessage[],
  isCoachTurn: boolean
): DialogueMessage {
  // 确定发言角色
  const role = isCoachTurn ? 'coach' : 'user';
  
  // 根据角色选择相应的回应库
  const responses = isCoachTurn ? coachResponses : userResponses;
  
  // 随机选择一条回应
  // 避免重复，如果有可能的话
  let availableResponses = [...responses];
  if (currentMessages.length > 0) {
    const usedResponses = currentMessages
      .filter(m => m.role === role)
      .map(m => m.content);
    
    // 过滤掉已使用的回应
    availableResponses = availableResponses.filter(r => !usedResponses.includes(r));
    
    // 如果所有回应都被使用过，则重新使用完整库
    if (availableResponses.length === 0) {
      availableResponses = [...responses];
    }
  }
  
  // 随机选择一条回应
  const randomIndex = Math.floor(Math.random() * availableResponses.length);
  const content = availableResponses[randomIndex];
  
  // 创建新消息
  return {
    role,
    content,
    timestamp: new Date()
  };
}

/**
 * 模拟生成对话的延迟时间
 */
export function getRandomDelay(): number {
  // 返回1500-4000毫秒之间的随机延迟
  return Math.floor(Math.random() * 2500) + 1500;
} 