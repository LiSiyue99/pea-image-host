from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import FileResponse, JSONResponse
import uvicorn
import os
import subprocess
import sys
from typing import List, Any, Optional, Dict, Tuple, Union
import json
import math
import aiofiles
from pydantic import BaseModel, Field, ValidationError, validator

# 获取当前文件所在的目录
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Define output directory relative to BASE_DIR (webapp)
OUTPUT_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "output"))

# 确保在Render环境中可以使用合适的目录
print(f"初始化时使用的输出目录: {OUTPUT_DIR}")
print(f"环境变量: RENDER = {os.environ.get('RENDER', '未设置')}")

# 确保输出目录存在
try:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"确保输出目录存在: {OUTPUT_DIR}")
except Exception as e:
    print(f"创建输出目录失败: {e}")

CONFIG_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "configs")) # Config dir path
# 确保配置目录存在
try:
    os.makedirs(CONFIG_DIR, exist_ok=True)
    print(f"确保配置目录存在: {CONFIG_DIR}")
except Exception as e:
    print(f"创建配置目录失败: {e}")

SRC_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "src")) # Script dir path
PARENT_PROFILE_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "parent-profile"))

CONFIG_FILE = os.path.join(CONFIG_DIR, "generation_config.json") # Default config file path
GENERATOR_SCRIPT = os.path.join(SRC_DIR, "generate_profiles.py") # Generator script path
PYTHON_EXECUTABLE = sys.executable # Path to current python interpreter

# 打印重要路径
print(f"Python解释器: {PYTHON_EXECUTABLE}")
print(f"生成器脚本: {GENERATOR_SCRIPT}")
print(f"配置文件: {CONFIG_FILE}")
print(f"家长档案目录: {PARENT_PROFILE_DIR}")

# --- 常量 ---
COLUMN_ORDER: List[str] = [
    "social_class", "child_period", "family_structure", "parenting", "complain",
    "child_gender", "parent_gender", "parent_personality", "child_personality",
    "parent_attachment", "child_attachment",
]

# 添加列名的中英文对照
COLUMN_TRANSLATIONS: Dict[str, str] = {
    "social_class": "社会阶层",
    "child_period": "儿童时期",
    "family_structure": "家庭结构",
    "parenting": "教养方式",
    "complain": "抱怨内容",
    "child_gender": "儿童性别",
    "parent_gender": "家长性别",
    "parent_personality": "家长性格",
    "child_personality": "儿童性格",
    "parent_attachment": "家长依恋类型",
    "child_attachment": "儿童依恋类型"
}

COLUMN_TO_FILE_MAP: Dict[str, str] = {
    "social_class": "social_class", "child_period": "child_period",
    "family_structure": "family_structure", "parenting": "parenting",
    "complain": "complain", "child_gender": "gender", "parent_gender": "gender",
    "parent_personality": "personality", "child_personality": "personality",
    "parent_attachment": "attachment", "child_attachment": "attachment",
}
DataSources = Dict[str, Union[Dict[str, Any], List[Any]]]

# --- Pydantic模型 ---
class ConfigPayload(BaseModel):
    num_profiles: int = Field(..., gt=0)
    output_dir: str = "../output"
    filename_prefix: Optional[str] = None
    profile_sources_dir: str = "../parent-profile"
    fixed_values: Optional[Dict[str, str]] = None
    distributions: Optional[Dict[str, Dict[str, float]]] = None
    target_percentages: Optional[Dict[str, Dict[str, float]]] = None

    @validator('filename_prefix')
    def check_prefix_not_empty(cls, v):
        if v == "": return None
        return v

# --- 辅助函数 ---
def load_profile_source_data_sync(profile_dir: str) -> DataSources:
    data_sources: DataSources = {}
    required_files = set(COLUMN_TO_FILE_MAP.values())
    try:
        for file_key in required_files:
            file_path = os.path.join(profile_dir, f"{file_key}.json")
            if not os.path.isfile(file_path): 
                raise FileNotFoundError(f"Source file not found: {file_path}")
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                filename = os.path.basename(file_path)
                if isinstance(data, dict):
                    if filename == 'complain.json':
                        flat_options = []
                        for item in list(data.values()):
                             if isinstance(item, list): 
                                flat_options.extend([str(s) for s in item if isinstance(s, str)])
                             elif isinstance(item, str): 
                                flat_options.append(item)
                             elif isinstance(item, dict):
                                 for sub_item in item.values():
                                     if isinstance(sub_item, str): 
                                        flat_options.append(sub_item)
                                     elif isinstance(sub_item, list): 
                                        flat_options.extend([str(s) for s in sub_item if isinstance(s, str)])
                        data_sources[file_key] = flat_options
                    else:
                        data_sources[file_key] = data # 存储整个字典
                elif isinstance(data, list):
                     data_sources[file_key] = data
                else: 
                    raise ValueError(f"Unknown structure in {filename}")
    except Exception as e:
        print(f"Error loading source data for validation: {e}")
        raise
    return data_sources


def validate_config_logic(config: ConfigPayload, data_sources: DataSources) -> List[str]:
    errors = []
    # 互斥性检查
    fixed_cols = set(config.fixed_values.keys()) if config.fixed_values else set()
    dist_cols = set(config.distributions.keys()) if config.distributions else set()
    target_cols = set(config.target_percentages.keys()) if config.target_percentages else set()
    if fixed_cols & dist_cols: 
        errors.append(f"Columns in fixed & distributions: {fixed_cols & dist_cols}")
    if fixed_cols & target_cols: 
        errors.append(f"Columns in fixed & target_percentages: {fixed_cols & target_cols}")
    if dist_cols & target_cols: 
        errors.append(f"Columns in distributions & target_percentages: {dist_cols & target_cols}")

    # 验证 fixed_values 键
    if config.fixed_values:
        for col, key in config.fixed_values.items():
            if col not in COLUMN_ORDER: 
                errors.append(f"Invalid column '{col}' in fixed_values")
                continue
            file_key = COLUMN_TO_FILE_MAP.get(col)
            if col != 'complain' and file_key and isinstance(data_sources.get(file_key), dict):
                 if key not in data_sources[file_key]: 
                    errors.append(f"Invalid key '{key}' for column '{col}' in fixed_values")

    # 验证 distributions
    if config.distributions:
        for col, dist_dict in config.distributions.items():
            if col not in COLUMN_ORDER: 
                errors.append(f"Invalid column '{col}' in distributions")
                continue
            if col == 'complain': 
                errors.append(f"Distributions not supported for complain")
                continue
            if not isinstance(dist_dict, dict) or not dist_dict: 
                errors.append(f"Distribution for '{col}' must be non-empty dict")
                continue
            weights = list(dist_dict.values())
            if not all(isinstance(w, (int, float)) and 0.0 <= w <= 1.0 for w in weights): 
                errors.append(f"Invalid weights in distribution for '{col}'")
            if not math.isclose(sum(weights), 1.0): 
                errors.append(f"Weights sum != 1 for '{col}' in distributions")
            file_key = COLUMN_TO_FILE_MAP.get(col)
            if not file_key or not isinstance(data_sources.get(file_key), dict): 
                errors.append(f"Cannot validate keys for '{col}' distribution")
                continue
            invalid_keys = [k for k in dist_dict if k not in data_sources[file_key]]
            if invalid_keys: 
                errors.append(f"Invalid keys {invalid_keys} in distribution for '{col}'")

    # 验证 target_percentages
    if config.target_percentages:
        for col, target_dict in config.target_percentages.items():
            if col not in COLUMN_ORDER: 
                errors.append(f"Invalid column '{col}' in target_percentages")
                continue
            if col == 'complain': 
                errors.append(f"Target % not supported for complain")
                continue
            if not isinstance(target_dict, dict) or not target_dict: 
                errors.append(f"Target % for '{col}' must be non-empty dict")
                continue
            weights = list(target_dict.values())
            if not all(isinstance(w, (int, float)) and 0.0 <= w <= 1.0 for w in weights): 
                errors.append(f"Invalid percentages in target % for '{col}'")
            if sum(weights) > 1.0 and not math.isclose(sum(weights), 1.0): 
                errors.append(f"Percentages sum > 1 for '{col}' in target %")
            file_key = COLUMN_TO_FILE_MAP.get(col)
            if not file_key or not isinstance(data_sources.get(file_key), dict): 
                errors.append(f"Cannot validate keys for '{col}' target %")
                continue
            invalid_keys = [k for k in target_dict if k not in data_sources[file_key]]
            if invalid_keys: 
                errors.append(f"Invalid keys {invalid_keys} in target % for '{col}'")

    return errors


# --- FastAPI应用设置 ---
app = FastAPI()

# 1. 配置静态文件服务
# 将 "/static" URL 路径映射到 "static" 文件夹
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

# 2. 配置模板引擎
# 指定模板文件所在的目录
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))

# --- 路由 ---

@app.get("/")
def read_root(request: Request):
    # 使用模板引擎渲染 index.html
    # 必须传递 request 对象
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/config")
async def get_current_config() -> Any:
    """Reads and returns the current generation_config.json content."""
    if not os.path.isfile(CONFIG_FILE):
        # If config doesn't exist, maybe return a default structure or error
        # Returning error is safer to indicate setup issue
        raise HTTPException(status_code=500, detail=f"Configuration file not found: {CONFIG_FILE}")
    try:
        async with aiofiles.open(CONFIG_FILE, mode='r', encoding='utf-8') as f:
            content = await f.read()
        config_data = json.loads(content)
        return config_data
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail=f"Error parsing configuration file: {CONFIG_FILE}")
    except Exception as e:
        print(f"Error reading config file {CONFIG_FILE}: {e}")
        raise HTTPException(status_code=500, detail=f"Could not read configuration file: {e}")

@app.post("/api/config")
async def save_current_config(payload: ConfigPayload):
    try:
        # 确定正确的配置目录路径
        current_profile_dir = os.path.abspath(os.path.join(BASE_DIR, payload.profile_sources_dir))
        if not os.path.isdir(current_profile_dir):
             raise HTTPException(status_code=400, detail=f"Profile sources directory not found: {current_profile_dir}")

        # 加载验证所需的源数据
        data_sources = load_profile_source_data_sync(current_profile_dir)

        # 执行详细验证
        validation_errors = validate_config_logic(payload, data_sources)
        if validation_errors:
            raise HTTPException(status_code=422, detail="Validation failed: " + "; ".join(validation_errors))

        # 验证通过，异步保存文件
        config_to_save = payload.dict(exclude_none=True)

        async with aiofiles.open(CONFIG_FILE, mode='w', encoding='utf-8') as f:
            await f.write(json.dumps(config_to_save, indent=2, ensure_ascii=False))

        return {"message": "Configuration saved successfully!"}

    except ValidationError as e: # 捕获Pydantic验证错误
        raise HTTPException(status_code=422, detail=f"Invalid configuration format: {e}")
    except HTTPException as e: # 重新引发特定的HTTP异常
        raise e
    except Exception as e:
        print(f"Error saving config file {CONFIG_FILE}: {e}")
        raise HTTPException(status_code=500, detail=f"Could not save configuration file: {e}")

@app.get("/api/config/options")
async def get_config_options():
    """提供构建配置UI所需的数据（列名和它们的选项）。"""
    options_data = {
        "columns": COLUMN_ORDER,
        "translations": COLUMN_TRANSLATIONS,  # 添加中文翻译
        "options": {}  # 字典: column_name -> list_of_option_keys
    }
    try:
        # 使用默认的父配置文件目录路径加载UI选项
        data_sources = load_profile_source_data_sync(PARENT_PROFILE_DIR)

        for column in COLUMN_ORDER:
            file_key = COLUMN_TO_FILE_MAP.get(column)
            if not file_key or file_key not in data_sources:
                options_data["options"][column] = [] # 未找到选项
                continue

            source_data = data_sources[file_key]
            if isinstance(source_data, dict):
                # 对于字典，提供键作为选项
                 options_data["options"][column] = list(source_data.keys())
            elif isinstance(source_data, list):
                 # 对于列表（如complain），返回标记或空列表供UI使用
                 if column == "complain":
                     options_data["options"][column] = ["(Complain values not suitable for direct selection)"]
                 else:
                      options_data["options"][column] = source_data # 如果是列表源，则使用值
            else:
                 options_data["options"][column] = [] # 未知类型

        return options_data

    except Exception as e:
        print(f"Error getting config options: {e}")
        raise HTTPException(status_code=500, detail=f"Could not load configuration options: {e}")

@app.get("/api/files", response_model=List[str])
def list_generated_files():
    """Lists CSV files in the output directory."""
    csv_files = []
    print(f"正在查找文件，输出目录路径: {OUTPUT_DIR}")
    if not os.path.isdir(OUTPUT_DIR):
        # If output dir doesn't exist, return empty list
        print(f"警告: 输出目录不存在: {OUTPUT_DIR}")
        # 尝试创建目录
        try:
            os.makedirs(OUTPUT_DIR, exist_ok=True)
            print(f"已创建输出目录: {OUTPUT_DIR}")
        except Exception as e:
            print(f"创建输出目录失败: {e}")
        return csv_files
    try:
        # 列出目录内容
        dir_contents = os.listdir(OUTPUT_DIR)
        print(f"目录内容: {dir_contents}")
        
        for filename in dir_contents:
            file_path = os.path.join(OUTPUT_DIR, filename)
            if filename.lower().endswith(".csv") and os.path.isfile(file_path):
                print(f"找到CSV文件: {filename}")
                csv_files.append(filename)
            else:
                print(f"跳过非CSV文件或非文件项: {filename}")
        
        csv_files.sort(reverse=True) # Sort by name, newest first if timestamp is used
        print(f"排序后的文件列表: {csv_files}")
    except OSError as e:
        print(f"列出目录内容时出错 {OUTPUT_DIR}: {e}")
        # 尝试列出父目录
        try:
            parent_dir = os.path.dirname(OUTPUT_DIR)
            print(f"尝试列出父目录 {parent_dir}: {os.listdir(parent_dir)}")
        except Exception as sub_e:
            print(f"列出父目录失败: {sub_e}")
    except Exception as e:
        print(f"意外错误: {e}")
    
    return csv_files

@app.get("/api/files/download/{filename}")
async def download_file(filename: str):
    """Downloads a specific CSV file."""
    print(f"请求下载文件: {filename}")
    
    # Basic security: prevent path traversal
    if "/" in filename or "\\" in filename or ".." in filename:
        print(f"文件名包含非法字符: {filename}")
        raise HTTPException(status_code=400, detail="Invalid filename.")

    file_path = os.path.join(OUTPUT_DIR, filename)
    print(f"文件完整路径: {file_path}")

    if not os.path.isfile(file_path):
        print(f"文件不存在: {file_path}")
        # 尝试列出目录内容
        try:
            print(f"输出目录内容: {os.listdir(OUTPUT_DIR)}")
        except Exception as e:
            print(f"无法列出目录内容: {e}")
        raise HTTPException(status_code=404, detail="File not found.")

    # 检查文件大小和权限
    try:
        file_stats = os.stat(file_path)
        print(f"文件大小: {file_stats.st_size} 字节")
        print(f"文件权限: {oct(file_stats.st_mode)}")
    except Exception as e:
        print(f"获取文件信息失败: {e}")

    # Check if the resolved path is still within the intended output directory
    # (Extra safety measure)
    if os.path.commonprefix((os.path.realpath(file_path), OUTPUT_DIR)) != OUTPUT_DIR:
        print(f"安全检查失败: {file_path} 不在 {OUTPUT_DIR} 内")
        raise HTTPException(status_code=403, detail="Access denied.")

    print(f"准备返回文件: {file_path}")
    return FileResponse(path=file_path, media_type='text/csv', filename=filename)

@app.post("/api/generate")
async def trigger_generation():
    """Triggers the profile generation script synchronously."""
    # Ensure the config file exists before trying to run
    if not os.path.isfile(CONFIG_FILE):
        print(f"配置文件不存在: {CONFIG_FILE}")
        # 尝试创建基本配置文件
        try:
            os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
            with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
                json.dump({"num_profiles": 10, "output_dir": OUTPUT_DIR, "profile_sources_dir": PARENT_PROFILE_DIR}, f, indent=2)
            print(f"已创建默认配置文件: {CONFIG_FILE}")
        except Exception as e:
            print(f"创建默认配置文件失败: {e}")
            raise HTTPException(status_code=500, detail=f"无法创建配置文件: {e}")
    
    if not os.path.isfile(GENERATOR_SCRIPT):
        print(f"生成器脚本不存在: {GENERATOR_SCRIPT}")
        raise HTTPException(status_code=500, detail=f"Generator script not found: {GENERATOR_SCRIPT}")

    # 确保输出目录存在
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"确保输出目录存在: {OUTPUT_DIR}")

    command = [
        PYTHON_EXECUTABLE,
        GENERATOR_SCRIPT,
        "--config",
        CONFIG_FILE
    ]

    try:
        # Run the script synchronously
        print(f"运行命令: {' '.join(command)}")
        result = subprocess.run(
            command,
            capture_output=True, # Capture stdout/stderr
            text=True, # Decode output as text
            check=False, # Don't raise exception on non-zero exit code automatically
        )

        print(f"脚本标准输出:\n{result.stdout}")
        if result.stderr:
            print(f"脚本错误输出:\n{result.stderr}")

        # 生成后检查输出目录中的文件
        try:
            files_after = os.listdir(OUTPUT_DIR)
            print(f"生成后输出目录内容: {files_after}")
        except Exception as e:
            print(f"无法列出生成后的输出目录内容: {e}")

        if result.returncode == 0:
            return JSONResponse(content={"message": "生成成功!", "output": result.stdout})
        else:
            # Return 500 for internal server error if script fails
            raise HTTPException(status_code=500, detail=f"生成脚本失败，返回码 {result.returncode}. 错误: {result.stderr or result.stdout}")

    except Exception as e:
        print(f"运行生成脚本时出错: {e}")
        raise HTTPException(status_code=500, detail=f"运行生成器时发生意外错误: {e}")

# 运行命令 (在 webapp 目录下): uvicorn main:app --reload
if __name__ == "__main__":
    # 这仅用于开发环境下的直接运行测试，生产环境推荐用 uvicorn 命令启动
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True) 