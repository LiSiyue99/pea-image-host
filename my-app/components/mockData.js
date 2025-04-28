const needsEmpathyOptions = ['是', '否', '暂时不需要'];
const hasEmpathyOptions = ['是', '否'];
const empathyTargetOptions = ['家长', '孩子', '两个都要'];
const actualEmpathyTargetOptions = ['家长', '孩子', '两个都有'];
const emotionMatchOptions = ['是', '否'];
const empathyDegreeOptions = ['合适', '过深而共情夸大', '过浅而浮于表面'];
const needsPositiveRegardOptions = ['是', '否', '暂时不需要'];
const positiveRegardTargetOptions = ['家长', '孩子'];
const hasPositiveRegardOptions = ['是', '否'];
const actualPositiveRegardTargetOptions = ['家长', '孩子', '两个都有'];
const positiveRegardAccuracyOptions = ['是', '否'];

const dialogueExamples = [
  "家长：我实在是管不了他了，叛逆期太可怕了。教练：听起来这段时间和孩子的相处让你感到很困扰。能不能跟我具体说说最近发生了什么事让你这么担心？",
  "家长：他现在就知道玩游戏，我说了多少次了还是不听。教练：我能感受到你的担忧和焦虑。如果方便的话，能描述一下具体是什么游戏以及他玩游戏的频率和时长吗？",
  "家长：我们家老大从小就很乖，可是老二完全不一样，特别难管。教练：听起来你觉得两个孩子的差异很大，让你觉得教育老二特别有挑战。能跟我说说你觉得他们哪些方面最不同吗？",
  "家长：现在的孩子学习压力那么大，我也很心疼，但不逼他不行啊。教练：我理解你的矛盾心情，一方面不想给孩子压力，一方面又担心他输在起跑线上。能告诉我你的具体担忧吗？",
  "家长：我都不知道是不是我太焦虑了，学区房买了，辅导班报了，可她成绩还是上不去。教练：作为家长，你为孩子付出了很多，却没有看到预期的结果，这确实令人沮丧。你觉得孩子在学习上的主要困难是什么？",
  "家长：我告诉过他很多次了，做事情要有规划，不能拖到最后，他就是不听。教练：你希望孩子能学会更好的时间管理，这是很重要的能力。最近有什么具体的例子让你特别担忧的吗？",
  "家长：昨天又和女儿吵架了，我就是看她玩手机时间太长，提醒了一下，她就开始对我发脾气。教练：青少年情绪波动确实很大，类似的冲突会让你们的关系很紧张。能具体说说当时的场景吗？",
  "家长：他幼儿园老师说他上课注意力不集中，我很担心是不是多动症。教练：我能理解你的担忧，这个年龄的孩子确实活泼好动。除了老师的反馈，你在家里也观察到类似的情况吗？",
  "家长：我总觉得自己教育孩子的方式可能有问题，但又不知道该怎么改变。教练：反思自己的教育方式是很有勇气的。能具体说说你认为目前面临的最大挑战是什么吗？",
  "家长：青春期的孩子太难沟通了，动不动就说我不理解他。教练：青少年确实很渴望被理解，同时又在寻找自我认同。能描述一下最近一次你们之间的沟通困难吗？"
];

// 目标一致性相关选项
const mainPsychologyOptions = [true, false];
const mainConsensusOptions = [true, false];
const mainConfirmGoalOptions = [true, false];
const followupObjectiveOptions = [true, false];
const followupTimeboundOptions = [true, false];
const mainFocusOptions = [true, false];
const mainGoalChangedOptions = [true, false];
const followupDynamicAdjustOptions = [true, false];
const mainParticipationOptions = [true, false];

const empathyFieldOptionsMap = {
  r5_needs_empathy: needsEmpathyOptions,
  r5_empathy_target: empathyTargetOptions,
  r5_has_empathy: hasEmpathyOptions,
  r5_actual_empathy_target: actualEmpathyTargetOptions,
  r5_emotion_match: emotionMatchOptions,
  r5_empathy_degree: empathyDegreeOptions,
  r5_needs_positive_regard: needsPositiveRegardOptions,
  r5_positive_regard_target: positiveRegardTargetOptions,
  r5_has_positive_regard: hasPositiveRegardOptions,
  r5_actual_positive_regard_target: actualPositiveRegardTargetOptions,
  r5_positive_regard_accuracy: positiveRegardAccuracyOptions
};

// 目标一致性字段到选项的映射
const goalFieldOptionsMap = {
  main_psychology: mainPsychologyOptions,
  main_consensus: mainConsensusOptions,
  main_confirm_goal: mainConfirmGoalOptions,
  followup_objective: followupObjectiveOptions,
  followup_timebound: followupTimeboundOptions,
  main_focus: mainFocusOptions,
  main_goal_changed: mainGoalChangedOptions,
  followup_dynamic_adjust: followupDynamicAdjustOptions,
  main_participation: mainParticipationOptions
};

// 随机选项工具
function randomChoice(options) {
  const index = Math.floor(Math.random() * options.length);
  return options[index];
}

// 生成一条 mock 对话数据
function generateMockDialogue(id, dialogue) {
  // 共情相关
  function empathyMainFollowupCase() {
    return [
      {
        main: 'r5_has_empathy',
        followups: ['r5_actual_empathy_target', 'r5_emotion_match', 'r5_empathy_degree']
      },
      {
        main: 'r5_has_positive_regard',
        followups: ['r5_actual_positive_regard_target', 'r5_positive_regard_accuracy']
      }
    ];
  }

  const goalMainFollowupMap = [
    {
      main: 'main_confirm_goal',
      followups: ['followup_objective', 'followup_timebound']
    },
    {
      main: 'main_goal_changed',
      followups: ['followup_dynamic_adjust']
    }
  ];

  // --- 生成共情问卷 ---
  let empathyHumanEval = {}, empathyAIEval = {};
  Object.keys(empathyFieldOptionsMap).forEach(k => {
    empathyHumanEval[k] = randomChoice(empathyFieldOptionsMap[k]);
  });
  Object.keys(empathyHumanEval).forEach(k => {
    empathyAIEval[k] = Math.random() > 0.5 ? empathyHumanEval[k] : randomChoice(empathyFieldOptionsMap[k]);
  });
  // --- 分歧分支case ---
  if (Math.random() < 0.1) {
    const cases = empathyMainFollowupCase();
    const chosen = randomChoice(cases);
    // case1: 人类main为true，AI为false，AI followup全NA
    empathyHumanEval[chosen.main] = '是';
    empathyAIEval[chosen.main] = '否';
    chosen.followups.forEach(fk => {
      empathyAIEval[fk] = 'NA';
      empathyHumanEval[fk] = randomChoice(empathyFieldOptionsMap[fk]);
    });
  } else if (Math.random() < 0.1) {
    const cases = empathyMainFollowupCase();
    const chosen = randomChoice(cases);
    // case2: 人类main为否，AI为是，AI followup有值，人类followup全NA
    empathyHumanEval[chosen.main] = '否';
    empathyAIEval[chosen.main] = '是';
    chosen.followups.forEach(fk => {
      empathyHumanEval[fk] = 'NA';
      empathyAIEval[fk] = randomChoice(empathyFieldOptionsMap[fk]);
    });
  }

  // --- 生成目标一致性问卷 ---
  // main题
  let goalHumanEval = {}, goalAIEval = {};
  Object.keys(goalFieldOptionsMap).forEach(k => {
    goalHumanEval[k] = randomChoice(goalFieldOptionsMap[k]);
  });
  // followup题依赖main题
  goalHumanEval['followup_objective'] = goalHumanEval['main_confirm_goal'] ? randomChoice(goalFieldOptionsMap['followup_objective']) : 'NA';
  goalHumanEval['followup_timebound'] = goalHumanEval['main_confirm_goal'] ? randomChoice(goalFieldOptionsMap['followup_timebound']) : 'NA';
  goalHumanEval['followup_dynamic_adjust'] = goalHumanEval['main_goal_changed'] ? randomChoice(goalFieldOptionsMap['followup_dynamic_adjust']) : 'NA';

  // --- 分歧分支case ---
  if (Math.random() < 0.1) {
    // case1: 人类main为true，AI为false，AI followup全NA
    const chosen = randomChoice(goalMainFollowupMap);
    goalHumanEval[chosen.main] = true;
    goalAIEval = { ...goalHumanEval };
    goalAIEval[chosen.main] = false;
    chosen.followups.forEach(fk => {
      goalHumanEval[fk] = randomChoice(goalFieldOptionsMap[fk]);
      goalAIEval[fk] = 'NA';
    });
  } else if (Math.random() < 0.1) {
    // case2: 人类main为false，AI为true，AI followup有值，人类followup全NA
    const chosen = randomChoice(goalMainFollowupMap);
    goalHumanEval[chosen.main] = false;
    goalAIEval = { ...goalHumanEval };
    goalAIEval[chosen.main] = true;
    chosen.followups.forEach(fk => {
      goalHumanEval[fk] = 'NA';
      goalAIEval[fk] = randomChoice(goalFieldOptionsMap[fk]);
    });
  } else {
    // 正常生成AI评估
    Object.keys(goalFieldOptionsMap).forEach(k => {
      if (k.startsWith('followup_')) {
        // followup题依赖main题
        if (k === 'followup_objective' || k === 'followup_timebound') {
          goalAIEval[k] = goalAIEval['main_confirm_goal'] ? randomChoice(goalFieldOptionsMap[k]) : 'NA';
        } else if (k === 'followup_dynamic_adjust') {
          goalAIEval[k] = goalAIEval['main_goal_changed'] ? randomChoice(goalFieldOptionsMap[k]) : 'NA';
        }
      } else {
        goalAIEval[k] = Math.random() > 0.5 ? goalHumanEval[k] : randomChoice(goalFieldOptionsMap[k]);
      }
    });
  }

  // --- main-followup pair NA 逻辑修正 ---
  // 共情问卷
  [
    { main: 'r5_has_empathy', followups: ['r5_actual_empathy_target', 'r5_emotion_match', 'r5_empathy_degree'] },
    { main: 'r5_has_positive_regard', followups: ['r5_actual_positive_regard_target', 'r5_positive_regard_accuracy'] }
  ].forEach(pair => {
    if (empathyHumanEval[pair.main] !== '是') {
      pair.followups.forEach(fk => { empathyHumanEval[fk] = 'NA'; });
    }
    if (empathyAIEval[pair.main] !== '是') {
      pair.followups.forEach(fk => { empathyAIEval[fk] = 'NA'; });
    }
  });
  // 目标一致性问卷
  [
    { main: 'main_confirm_goal', followups: ['followup_objective', 'followup_timebound'] },
    { main: 'main_goal_changed', followups: ['followup_dynamic_adjust'] }
  ].forEach(pair => {
    if (!goalHumanEval[pair.main]) {
      pair.followups.forEach(fk => { goalHumanEval[fk] = 'NA'; });
    }
    if (!goalAIEval[pair.main]) {
      pair.followups.forEach(fk => { goalAIEval[fk] = 'NA'; });
    }
  });

  return {
    id,
    dialogue,
    empathyHumanEval,
    empathyAIEval,
    goalHumanEval,
    goalAIEval
  };
}

// 生成多条 mock 数据
const mockData = [];
for (let i = 0; i < 10; i++) {
  mockData.push(generateMockDialogue(`对话${i + 1}`, dialogueExamples[i % dialogueExamples.length]));
}

export default mockData;