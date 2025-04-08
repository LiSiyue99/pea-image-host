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
# 注意: gender, personality, attachment 被多个列共享
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
    加载单个JSON源文件。
    - 字典类型(complain.json除外): 返回整个字典。
    - complain.json: 返回展平后的值列表。
    - 列表类型: 返回列表本身。
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            filename = os.path.basename(file_path)

            if isinstance(data, dict):
                if filename == 'complain.json':
                    # ... (Flattening logic remains the same, returns List[str]) ...
                    options = list(data.values())
                    if not options: raise ValueError('...')
                    flat_options = []
                    for item in options:
                        if isinstance(item, list):
                            for sub_item in item:
                                if isinstance(sub_item, str): flat_options.append(sub_item)
                        elif isinstance(item, str): flat_options.append(item)
                        elif isinstance(item, dict):
                            for sub_item in item.values():
                                if isinstance(sub_item, str): flat_options.append(sub_item)
                                elif isinstance(sub_item, list):
                                    for ss_item in sub_item:
                                        if isinstance(ss_item, str): flat_options.append(ss_item)
                    if not flat_options: raise ValueError('...')
                    return flat_options # complain.json returns List[Any]
                else:
                    # 对于其他字典类型，直接返回整个字典
                    if not data:
                        raise ValueError(f"字典文件 {file_path} 为空")
                    return data # Returns Dict[str, Any]
            elif isinstance(data, list):
                if not data:
                    raise ValueError(f"列表文件 {file_path} 为空")
                return data # Returns List[Any]
            else:
                raise ValueError(f"无法识别的JSON顶层结构在 {file_path}")
    except FileNotFoundError:
        print(f"错误: 配置文件 '{file_path}' 未找到。", file=sys.stderr)
        raise
    except json.JSONDecodeError:
        print(f"错误: 解析JSON文件 '{file_path}' 失败，请检查格式。", file=sys.stderr)
        raise
    except ValueError as e:
        print(f"错误: 处理JSON文件 '{file_path}' 时出错: {e}", file=sys.stderr)
        raise

def load_and_validate_config(config_path: str, data_sources: DataSources) -> Optional[GenerationConfig]:
    """
    加载、验证并设置配置文件的默认值。

    Args:
        config_path: 配置文件的路径。
        data_sources: 已加载的原始选项数据源，用于验证配置中的选项。

    Returns:
        经过验证和填充默认值的配置字典，如果失败则返回 None。
    """
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config_data = json.load(f)
    except FileNotFoundError:
        print(f"错误: 主配置文件 '{config_path}' 未找到。", file=sys.stderr)
        return None
    except json.JSONDecodeError:
        print(f"错误: 解析主配置文件 '{config_path}' 失败，请检查JSON格式。", file=sys.stderr)
        return None

    if not isinstance(config_data, dict):
        print(f"错误: 主配置文件 '{config_path}' 的顶层必须是一个字典。", file=sys.stderr)
        return None

    # --- 验证必需字段 ---
    if 'num_profiles' not in config_data:
        print(f"错误: 配置文件 '{config_path}' 缺少必需字段 'num_profiles'。", file=sys.stderr)
        return None
    if not isinstance(config_data['num_profiles'], int) or config_data['num_profiles'] <= 0:
        print(f"错误: 配置文件中的 'num_profiles' 必须是一个正整数。", file=sys.stderr)
        return None

    # --- 设置默认值 ---
    validated_config: GenerationConfig = {
        'num_profiles': config_data['num_profiles'],
        'output_dir': config_data.get('output_dir', '../output'),
        'filename_prefix': config_data.get('filename_prefix'), # None if not present
        'profile_sources_dir': config_data.get('profile_sources_dir', '../parent-profile'),
        'fixed_values': config_data.get('fixed_values'), # None if not present
        'distributions': config_data.get('distributions'), # None if not present
        'target_percentages': config_data.get('target_percentages'), # 新增
    }

    # --- 验证可选字段类型 ---
    if validated_config['output_dir'] and not isinstance(validated_config['output_dir'], str):
        print(f"错误: 配置文件中的 'output_dir' 必须是一个字符串。", file=sys.stderr)
        return None
    if validated_config['filename_prefix'] is not None and not isinstance(validated_config['filename_prefix'], str):
         print(f"错误: 配置文件中的 'filename_prefix' 必须是一个字符串。", file=sys.stderr)
         return None
    if validated_config['profile_sources_dir'] and not isinstance(validated_config['profile_sources_dir'], str):
         print(f"错误: 配置文件中的 'profile_sources_dir' 必须是一个字符串。", file=sys.stderr)
         return None
    if validated_config['fixed_values'] is not None and not isinstance(validated_config['fixed_values'], dict):
        print(f"错误: 配置文件中的 'fixed_values' 必须是一个字典。", file=sys.stderr)
        return None
    if validated_config['distributions'] is not None and not isinstance(validated_config['distributions'], dict):
        print(f"错误: 配置文件中的 'distributions' 必须是一个字典。", file=sys.stderr)
        return None
    if validated_config['target_percentages'] is not None and not isinstance(validated_config['target_percentages'], dict):
        print(f"错误: 配置文件中的 'target_percentages' 必须是一个字典。", file=sys.stderr)
        return None

    # --- 验证 fixed_values ---
    if validated_config['fixed_values']:
        for column, fixed_key in validated_config['fixed_values'].items():
            if column not in COLUMN_ORDER:
                print(f"警告: fixed_values 列名 {column} 无效")
                continue
            if not isinstance(fixed_key, str):
                 print(f"错误: fixed_values 值 {fixed_key} 必须是字符串")
                 return None

            file_key = COLUMN_TO_FILE_MAP.get(column)
            if file_key and file_key in data_sources and column != 'complain':
                 source_data = data_sources[file_key]
                 if isinstance(source_data, dict):
                     if fixed_key not in source_data:
                         print(f"警告: fixed_values 中列 '{column}' 的键 '{fixed_key}' "
                               f"不在源文件 '{file_key}.json' 的键集合中: {list(source_data.keys())}")
                 # 如果源数据是列表（不应发生除非配置错误或特殊情况），不进行键检查

    # --- 验证 distributions ---
    if validated_config['distributions']:
        processed_distributions: ValidatedDistributions = {}
        is_dist_valid = True
        for column, dist_dict in validated_config['distributions'].items():
            if column not in COLUMN_ORDER:
                print(f"警告: distributions 列名 {column} 无效")
                continue
            if not isinstance(dist_dict, dict) or not dist_dict:
                 print(f"错误: distributions 值必须是非空字典")
                 is_dist_valid = False; continue

            options_in_dist_keys = list(dist_dict.keys())
            weights_in_dist = list(dist_dict.values())

            if not all(isinstance(w, (int, float)) for w in weights_in_dist):
                 print(f"错误: distributions {column} 包含非数字比例")
                 is_dist_valid = False; continue
            weights_float = [float(w) for w in weights_in_dist]
            if not all(0.0 <= w <= 1.0 for w in weights_float):
                 print(f"错误: distributions {column} 比例不在[0,1]")
                 is_dist_valid = False; continue

            file_key = COLUMN_TO_FILE_MAP.get(column)
            if not file_key or file_key not in data_sources:
                print(f"错误: 无法找到列 '{column}' 的源数据")
                is_dist_valid = False; continue

            source_data = data_sources[file_key]
            if column == 'complain':
                print(f"错误: 不支持对 'complain' 列进行分布配置，请移除或使用 fixed_values。", file=sys.stderr)
                is_dist_valid = False; continue

            if not isinstance(source_data, dict):
                 print(f"错误: 列 '{column}' 的源数据不是字典格式，无法应用分布配置。", file=sys.stderr)
                 is_dist_valid = False; continue

            valid_source_keys = list(source_data.keys())
            invalid_keys_in_config = [key for key in options_in_dist_keys if key not in valid_source_keys]
            if invalid_keys_in_config:
                 print(f"错误: distributions 中列 '{column}' 包含无效键: {invalid_keys_in_config}。"
                       f" 有效键为: {valid_source_keys}，跳过此列。", file=sys.stderr)
                 is_dist_valid = False; continue

            total_weight = sum(weights_float)
            if not math.isclose(total_weight, 1.0, rel_tol=1e-9):
                print(f"错误: distributions {column} 比例和不为1")
                is_dist_valid = False; continue

            processed_distributions[column] = (options_in_dist_keys, weights_float)

        if not is_dist_valid:
            return None # 如果分布有任何错误，则整体配置无效
        # 将处理和验证后的分布存回配置对象，替换原始字典
        validated_config['distributions_processed'] = processed_distributions # 使用新键存储处理后的元组

    # --- 验证 target_percentages ---
    if validated_config['target_percentages']:
        processed_targets: ValidatedTargetPercentages = {}
        is_target_valid = True
        for column, target_dict in validated_config['target_percentages'].items():
            if column not in COLUMN_ORDER:
                print(f'Warning: Invalid column {column} in target_percentages')
                continue
            if not isinstance(target_dict, dict) or not target_dict:
                print(f'Error: Value for {column} in target_percentages must be non-empty dict')
                is_target_valid = False; continue
            if column == 'complain':
                print('Error: target_percentages not supported for complain')
                is_target_valid = False; continue

            target_keys = list(target_dict.keys())
            target_weights = list(target_dict.values())

            if not all(isinstance(w, (int, float)) for w in target_weights):
                print(f'Error: Non-numeric percentage in target_percentages for {column}')
                is_target_valid = False; continue
            weights_float = [float(w) for w in target_weights]
            if not all(0.0 <= w <= 1.0 for w in weights_float):
                print(f'Error: Percentage out of range [0,1] in target_percentages for {column}')
                is_target_valid = False; continue

            total_target_weight = sum(weights_float)
            if total_target_weight > 1.0 and not math.isclose(total_target_weight, 1.0, rel_tol=1e-9): # Allow sum = 1
                print(f"Error: Sum of percentages ({total_target_weight}) > 1 for {column} in target_percentages")
                is_target_valid = False; continue

            file_key = COLUMN_TO_FILE_MAP.get(column)
            if not file_key or file_key not in data_sources or not isinstance(data_sources[file_key], dict):
                print(f'Error: Cannot validate keys for {column} in target_percentages, source invalid')
                is_target_valid = False; continue
            source_keys = list(data_sources[file_key].keys())
            invalid_keys = [k for k in target_keys if k not in source_keys]
            if invalid_keys:
                print(f'Error: Invalid keys {invalid_keys} in target_percentages for {column}. Valid: {source_keys}')
                is_target_valid = False; continue

            processed_targets[column] = (target_keys, weights_float)

        if not is_target_valid:
            return None
        validated_config['target_percentages_processed'] = processed_targets # Use new key

    return validated_config

def parse_arguments() -> argparse.Namespace:
    """解析命令行参数，现在只包含 --config。"""
    parser = argparse.ArgumentParser(description="根据统一配置文件生成家庭档案合成数据CSV文件。")
    parser.add_argument("--config", type=str, required=True,
                        help="指定包含所有生成参数的JSON配置文件的路径。")
    return parser.parse_args()

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
    生成指定数量的档案数据。参数来自验证后的配置。
    """
    generated_data = []
    effective_fixed_values = fixed_values or {} # 使用空字典代替 None
    effective_distributions = distributions or {}
    effective_target_percentages = target_percentages or {}

    # 预计算 target_percentages 的完整分布 (如果存在)
    full_distributions_from_targets: Dict[str, DistributionTuple] = {}
    for column, (target_keys, target_weights) in effective_target_percentages.items():
        file_key = column_to_file_map.get(column)
        if not file_key or not isinstance(data_sources.get(file_key), dict):
            print(f"Error pre-calculating target dist for {column}: Invalid source data.")
            continue # Should have been caught in validation
        
        all_source_keys = list(data_sources[file_key].keys())
        if not all_source_keys: continue # Skip if source is empty

        other_keys = [key for key in all_source_keys if key not in target_keys]
        total_target_prob = sum(target_weights)
        remaining_prob = 1.0 - total_target_prob

        final_keys = list(target_keys) # Start with target keys
        final_weights = list(target_weights) # Start with target weights

        if remaining_prob > 1e-9 and other_keys: # If there's probability left and other keys exist
            prob_per_other = remaining_prob / len(other_keys)
            final_keys.extend(other_keys)
            final_weights.extend([prob_per_other] * len(other_keys))
        elif remaining_prob > 1e-9 and not other_keys:
             # This means target percentages didn't sum to 1 but covered all keys - normalize them
             print(f"Warning: Target percentages for {column} sum to {total_target_prob} but cover all keys. Normalizing.")
             normalization_factor = 1.0 / total_target_prob if total_target_prob > 0 else 0
             final_weights = [w * normalization_factor for w in target_weights]
        elif remaining_prob <= 1e-9 and other_keys:
             # Targets sum to 1, but there are other keys. Assign them 0 probability.
             print(f"Warning: Target percentages for {column} sum to 1, ignoring other keys: {other_keys}")
             final_keys.extend(other_keys)
             final_weights.extend([0.0] * len(other_keys))
        # Else: Targets sum to 1 and cover all keys (or remaining prob is near zero) - weights are already correct
        
        # Final check and store
        if final_keys and final_weights and len(final_keys) == len(final_weights):
             # Normalize final weights just in case of float issues, though should be close to 1
            current_sum = sum(final_weights)
            if not math.isclose(current_sum, 1.0):
                 norm_factor = 1.0 / current_sum if current_sum > 0 else 0
                 final_weights = [w * norm_factor for w in final_weights]
            full_distributions_from_targets[column] = (final_keys, final_weights)
        else:
             print(f"Error: Failed to build full distribution for {column} from targets.")

    for _ in range(num_profiles):
        profile: Dict[str, Any] = {}
        for column in column_order:
            selected_key_or_value = None
            final_value = None

            # --- 1. 选择 Key (或 complain value) ---
            if column in effective_fixed_values:
                selected_key_or_value = effective_fixed_values[column]
            elif column in effective_distributions:
                try:
                    population_keys, weights = effective_distributions[column]
                    selected_key_or_value = random.choices(population=population_keys, weights=weights, k=1)[0]
                except Exception as e:
                     print(f"Error applying distribution for {column}: {e}")
            elif column in full_distributions_from_targets:
                try:
                    # 使用预计算好的完整分布
                    population_keys, weights = full_distributions_from_targets[column]
                    selected_key_or_value = random.choices(population=population_keys, weights=weights, k=1)[0]
                except Exception as e:
                     print(f"Error applying target distribution for {column}: {e}")
            
            # 默认随机选择 (如果前面步骤未选定)
            if selected_key_or_value is None:
                file_key = column_to_file_map.get(column)
                if not file_key or file_key not in data_sources:
                    final_value = None # Skip value lookup if source missing
                else:
                    source_data = data_sources[file_key]
                    try:
                        if column == 'complain':
                            if isinstance(source_data, list) and source_data:
                                selected_key_or_value = random.choice(source_data)
                        elif isinstance(source_data, dict):
                            valid_keys = list(source_data.keys())
                            if valid_keys:
                                selected_key_or_value = random.choice(valid_keys)
                        elif isinstance(source_data, list):
                             if source_data:
                                 selected_key_or_value = random.choice(source_data)
                        # If selection failed, selected_key_or_value remains None
                    except Exception as e:
                        print(f"Error during random choice for {column}: {e}")
            
            # --- 2. 查找 Value --- 
            if selected_key_or_value is None:
                final_value = None
            elif column == 'complain':
                final_value = selected_key_or_value
            else:
                file_key = column_to_file_map.get(column)
                if file_key and file_key in data_sources:
                    source_data = data_sources[file_key]
                    if isinstance(source_data, dict):
                        final_value = source_data.get(selected_key_or_value)
                        if final_value is None:
                             print(f"Warning: Key {selected_key_or_value} not found in source for {column}")
                    elif isinstance(source_data, list):
                         # This case shouldn't happen if key was selected, but handle defensively
                         final_value = selected_key_or_value if selected_key_or_value in source_data else None
                else:
                     final_value = None # Source data missing

            profile[column] = final_value
        generated_data.append(profile)
    return generated_data

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


def main():
    """主函数，使用单一配置文件驱动。"""
    args = parse_arguments()
    config_path_abs = os.path.abspath(args.config)
    script_dir = os.path.dirname(os.path.abspath(__file__)) # 脚本自身所在目录

    # --- 加载源数据 (需要在验证配置之前加载，因为验证需要它) ---
    # 暂时使用默认路径加载，后面如果配置文件验证通过，会用配置里的路径重新确认
    temp_profile_dir_abs = os.path.abspath(os.path.join(script_dir, "../parent-profile"))
    print(f"临时加载源数据以验证配置，来源: {temp_profile_dir_abs}")
    data_sources: DataSources = {}
    required_files = set(COLUMN_TO_FILE_MAP.values())
    try:
        for file_key in required_files:
            file_path = os.path.join(temp_profile_dir_abs, f"{file_key}.json")
            data_sources[file_key] = load_json_options(file_path)
    except Exception as e:
         print(f"错误: 尝试加载源数据以验证配置时失败: {e}", file=sys.stderr)
         sys.exit(1)

    # --- 加载并验证主配置文件 ---
    print(f"尝试加载主配置文件: {config_path_abs}")
    config = load_and_validate_config(config_path_abs, data_sources)
    if config is None:
        print("主配置文件加载或验证失败，程序退出。", file=sys.stderr)
        sys.exit(1)
    print("主配置文件加载并验证成功。")

    # --- 使用验证后的配置 ---
    num_profiles = config['num_profiles']
    output_dir = config['output_dir']
    filename_prefix = config.get('filename_prefix') # 可能为 None
    profile_sources_dir = config['profile_sources_dir']
    fixed_values = config.get('fixed_values') # 可能为 None
    distributions = config.get('distributions_processed') # 注意键名变化
    target_percentages = config.get('target_percentages_processed') # 注意键名变化

    # --- 确认/重新加载源数据 (如果配置中指定了不同路径) ---
    profile_dir_abs = os.path.abspath(os.path.join(script_dir, profile_sources_dir))
    if profile_dir_abs != temp_profile_dir_abs:
        print(f"配置文件指定了不同的源目录，重新加载: {profile_dir_abs}")
        data_sources = {} # 清空旧的
        try:
            for file_key in required_files:
                file_path = os.path.join(profile_dir_abs, f"{file_key}.json")
                data_sources[file_key] = load_json_options(file_path)
        except Exception as e:
            print(f"错误: 加载配置文件指定的源数据时失败: {e}", file=sys.stderr)
            sys.exit(1)
    else:
         print(f"使用源数据目录: {profile_dir_abs}")

    # --- 构建输出文件名 (考虑新的优先级) ---
    filename_parts: List[str] = []
    config_type_used = "all_random" # Default
    if fixed_values:
        config_type_used = "fixed"
        sorted_fixed = sorted(fixed_values.items())
        for col, key_val in sorted_fixed:
             if col in COLUMN_ORDER: filename_parts.append(f"{col}-{key_val.replace(' ', '_')}")
    elif distributions:
        config_type_used = "distribution"
        # Maybe add column names from distributions? Optional, could be long.
        # filename_parts.append("distribution_config") # Simpler
    elif target_percentages:
        config_type_used = "target_percent"
        # Maybe add column names from targets? Optional.
        # filename_parts.append("target_percent_config") # Simpler

    if not filename_parts and config_type_used != "all_random":
        # If config was used but didn't result in specific parts (e.g., dist/target)
        # use the type name as the identifier.
        fixed_part_str = config_type_used + "_config"
    elif filename_parts:
         fixed_part_str = "_".join(filename_parts)
    else:
         fixed_part_str = "all_random"

    timestamp = datetime.now().strftime('%y%m%d%H%M')
    prefix = f"{filename_prefix}_" if filename_prefix else ""
    filename = f"{prefix}{fixed_part_str}_{timestamp}.csv"

    # --- 确定最终输出路径 ---
    output_dir_abs = os.path.abspath(os.path.join(script_dir, output_dir))
    output_file_path = os.path.join(output_dir_abs, filename)
    print(f"将生成输出文件: {output_file_path}")

    # --- 生成数据 ---
    profile_data = generate_profile_data(
        num_profiles,
        data_sources,
        fixed_values,
        distributions,
        target_percentages,
        COLUMN_ORDER,
        COLUMN_TO_FILE_MAP
    )

    # --- 写入CSV文件 ---
    if profile_data:
        write_csv(output_file_path, profile_data, COLUMN_ORDER)
    else:
        print("没有生成数据。")

if __name__ == "__main__":
    main() 