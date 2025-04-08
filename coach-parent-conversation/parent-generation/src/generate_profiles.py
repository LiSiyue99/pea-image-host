"""
generate_profiles.py 文件功能概述
这个脚本用于生成家庭档案的合成数据，以CSV格式输出。它根据各种配置选项来控制生成的数据分布，支持三种主要的数据生成策略：
固定值(fixed_values): 为特定列设置固定值，所有生成的记录在这些列中将具有相同的值。
精确分布(distributions): 严格按照指定比例生成数据，确保最终CSV中各选项出现的数量与预设比例完全一致。
目标百分比(target_percentages): 只需指定部分关键值的目标比例，其余未指定的选项将均分剩余比例。
主要工作流程如下：
加载配置文件和数据源JSON文件
验证配置的有效性
根据配置生成指定数量的档案数据
将生成的数据写入CSV文件
脚本的更新版本改进了分布生成机制，从使用随机选择改为确定性分配，确保生成的数据严格遵循指定的分布比例。这使得生成的数据集在相同配置下具有可重复性和一致性。
"""

import argparse
import csv
import json
import os
import random
import sys
from typing import Dict, List, Any, Optional, Tuple, TypedDict, Union
from datetime import datetime # 导入datetime模块
import math # 导入 math 用于 isclose 比较浮点数

# 定义CSV文件的列顺序 (与template.csv一致)
COLUMN_ORDER: List[str] = [
    "social_class",
    "child_period",
    "family_structure",
    "parenting",
    "complain",
    "child_gender",
    "parent_gender",
    "parent_personality",
    "child_personality",
    "parent_attachment",
    "child_attachment",
]

# 将CSV列名映射到对应的JSON文件名 (不含扩展名)
# 注意: gender, attachment 被多个列共享
COLUMN_TO_FILE_MAP: Dict[str, str] = {
    "social_class": "social_class",
    "child_period": "child_period",
    "family_structure": "family_structure",
    "parenting": "parenting",
    "complain": "complain",
    "child_gender": "gender",
    "parent_gender": "gender",
    "parent_personality": "parent_personality",
    "child_personality": "child_personality",
    "parent_attachment": "attachment",
    "child_attachment": "attachment",
}

# 类型别名，用于表示验证后的分布信息
DistributionTuple = Tuple[List[str], List[float]]
ValidatedDistributions = Dict[str, DistributionTuple]
TargetPercentagesTuple = Tuple[List[str], List[float]] # (Target Keys, Target Weights)
ValidatedTargetPercentages = Dict[str, TargetPercentagesTuple]

# 用于表示从JSON加载的原始数据源 (文件名 -> 选项列表)
DataSources = Dict[str, Union[Dict[str, Any], List[Any]]]

# 定义配置文件的结构 (用于类型提示和验证)
class GenerationConfig(TypedDict, total=False):
    num_profiles: int               # 必需
    output_dir: str                 # 可选, 默认 "../output"
    filename_prefix: Optional[str]  # 可选, 默认 None
    profile_sources_dir: str        # 可选, 默认 "../parent-profile"
    fixed_values: Optional[Dict[str, str]]           # 可选
    distributions: Optional[Dict[str, Dict[str, float]]] # 可选
    target_percentages: Optional[Dict[str, Dict[str, float]]] # 新增

def load_json_options(file_path: str) -> Union[Dict[str, Any], List[Any]]:
    """
    加载单个JSON源文件并返回其内容。
    
    读取指定的JSON文件，并根据其顶层结构返回相应的数据类型。
    支持字典或列表类型的JSON文件。
    对于complain.json，保留其原始的键值对结构。
    
    Args:
        file_path: JSON文件的完整路径
        
    Returns:
        Dict[str, Any]或List[Any]: 加载的JSON数据
        
    Raises:
        FileNotFoundError: 文件不存在
        JSONDecodeError: JSON格式无效
        ValueError: JSON结构不符合预期或文件为空
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
            # 检查数据类型并验证非空
            if isinstance(data, dict):
                if not data:
                    raise ValueError(f"字典文件 {file_path} 为空")
                return data  # 直接返回整个字典
                
            elif isinstance(data, list):
                if not data:
                    raise ValueError(f"列表文件 {file_path} 为空")
                return data  # 返回列表
                
            else:
                raise ValueError(f"无法识别的JSON顶层结构在 {file_path}")
                
    except FileNotFoundError:
        print(f"错误: 文件 '{file_path}' 未找到。", file=sys.stderr)
        raise
    except json.JSONDecodeError:
        print(f"错误: 解析JSON文件 '{file_path}' 失败，请检查格式。", file=sys.stderr)
        raise
    except ValueError as e:
        print(f"错误: 处理JSON文件 '{file_path}' 时出错: {e}", file=sys.stderr)
        raise

def validate_basic_config(config_data: Dict[str, Any]) -> Optional[GenerationConfig]:
    """
    验证配置文件的基本结构和必填字段。
    
    Args:
        config_data: 从配置文件加载的原始数据
        
    Returns:
        Optional[GenerationConfig]: 验证通过的基本配置，失败则返回None
    """
    # 验证顶层结构
    if not isinstance(config_data, dict):
        print(f"错误: 配置文件的顶层必须是一个字典。", file=sys.stderr)
        return None

    # 验证必需字段
    if 'num_profiles' not in config_data:
        print(f"错误: 配置文件缺少必需字段 'num_profiles'。", file=sys.stderr)
        return None
        
    if not isinstance(config_data['num_profiles'], int) or config_data['num_profiles'] <= 0:
        print(f"错误: 'num_profiles' 必须是一个正整数。", file=sys.stderr)
        return None

    # 设置默认值
    validated_config: GenerationConfig = {
        'num_profiles': config_data['num_profiles'],
        'output_dir': config_data.get('output_dir', '../output'),
        'filename_prefix': config_data.get('filename_prefix'),  # None if not present
        'profile_sources_dir': config_data.get('profile_sources_dir', '../parent-profile'),
        'fixed_values': config_data.get('fixed_values'),  # None if not present
        'distributions': config_data.get('distributions'),  # None if not present
        'target_percentages': config_data.get('target_percentages'),  # None if not present
    }
    
    # 验证字段类型
    if validated_config['output_dir'] and not isinstance(validated_config['output_dir'], str):
        print(f"错误: 'output_dir' 必须是一个字符串。", file=sys.stderr)
        return None
        
    if validated_config['filename_prefix'] is not None and not isinstance(validated_config['filename_prefix'], str):
        print(f"错误: 'filename_prefix' 必须是一个字符串。", file=sys.stderr)
        return None
        
    if validated_config['profile_sources_dir'] and not isinstance(validated_config['profile_sources_dir'], str):
        print(f"错误: 'profile_sources_dir' 必须是一个字符串。", file=sys.stderr)
        return None
        
    if validated_config['fixed_values'] is not None and not isinstance(validated_config['fixed_values'], dict):
        print(f"错误: 'fixed_values' 必须是一个字典。", file=sys.stderr)
        return None
        
    if validated_config['distributions'] is not None and not isinstance(validated_config['distributions'], dict):
        print(f"错误: 'distributions' 必须是一个字典。", file=sys.stderr)
        return None
        
    if validated_config['target_percentages'] is not None and not isinstance(validated_config['target_percentages'], dict):
        print(f"错误: 'target_percentages' 必须是一个字典。", file=sys.stderr)
        return None
        
    return validated_config


def validate_fixed_values(config: GenerationConfig, data_sources: DataSources) -> bool:
    """
    验证fixed_values配置是否有效。
    
    Args:
        config: 基本配置
        data_sources: 数据源
        
    Returns:
        bool: 验证是否通过
    """
    if not config['fixed_values']:
        return True
        
    for column, fixed_key in config['fixed_values'].items():
        # 验证列名
        if column not in COLUMN_ORDER:
            print(f"警告: fixed_values 列名 {column} 无效")
            continue
            
        # 验证值类型
        if not isinstance(fixed_key, str):
            print(f"错误: fixed_values 值 {fixed_key} 必须是字符串")
            return False

        # 验证键是否存在于数据源中
        file_key = COLUMN_TO_FILE_MAP.get(column)
        if file_key and file_key in data_sources:
            source_data = data_sources[file_key]
            if isinstance(source_data, dict) and column != 'complain':
                if fixed_key not in source_data:
                    print(f"警告: fixed_values 中列 '{column}' 的键 '{fixed_key}' "
                          f"不在源文件 '{file_key}.json' 的键集合中: {list(source_data.keys())}")
    
    return True


def validate_distributions(config: GenerationConfig, 
                          data_sources: DataSources) -> Optional[ValidatedDistributions]:
    """
    验证distributions配置，将原始字典转换为经过验证的元组格式。
    
    Args:
        config: 基本配置
        data_sources: 数据源
        
    Returns:
        Optional[ValidatedDistributions]: 验证通过的分布配置，失败则返回None
    """
    if not config['distributions']:
        return None
        
    processed_distributions: ValidatedDistributions = {}
    is_dist_valid = True
    
    for column, dist_dict in config['distributions'].items():
        # 验证列名
        if column not in COLUMN_ORDER:
            print(f"警告: distributions 列名 {column} 无效")
            continue
            
        # 验证分布字典
        if not isinstance(dist_dict, dict) or not dist_dict:
            print(f"错误: distributions 值必须是非空字典")
            is_dist_valid = False
            continue

        # 提取键和权重
        options_in_dist_keys = list(dist_dict.keys())
        weights_in_dist = list(dist_dict.values())

        # 验证权重类型和范围
        if not all(isinstance(w, (int, float)) for w in weights_in_dist):
            print(f"错误: distributions {column} 包含非数字比例")
            is_dist_valid = False
            continue
            
        weights_float = [float(w) for w in weights_in_dist]
        if not all(0.0 <= w <= 1.0 for w in weights_float):
            print(f"错误: distributions {column} 比例不在[0,1]")
            is_dist_valid = False
            continue

        # 验证数据源
        file_key = COLUMN_TO_FILE_MAP.get(column)
        if not file_key or file_key not in data_sources:
            print(f"错误: 无法找到列 '{column}' 的源数据")
            is_dist_valid = False
            continue

        source_data = data_sources[file_key]
        
        # 特殊处理complain列
        if column == 'complain':
            # complain源数据应该是字典
            if not isinstance(source_data, dict):
                print(f"错误: 列 '{column}' 的源数据不是字典格式，无法应用分布配置。", file=sys.stderr)
                is_dist_valid = False
                continue
            
            # 验证键是否在源数据中存在
            valid_source_keys = list(source_data.keys())
            invalid_keys_in_config = [key for key in options_in_dist_keys if key not in valid_source_keys]
            if invalid_keys_in_config:
                print(f"错误: distributions 中列 '{column}' 包含无效键: {invalid_keys_in_config}。"
                      f" 有效键为: {valid_source_keys}，跳过此列。", file=sys.stderr)
                is_dist_valid = False
                continue
        
        # 处理其他列（字典类型数据源）
        elif not isinstance(source_data, dict):
            print(f"错误: 列 '{column}' 的源数据不是字典格式，无法应用分布配置。", file=sys.stderr)
            is_dist_valid = False
            continue
            
        # 验证键存在于源数据中
        valid_source_keys = list(source_data.keys())
        invalid_keys_in_config = [key for key in options_in_dist_keys if key not in valid_source_keys]
        if invalid_keys_in_config:
            print(f"错误: distributions 中列 '{column}' 包含无效键: {invalid_keys_in_config}。"
                 f" 有效键为: {valid_source_keys}，跳过此列。", file=sys.stderr)
            is_dist_valid = False
            continue

        # 验证权重和为1
        total_weight = sum(weights_float)
        if not math.isclose(total_weight, 1.0, rel_tol=1e-9):
            print(f"错误: distributions {column} 比例和不为1")
            is_dist_valid = False
            continue

        # 保存处理后的分布
        processed_distributions[column] = (options_in_dist_keys, weights_float)

    if not is_dist_valid:
        return None
        
    return processed_distributions


def validate_target_percentages(config: GenerationConfig, 
                               data_sources: DataSources) -> Optional[ValidatedTargetPercentages]:
    """
    验证target_percentages配置，将原始字典转换为经过验证的元组格式。
    
    Args:
        config: 基本配置
        data_sources: 数据源
        
    Returns:
        Optional[ValidatedTargetPercentages]: 验证通过的目标百分比配置，失败则返回None
    """
    if not config['target_percentages']:
        return None
        
    processed_targets: ValidatedTargetPercentages = {}
    is_target_valid = True
    
    for column, target_dict in config['target_percentages'].items():
        # 验证列名
        if column not in COLUMN_ORDER:
            print(f'警告: target_percentages 列名 {column} 无效')
            continue
            
        # 验证目标字典
        if not isinstance(target_dict, dict) or not target_dict:
            print(f'错误: target_percentages 值必须是非空字典')
            is_target_valid = False
            continue

        # 提取键和权重
        target_keys = list(target_dict.keys())
        target_weights = list(target_dict.values())

        # 验证权重类型和范围
        if not all(isinstance(w, (int, float)) for w in target_weights):
            print(f'错误: target_percentages {column} 包含非数字比例')
            is_target_valid = False
            continue
            
        weights_float = [float(w) for w in target_weights]
        if not all(0.0 <= w <= 1.0 for w in weights_float):
            print(f'错误: target_percentages {column} 比例不在[0,1]')
            is_target_valid = False
            continue

        # 验证权重总和不超过1
        total_target_weight = sum(weights_float)
        if total_target_weight > 1.0 and not math.isclose(total_target_weight, 1.0, rel_tol=1e-9):
            print(f"错误: target_percentages {column} 比例和大于1")
            is_target_valid = False
            continue

        # 验证数据源
        file_key = COLUMN_TO_FILE_MAP.get(column)
        if not file_key or file_key not in data_sources:
            print(f'错误: 无法找到列 {column} 的源数据')
            is_target_valid = False
            continue
            
        # 特殊处理complain列
        if column == 'complain':
            if not isinstance(data_sources[file_key], dict):
                print(f'错误: 无法验证 {column} 列的target_percentages，期望源数据为字典格式')
                is_target_valid = False
                continue
                
            source_keys = list(data_sources[file_key].keys())
            invalid_keys = [k for k in target_keys if k not in source_keys]
            if invalid_keys:
                print(f'错误: target_percentages 中列 {column} 包含无效键: {invalid_keys}。有效键为: {source_keys}')
                is_target_valid = False
                continue
        
        # 处理其他列（字典类型数据源）
        elif not isinstance(data_sources[file_key], dict):
            print(f'错误: 无法验证 {column} 列的target_percentages，源数据格式无效')
            is_target_valid = False
            continue
            
        # 验证键存在于源数据中
        source_keys = list(data_sources[file_key].keys())
        invalid_keys = [k for k in target_keys if k not in source_keys]
        if invalid_keys:
            print(f'错误: target_percentages 中列 {column} 包含无效键: {invalid_keys}。有效键为: {source_keys}')
            is_target_valid = False
            continue

        # 保存处理后的目标百分比
        processed_targets[column] = (target_keys, weights_float)

    if not is_target_valid:
        return None
        
    return processed_targets


def load_and_validate_config(config_path: str, data_sources: DataSources) -> Optional[GenerationConfig]:
    """
    加载、验证并设置配置文件的默认值。

    Args:
        config_path: 配置文件的路径。
        data_sources: 已加载的原始选项数据源，用于验证配置中的选项。

    Returns:
        经过验证和填充默认值的配置字典，如果失败则返回 None。
    """
    # 加载配置文件
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config_data = json.load(f)
    except FileNotFoundError:
        print(f"错误: 主配置文件 '{config_path}' 未找到。", file=sys.stderr)
        return None
    except json.JSONDecodeError:
        print(f"错误: 解析主配置文件 '{config_path}' 失败，请检查JSON格式。", file=sys.stderr)
        return None

    # 验证基本配置
    validated_config = validate_basic_config(config_data)
    if validated_config is None:
        return None
        
    # 验证fixed_values
    if not validate_fixed_values(validated_config, data_sources):
        return None
        
    # 验证distributions
    processed_distributions = validate_distributions(validated_config, data_sources)
    if validated_config['distributions'] and processed_distributions is None:
        return None
    if processed_distributions:
        validated_config['distributions_processed'] = processed_distributions
        
    # 验证target_percentages
    processed_targets = validate_target_percentages(validated_config, data_sources)
    if validated_config['target_percentages'] and processed_targets is None:
        return None
    if processed_targets:
        validated_config['target_percentages_processed'] = processed_targets

    return validated_config

def parse_arguments() -> argparse.Namespace:
    """解析命令行参数，现在只包含 --config。"""
    parser = argparse.ArgumentParser(description="根据统一配置文件生成家庭档案合成数据CSV文件。")
    parser.add_argument("--config", type=str, required=True,
                        help="指定包含所有生成参数的JSON配置文件的路径。")
    return parser.parse_args()

def calculate_full_distribution_from_targets(
    column: str,
    target_keys: List[str], 
    target_weights: List[float],
    data_sources: DataSources,
    column_to_file_map: Dict[str, str]
) -> Optional[DistributionTuple]:
    """
    根据目标百分比配置计算完整的概率分布。
    
    从目标百分比计算出覆盖所有可能值的完整分布，未指定的值会均分剩余概率。
    
    Args:
        column: 列名
        target_keys: 目标键列表
        target_weights: 目标权重列表
        data_sources: 数据源
        column_to_file_map: 列名到文件名的映射
        
    Returns:
        Optional[DistributionTuple]: 键和权重的元组，或在计算失败时返回None
    """
    file_key = column_to_file_map.get(column)
    
    # 验证数据源
    if not file_key or file_key not in data_sources:
        print(f"错误: 计算列 {column} 的目标分布时找不到源数据")
        return None
        
    source_data = data_sources[file_key]
    
    # 根据数据类型获取所有可能的键
    if isinstance(source_data, dict):
        all_source_keys = list(source_data.keys())
    else:
        print(f"错误: 列 {column} 的源数据格式无效，无法计算分布")
        return None
        
    # 如果源数据为空，无法计算分布
    if not all_source_keys:
        print(f"错误: 列 {column} 的源数据为空，无法计算分布")
        return None
        
    # 计算未指定键的剩余概率
    other_keys = [key for key in all_source_keys if key not in target_keys]
    total_target_prob = sum(target_weights)
    remaining_prob = 1.0 - total_target_prob
    
    # 准备最终的键和权重列表
    final_keys = list(target_keys)
    final_weights = list(target_weights)
    
    # 处理剩余概率
    if remaining_prob > 1e-9 and other_keys:
        # 有剩余概率且有其他键，均分剩余概率
        prob_per_other = remaining_prob / len(other_keys)
        final_keys.extend(other_keys)
        final_weights.extend([prob_per_other] * len(other_keys))
    elif remaining_prob > 1e-9 and not other_keys:
        # 有剩余概率但没有其他键，需要归一化现有权重
        print(f"警告: 列 {column} 的目标百分比和为 {total_target_prob}，但已覆盖所有键。正在归一化。")
        if total_target_prob <= 0:
            return None  # 无法归一化
        normalization_factor = 1.0 / total_target_prob
        final_weights = [w * normalization_factor for w in target_weights]
    elif remaining_prob <= 1e-9 and other_keys:
        # 无剩余概率但有未覆盖的键，将它们设为0权重
        print(f"警告: 列 {column} 的目标百分比和为1，忽略其他键: {other_keys}")
        final_keys.extend(other_keys)
        final_weights.extend([0.0] * len(other_keys))
        
    # 最终验证和归一化
    if final_keys and final_weights and len(final_keys) == len(final_weights):
        # 确保权重和为1
        current_sum = sum(final_weights)
        if not math.isclose(current_sum, 1.0):
            if current_sum <= 0:
                return None  # 无法归一化
            norm_factor = 1.0 / current_sum
            final_weights = [w * norm_factor for w in final_weights]
        return (final_keys, final_weights)
    else:
        print(f"错误: 无法为列 {column} 从目标百分比构建完整分布")
        return None


def calculate_all_distributions_from_targets(
    target_percentages: ValidatedTargetPercentages,
    data_sources: DataSources,
    column_to_file_map: Dict[str, str]
) -> Dict[str, DistributionTuple]:
    """
    计算所有列的完整概率分布。
    
    Args:
        target_percentages: 目标百分比配置
        data_sources: 数据源
        column_to_file_map: 列名到文件名的映射
        
    Returns:
        Dict[str, DistributionTuple]: 列名到完整分布的映射
    """
    full_distributions: Dict[str, DistributionTuple] = {}
    
    for column, (target_keys, target_weights) in target_percentages.items():
        distribution = calculate_full_distribution_from_targets(
            column, target_keys, target_weights, data_sources, column_to_file_map
        )
        if distribution:
            full_distributions[column] = distribution
            
    return full_distributions


def select_key_for_column(
    column: str,
    fixed_values: Dict[str, str],
    distributions: ValidatedDistributions,
    full_target_distributions: Dict[str, DistributionTuple],
    data_sources: DataSources,
    column_to_file_map: Dict[str, str]
) -> Optional[str]:
    """
    为指定列选择一个键。
    
    根据不同的配置策略（固定值、分布或随机）为列选择一个键。
    
    Args:
        column: 列名
        fixed_values: 固定值配置
        distributions: 分布配置
        full_target_distributions: 从目标百分比计算的完整分布
        data_sources: 数据源
        column_to_file_map: 列名到文件名的映射
        
    Returns:
        Optional[str]: 选择的键，或在无法选择时返回None
    """
    # 策略1: 使用固定值
    if column in fixed_values:
        return fixed_values[column]
        
    # 策略2: 使用分布
    elif column in distributions:
        try:
            population_keys, weights = distributions[column]
            return random.choices(population=population_keys, weights=weights, k=1)[0]
        except Exception as e:
            print(f"错误: 应用列 {column} 的分布时失败: {e}")
            
    # 策略3: 使用目标百分比
    elif column in full_target_distributions:
        try:
            population_keys, weights = full_target_distributions[column]
            return random.choices(population=population_keys, weights=weights, k=1)[0]
        except Exception as e:
            print(f"错误: 应用列 {column} 的目标分布时失败: {e}")
            
    # 策略4: 随机选择
    file_key = column_to_file_map.get(column)
    if file_key and file_key in data_sources:
        source_data = data_sources[file_key]
        try:
            if isinstance(source_data, dict) and source_data:
                valid_keys = list(source_data.keys())
                if valid_keys:
                    return random.choice(valid_keys)
            elif isinstance(source_data, list) and source_data:
                return random.choice(source_data)
        except Exception as e:
            print(f"错误: 随机选择列 {column} 的值时失败: {e}")
            
    return None


def get_value_for_key(
    column: str, 
    key: str, 
    data_sources: DataSources,
    column_to_file_map: Dict[str, str]
) -> Optional[Any]:
    """
    根据键获取对应的值。
    
    Args:
        column: 列名
        key: 键
        data_sources: 数据源
        column_to_file_map: 列名到文件名的映射
        
    Returns:
        Optional[Any]: 找到的值，或在未找到时返回None
    """
    if key is None:
        return None
        
    file_key = column_to_file_map.get(column)
    if not file_key or file_key not in data_sources:
        return None
        
    source_data = data_sources[file_key]
    
    # 对于complain列，需要查找键对应的值
    if column == 'complain':
        if isinstance(source_data, dict):
            value = source_data.get(key)
            if value is None:
                print(f"警告: complain键 {key} 在源数据中未找到对应值")
            return value
        else:
            print(f"警告: complain源数据格式异常，期望字典格式")
            return key  # 回退方案
            
    # 对于其他列
    if isinstance(source_data, dict):
        value = source_data.get(key)
        if value is None:
            print(f"警告: 键 {key} 在列 {column} 的源数据中未找到")
        return value
    elif isinstance(source_data, list):
        return key if key in source_data else None
        
    return None


def generate_profile_data(
    num_profiles: int,
    data_sources: DataSources,
    fixed_values: Optional[Dict[str, str]],
    distributions: Optional[ValidatedDistributions],
    target_percentages: Optional[ValidatedTargetPercentages],
    column_order: List[str],
    column_to_file_map: Dict[str, str]
) -> List[Dict[str, Any]]:
    """
    生成指定数量的档案数据。
    
    根据配置生成指定数量的档案数据，每个档案包含所有列的值。
    优先使用固定值配置，其次是分布配置，再次是目标百分比配置。
    对于distribution，使用确定性分配而非随机选择，确保生成的数据严格按照指定的比例分布。
    对于target_percentages：
    - 对指定的键按照目标百分比确定性地生成固定数量
    - 对未指定的键（剩余部分）使用随机分配，被指定的键不参与随机生成
    对于未配置的列，使用随机选择。
    
    Args:
        num_profiles: 要生成的档案数量
        data_sources: 数据源
        fixed_values: 固定值配置，可选
        distributions: 分布配置，可选
        target_percentages: 目标百分比配置，可选
        column_order: 列的顺序
        column_to_file_map: 列名到文件名的映射
        
    Returns:
        List[Dict[str, Any]]: 生成的档案数据列表
    """
    # 初始化配置
    effective_fixed_values = fixed_values or {}
    effective_distributions = distributions or {}
    effective_target_percentages = target_percentages or {}
    
    # 预计算目标百分比的完整分布
    full_distributions_from_targets = calculate_all_distributions_from_targets(
        effective_target_percentages, data_sources, column_to_file_map
    )
    
    # 预先计算每个分布值的确切数量和预分配序列
    column_to_values_sequence = {}
    column_to_remaining_data = {}  # 存储target_percentages中需要随机生成的数据
    
    # 处理distributions (完全确定性分配)
    for column, (keys, weights) in effective_distributions.items():
        counts = []
        remaining = num_profiles
        
        # 为每个选项计算确切的出现次数
        for i in range(len(keys) - 1):
            # 向下取整以确保总和不超过num_profiles
            count = int(weights[i] * num_profiles)
            counts.append(count)
            remaining -= count
            
        # 最后一个选项获得剩余的所有数量，以确保总和为num_profiles
        counts.append(remaining)
        
        # 生成确定性序列
        sequence = []
        for key, count in zip(keys, counts):
            sequence.extend([key] * count)
            
        column_to_values_sequence[column] = sequence
    
    # 处理target_percentages
    for column in effective_target_percentages:
        if column in column_to_values_sequence:
            continue  # distributions优先级更高
        
        # 获取原始的target_percentages数据
        target_keys, target_weights = effective_target_percentages[column]
        
        # 计算确定性分配的数量
        counts = []
        allocated = 0
        for weight in target_weights:
            count = int(weight * num_profiles)
            counts.append(count)
            allocated += count
        
        # 生成指定键的确定性序列
        sequence = [None] * num_profiles  # 预先分配空间
        idx = 0
        for key, count in zip(target_keys, counts):
            for _ in range(count):
                sequence[idx] = key
                idx += 1
        
        # 获取所有可能的键（从数据源）
        file_key = column_to_file_map.get(column)
        if not file_key or file_key not in data_sources:
            continue
            
        source_data = data_sources[file_key]
        if not isinstance(source_data, dict):
            continue
            
        # 找出未指定的键（用于随机填充）
        all_keys = list(source_data.keys())
        specified_keys_set = set(target_keys)
        unspecified_keys = [k for k in all_keys if k not in specified_keys_set]
        
        # 存储需要随机填充的信息
        remaining_count = num_profiles - allocated
        column_to_values_sequence[column] = sequence
        column_to_remaining_data[column] = (allocated, unspecified_keys)
    
    # 生成档案，使用预计算的序列加随机填充
    generated_data = []
    for i in range(num_profiles):
        profile = {}
        
        # 为每一列选择值
        for column in column_order:
            # 1. 优先使用固定值
            if column in effective_fixed_values:
                selected_key = effective_fixed_values[column]
            
            # 2. 使用预计算的确定性序列
            elif column in column_to_values_sequence:
                if column in effective_distributions:
                    # 对于 distributions 配置的列，直接使用预分配的序列
                    selected_key = column_to_values_sequence[column][i]
                elif column in column_to_remaining_data:
                    # 对于 target_percentages 配置的列，需要处理随机填充
                    start_idx, unspecified_keys = column_to_remaining_data[column]
                    if i >= start_idx:  # 如果当前索引大于等于起始索引，说明需要随机填充
                        if unspecified_keys:
                            # 只从未指定的键中随机选择
                            selected_key = random.choice(unspecified_keys)
                        else:
                            # 极少情况：没有未指定的键，使用None
                            selected_key = None
                    else:
                        # 使用预分配的值
                        selected_key = column_to_values_sequence[column][i]
            
            # 3. 完全随机选择（用于未指定的列）
            else:
                selected_key = select_random_key(column, data_sources, column_to_file_map)
            
            # 查找对应的值
            final_value = get_value_for_key(column, selected_key, data_sources, column_to_file_map)
            
            # 添加到档案
            profile[column] = final_value
            
        # 添加完整的档案
        generated_data.append(profile)
        
    return generated_data

def select_random_key(column, data_sources, column_to_file_map):
    """
    为未指定分布的列随机选择一个键。
    
    这个函数用于那些既没有固定值，也没有分布配置，
    也没有目标百分比配置的列，采用完全随机选择。
    
    Args:
        column: 列名
        data_sources: 数据源
        column_to_file_map: 列名到文件名的映射
        
    Returns:
        Optional[str]: 随机选择的键，或在选择失败时返回None
    """
    file_key = column_to_file_map.get(column)
    if file_key and file_key in data_sources:
        source_data = data_sources[file_key]
        try:
            if isinstance(source_data, dict) and source_data:
                return random.choice(list(source_data.keys()))
            elif isinstance(source_data, list) and source_data:
                return random.choice(source_data)
        except Exception as e:
            print(f"错误: 随机选择列 {column} 的值时失败: {e}")
    return None

def write_csv(output_file: str, data: List[Dict[str, Any]], fieldnames: List[str]):
    """
    将数据写入CSV文件。

    Args:
        output_file: 输出CSV文件的路径。
        data: 要写入的数据列表（字典列表）。
        fieldnames: CSV文件的表头（列名列表），决定列的顺序。
    """
    try:
        # 确保输出目录存在
        output_dir = os.path.dirname(output_file)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir)
            print(f"创建输出目录: {output_dir}")

        with open(output_file, 'w', newline='', encoding='utf-8-sig') as csvfile: # 使用 utf-8-sig 确保BOM头
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(data)
        print(f"成功将 {len(data)} 条数据写入到 {output_file}")

    except IOError as e:
        print(f"错误: 写入文件 '{output_file}' 时发生错误: {e}", file=sys.stderr)
    except Exception as e:
        print(f"错误: 写入CSV时发生意外错误: {e}", file=sys.stderr)

def load_data_sources(directory_path: str, required_files: set) -> DataSources:
    """
    加载所有所需的数据源文件。
    
    从指定目录加载所有必需的JSON文件，并返回包含所有数据的映射。
    
    Args:
        directory_path: 包含数据源文件的目录路径
        required_files: 需要加载的文件名集合(不含扩展名)
        
    Returns:
        DataSources: 文件名到数据内容的映射
        
    Raises:
        Exception: 加载过程中的任何错误
    """
    data_sources: DataSources = {}
    
    try:
        for file_key in required_files:
            file_path = os.path.join(directory_path, f"{file_key}.json")
            data_sources[file_key] = load_json_options(file_path)
        return data_sources
    except Exception as e:
        print(f"错误: 加载源数据时失败: {e}", file=sys.stderr)
        raise

def generate_output_filename(
    fixed_values: Optional[Dict[str, str]],
    distributions: Optional[ValidatedDistributions],
    target_percentages: Optional[ValidatedTargetPercentages],
    filename_prefix: Optional[str],
    column_order: List[str]
) -> str:
    """
    生成输出文件名。
    
    根据配置生成描述性文件名，包括配置类型和时间戳。
    
    Args:
        fixed_values: 固定值配置
        distributions: 分布配置
        target_percentages: 目标百分比配置
        filename_prefix: 文件名前缀
        column_order: 列顺序，用于验证固定值的列名
        
    Returns:
        str: 生成的文件名
    """
    # 确定配置类型和相关部分
    filename_parts = []
    config_type_used = "all_random"  # 默认
    
    # 固定值优先级最高
    if fixed_values:
        config_type_used = "fixed"
        sorted_fixed = sorted(fixed_values.items())
        for col, key_val in sorted_fixed:
            if col in column_order:
                filename_parts.append(f"{col}-{key_val.replace(' ', '_')}")
    # 其次是分布
    elif distributions:
        config_type_used = "distribution"
    # 最后是目标百分比
    elif target_percentages:
        config_type_used = "target_percent"
    
    # 构建文件名固定部分
    if not filename_parts and config_type_used != "all_random":
        # 如果没有特定部分但使用了配置，使用类型名作为标识符
        fixed_part_str = config_type_used + "_config"
    elif filename_parts:
        fixed_part_str = "_".join(filename_parts)
    else:
        fixed_part_str = "all_random"
    
    # 添加时间戳和前缀
    timestamp = datetime.now().strftime('%y%m%d%H%M')
    prefix = f"{filename_prefix}_" if filename_prefix else ""
    
    # 组合最终文件名
    return f"{prefix}{fixed_part_str}_{timestamp}.csv"


def main():
    """
    主函数，控制整个生成流程。
    
    解析命令行参数，加载和验证配置，生成数据，并将结果写入CSV文件。
    """
    # 解析命令行参数
    args = parse_arguments()
    config_path_abs = os.path.abspath(args.config)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 初始化源数据目录
    temp_profile_dir_abs = os.path.abspath(os.path.join(script_dir, "../parent-profile"))
    print(f"临时加载源数据以验证配置，来源: {temp_profile_dir_abs}")
    
    # 加载初始数据源用于验证
    required_files = set(COLUMN_TO_FILE_MAP.values())
    try:
        data_sources = load_data_sources(temp_profile_dir_abs, required_files)
    except Exception as e:
        print(f"错误: 尝试加载源数据以验证配置时失败: {e}", file=sys.stderr)
        sys.exit(1)
    
    # 加载并验证配置
    print(f"尝试加载主配置文件: {config_path_abs}")
    config = load_and_validate_config(config_path_abs, data_sources)
    if config is None:
        print("主配置文件加载或验证失败，程序退出。", file=sys.stderr)
        sys.exit(1)
    print("主配置文件加载并验证成功。")
    
    # 提取配置参数
    num_profiles = config['num_profiles']
    output_dir = config['output_dir']
    filename_prefix = config.get('filename_prefix')
    profile_sources_dir = config['profile_sources_dir']
    fixed_values = config.get('fixed_values')
    distributions = config.get('distributions_processed')
    target_percentages = config.get('target_percentages_processed')
    
    # 如果配置指定了不同的源目录，重新加载数据
    profile_dir_abs = os.path.abspath(os.path.join(script_dir, profile_sources_dir))
    if profile_dir_abs != temp_profile_dir_abs:
        print(f"配置文件指定了不同的源目录，重新加载: {profile_dir_abs}")
        try:
            data_sources = load_data_sources(profile_dir_abs, required_files)
        except Exception as e:
            print(f"错误: 加载配置文件指定的源数据时失败: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        print(f"使用源数据目录: {profile_dir_abs}")
    
    # 生成输出文件名
    filename = generate_output_filename(
        fixed_values, distributions, target_percentages,
        filename_prefix, COLUMN_ORDER
    )
    
    # 确定输出路径
    output_dir_abs = os.path.abspath(os.path.join(script_dir, output_dir))
    output_file_path = os.path.join(output_dir_abs, filename)
    print(f"将生成输出文件: {output_file_path}")
    
    # 生成档案数据
    profile_data = generate_profile_data(
        num_profiles,
        data_sources,
        fixed_values,
        distributions,
        target_percentages,
        COLUMN_ORDER,
        COLUMN_TO_FILE_MAP
    )
    
    # 写入CSV文件
    if profile_data:
        write_csv(output_file_path, profile_data, COLUMN_ORDER)
    else:
        print("没有生成数据。")


if __name__ == "__main__":
    main() 