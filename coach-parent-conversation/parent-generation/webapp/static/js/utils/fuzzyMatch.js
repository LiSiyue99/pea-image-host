/**
 * 高级中文模糊匹配工具
 * 结合字符重叠、子串检测和编辑距离算法，提供更准确的中文模糊匹配
 */

/**
 * 计算字符重叠得分
 * @param {string} searchTerm - 搜索词
 * @param {string} target - 目标字符串
 * @returns {number} 0-1之间的重叠得分
 */
function getCharacterOverlapScore(searchTerm, target) {
  if (!searchTerm || !target) return 0;
  
  const searchChars = [...searchTerm.toLowerCase()];
  const targetChars = [...target.toLowerCase()];
  
  let matchCount = 0;
  searchChars.forEach(char => {
    if (targetChars.includes(char)) matchCount++;
  });
  
  return searchChars.length ? matchCount / searchChars.length : 0;
}

/**
 * 检查子串关系并计算得分
 * @param {string} searchTerm - 搜索词
 * @param {string} target - 目标字符串
 * @returns {number} 子串得分 (0 或 0.8 或 1)
 */
function getSubstringScore(searchTerm, target) {
  if (!searchTerm || !target) return 0;
  
  const normalizedSearch = searchTerm.toLowerCase();
  const normalizedTarget = target.toLowerCase();
  
  // 完全匹配
  if (normalizedSearch === normalizedTarget) return 1;
  
  // 搜索词是目标的子串
  if (normalizedTarget.includes(normalizedSearch)) return 0.8;
  
  // 目标是搜索词的子串
  if (normalizedSearch.includes(normalizedTarget)) return 0.7;
  
  return 0;
}

/**
 * 计算编辑距离 (Levenshtein距离)
 * @param {string} a - 第一个字符串
 * @param {string} b - 第二个字符串
 * @returns {number} 编辑距离
 */
function getEditDistance(a, b) {
  if (!a || !b) return Math.max(a?.length || 0, b?.length || 0);
  
  const matrix = [];
  
  // 初始化矩阵
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }
  
  // 填充矩阵
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // 删除
        matrix[i][j - 1] + 1,      // 插入
        matrix[i - 1][j - 1] + cost // 替换
      );
    }
  }
  
  return matrix[a.length][b.length];
}

/**
 * 计算编辑距离得分
 * @param {string} searchTerm - 搜索词
 * @param {string} target - 目标字符串
 * @returns {number} 0-1之间的相似度得分
 */
function getEditDistanceScore(searchTerm, target) {
  if (!searchTerm || !target) return 0;
  
  const maxLen = Math.max(searchTerm.length, target.length);
  if (maxLen === 0) return 1;
  
  const distance = getEditDistance(searchTerm, target);
  
  // 编辑距离越小，得分越高
  return 1 - (distance / maxLen);
}

/**
 * 获取综合模糊匹配得分
 * @param {string} searchTerm - 搜索词
 * @param {string} target - 目标字符串
 * @returns {number} 0-1之间的综合得分
 */
function getFuzzyMatchScore(searchTerm, target) {
  const overlapScore = getCharacterOverlapScore(searchTerm, target);
  const substringScore = getSubstringScore(searchTerm, target);
  const editScore = getEditDistanceScore(searchTerm, target);
  
  // 加权平均
  return substringScore * 0.5 + overlapScore * 0.3 + editScore * 0.2;
}

/**
 * 主模糊匹配函数，用于搜索匹配
 * @param {string} searchTerm - 搜索词
 * @param {Object|Array} data - 要搜索的数据
 * @param {Object} options - 配置选项
 * @param {number} options.threshold - 匹配阈值，默认0.3
 * @param {number} options.limit - 最大结果数，默认5
 * @param {boolean} options.searchKeys - 是否搜索对象的键，默认true
 * @param {boolean} options.searchValues - 是否搜索对象的值，默认false
 * @returns {Array} 匹配结果数组
 */
function fuzzyMatch(searchTerm, data, options = {}) {
  const {
    threshold = 0.3,
    limit = 5,
    searchKeys = true,
    searchValues = false
  } = options;
  
  if (!searchTerm || !data) return [];
  
  const results = [];
  
  // 处理不同数据类型
  if (Array.isArray(data)) {
    // 如果是数组，直接检查每个项
    data.forEach(item => {
      const score = getFuzzyMatchScore(searchTerm, item);
      if (score >= threshold) {
        results.push({ item, score });
      }
    });
  } else if (typeof data === 'object') {
    // 如果是对象，可以检查键和/或值
    Object.entries(data).forEach(([key, value]) => {
      // 检查键
      if (searchKeys) {
        const keyScore = getFuzzyMatchScore(searchTerm, key);
        if (keyScore >= threshold) {
          results.push({ item: key, score: keyScore, value });
        }
      }
      
      // 检查值（字符串）
      if (searchValues && typeof value === 'string') {
        const valueScore = getFuzzyMatchScore(searchTerm, value);
        if (valueScore >= threshold) {
          results.push({ item: key, score: valueScore, value, matchedValue: true });
        }
      }
      
      // 递归检查嵌套对象/数组
      if (searchValues && (typeof value === 'object' && value !== null)) {
        try {
          // 尝试搜索嵌套对象
          const nestedResults = fuzzyMatch(searchTerm, value, {
            threshold,
            limit: Number.MAX_SAFE_INTEGER,
            searchKeys,
            searchValues
          });
          
          // 添加嵌套结果
          nestedResults.forEach(result => {
            results.push({
              item: key,
              nestedMatch: result.item,
              score: result.score * 0.8, // 嵌套匹配得分稍低
              value,
              matchedNested: true
            });
          });
        } catch (e) {
          // 忽略递归错误
        }
      }
    });
  }
  
  // 按分数排序结果并限制数量
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * 专门用于complain.json的模糊匹配
 * @param {string} searchTerm - 搜索词
 * @param {Array|Object} complainData - complain.json数据，可以是展平的字符串数组或原始对象
 * @param {number} limit - 最大结果数，默认5
 * @returns {Array} 匹配结果数组
 */
function matchComplainOptions(searchTerm, complainData, limit = 5) {
  // 如果输入是数组，使用简化版本的模糊匹配
  if (Array.isArray(complainData)) {
    const results = [];
    
    // 为每个选项计算模糊匹配分数
    complainData.forEach(option => {
      if (typeof option === 'string') {
        const score = getFuzzyMatchScore(searchTerm, option);
        if (score >= 0.3) { // 使用阈值过滤低质量匹配
          results.push({ item: option, score });
        }
      }
    });
    
    // 按照分数排序并返回前limit个结果
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(result => result.item);
  }
  
  // 以下是处理原始对象格式的代码（保留原有逻辑）
  // 对抱怨类别进行搜索
  const keyResults = fuzzyMatch(searchTerm, complainData, {
    threshold: 0.3,
    limit: limit * 2,
    searchKeys: true,
    searchValues: false
  });
  
  // 对定义进行搜索
  const defResults = [];
  Object.entries(complainData).forEach(([key, value]) => {
    if (value.definition) {
      const score = getFuzzyMatchScore(searchTerm, value.definition);
      if (score >= 0.3) {
        defResults.push({ item: key, score, matchedDefinition: true });
      }
    }
  });
  
  // 对例子进行搜索
  const exampleResults = [];
  Object.entries(complainData).forEach(([key, value]) => {
    if (value.examples && Array.isArray(value.examples)) {
      value.examples.forEach((example, index) => {
        const score = getFuzzyMatchScore(searchTerm, example);
        if (score >= 0.4) { // 对例子设置稍高的阈值
          exampleResults.push({ 
            item: key, 
            score: score * 0.7, // 例子匹配权重稍低
            matchedExample: index 
          });
        }
      });
    }
  });
  
  // 合并结果并排序
  const allResults = [...keyResults, ...defResults, ...exampleResults];
  
  // 按分数排序结果并限制数量
  return allResults
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(result => result.item); // 只返回选项名称
}

// 将这些函数添加到全局命名空间中，方便在非模块化环境中使用
window.FuzzySearch = { 
  fuzzyMatch,
  matchComplainOptions,
  getFuzzyMatchScore
}; 