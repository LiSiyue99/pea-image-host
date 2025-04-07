# 家庭档案合成数据生成脚本设计文档

## 1. 目标

*   生成一个CSV文件，包含用于构建家长角色画像（Persona）的合成数据。CSV列顺序遵循 `parent-generation/src/template.csv`。
*   数据来源于 `parent-generation/parent-profile/` 目录下的多个JSON配置文件。
*   允许用户通过命令行参数指定生成的数据量。
*   允许用户通过命令行参数对特定列指定固定的值。

## 2. 输入

*   **JSON配置文件目录**: `parent-generation/parent-profile/`
*   **JSON文件列表**:
    *   `social_class.json`
    *   `child_period.json`
    *   `family_structure.json`
    *   `parenting.json`
    *   `complain.json`
    *   `gender.json`
    *   `personality.json`
    *   `attachment.json`
*   **用户参数 (命令行)**:
    *   `--num-profiles` (必需): 需要生成的档案数量 (整数)。
    *   `--output-file` (必需): 输出CSV文件的路径 (字符串)。
    *   `--profile-dir` (可选): JSON配置文件的目录路径 (默认为 `../parent-profile`)。
    *   `--fixed-[column_name]` (可选): 为特定列指定固定值。例如 `--fixed-child-gender 男`。支持的列名见下方"输出"部分。

## 3. 输出

*   一个CSV文件，包含以下列 (顺序固定):
    1.  `social_class`
    2.  `child_period`
    3.  `family_structure`
    4.  `parenting`
    5.  `complain`
    6.  `child_gender`
    7.  `parent_gender`
    8.  `parent_personality`
    9.  `child_personality`
    10. `parent_attachment`
    11. `child_attachment`

## 4. 核心逻辑

1.  **参数解析**: 使用 `argparse` 解析命令行参数，包括生成数量、输出路径、配置目录以及所有可选的固定值参数。
2.  **数据加载**:
    *   定义一个映射，将CSV列名与对应的JSON文件名关联起来。
    *   遍历所有需要的列，调用 `load_json_options` 函数加载每个JSON文件。
    *   `load_json_options` 函数负责打开JSON文件，并根据其结构（通常是字典的值或列表元素）提取有效的选项列表。
3.  **数据生成循环**:
    *   根据用户指定的 `num_profiles` 数量，循环生成每一行数据。
    *   在每次循环中，创建一个字典来存储当前行的档案数据。
    *   对于CSV中的每一列：
        *   检查命令行参数中是否为该列指定了固定值 (`fixed-[column_name]`)。
        *   如果指定了固定值，则使用该值。
        *   如果没有指定固定值，则从对应的数据源（加载的选项列表）中使用 `random.choice` 随机选择一个值。
    *   将生成的单行字典添加到结果列表中。
4.  **CSV写入**:
    *   使用 `csv.DictWriter` 将结果列表写入指定的输出CSV文件。
    *   明确设置 `fieldnames` 参数为预定义的列顺序，确保CSV格式正确。
    *   使用 `utf-8-sig` 编码写入，以确保中文字符在Excel等软件中正确显示。
    *   写入表头。

## 5. 代码结构

*   **主脚本**: `parent-generation/src/generate_profiles.py`
*   **主要函数**:
    *   `load_json_options(file_path)`: 加载单个JSON并提取选项。
    *   `parse_arguments()`: 解析命令行参数。
    *   `generate_profile_data(num_profiles, data_sources, fixed_values, column_order)`: 生成所有档案数据。
    *   `write_csv(output_file, data, fieldnames)`: 将数据写入CSV。
    *   `main()`: 主流程控制函数。
*   **常量**: `COLUMN_ORDER` (列表，定义CSV列顺序), `COLUMN_TO_FILE_MAP` (字典，映射列名到JSON文件名)。

## 6. 错误处理与健壮性

*   使用 `try-except` 块处理文件未找到 (`FileNotFoundError`) 和JSON解析错误 (`json.JSONDecodeError`)。
*   在写入CSV前确保输出目录存在，如果不存在则创建。
*   提供清晰的错误消息给用户。

## 7. 使用示例

```bash
# 生成 100 个随机档案到 ../output/profiles.csv
python parent-generation/src/generate_profiles.py --num-profiles 100 --output-file ../output/profiles.csv

# 生成 50 个档案，孩子性别固定为'男'，家长性别固定为'女'
python parent-generation/src/generate_profiles.py --num-profiles 50 --output-file ../output/female_parent_male_child.csv --fixed-child-gender 男 --fixed-parent-gender 女

# 使用不同的配置目录
python parent-generation/src/generate_profiles.py --num-profiles 20 --output-file ../output/custom_profiles.csv --profile-dir path/to/your/profiles
```

## 8. 未来扩展

*   支持为列指定比例分布，而非仅固定值。可以通过更复杂的命令行参数（如JSON字符串）或单独的配置文件实现。
*   增加更多数据验证，例如检查JSON文件中的选项是否为空。
