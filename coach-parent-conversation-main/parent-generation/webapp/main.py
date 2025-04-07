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
CONFIG_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "configs")) # Config dir path
SRC_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "src")) # Script dir path
PARENT_PROFILE_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "parent-profile"))

CONFIG_FILE = os.path.join(CONFIG_DIR, "generation_config.json") # Default config file path
GENERATOR_SCRIPT = os.path.join(SRC_DIR, "generate_profiles.py") # Generator script path
PYTHON_EXECUTABLE = sys.executable # Path to current python interpreter

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
    if not os.path.isdir(OUTPUT_DIR):
        # If output dir doesn't exist, return empty list
        return csv_files
    try:
        for filename in os.listdir(OUTPUT_DIR):
            if filename.lower().endswith(".csv") and os.path.isfile(os.path.join(OUTPUT_DIR, filename)):
                csv_files.append(filename)
        csv_files.sort(reverse=True) # Sort by name, newest first if timestamp is used
    except OSError as e:
        print(f"Error listing files in {OUTPUT_DIR}: {e}")
        # Optionally raise an HTTPException here, but returning empty might be okay too
        # raise HTTPException(status_code=500, detail="Error listing files")
    return csv_files

@app.get("/api/files/download/{filename}")
async def download_file(filename: str):
    """Downloads a specific CSV file."""
    # Basic security: prevent path traversal
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename.")

    file_path = os.path.join(OUTPUT_DIR, filename)

    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File not found.")

    # Check if the resolved path is still within the intended output directory
    # (Extra safety measure)
    if os.path.commonprefix((os.path.realpath(file_path), OUTPUT_DIR)) != OUTPUT_DIR:
         raise HTTPException(status_code=403, detail="Access denied.")

    return FileResponse(path=file_path, media_type='text/csv', filename=filename)

@app.post("/api/generate")
async def trigger_generation():
    """Triggers the profile generation script synchronously."""
    # Ensure the config file exists before trying to run
    if not os.path.isfile(CONFIG_FILE):
        raise HTTPException(status_code=500, detail=f"Configuration file not found: {CONFIG_FILE}")
    if not os.path.isfile(GENERATOR_SCRIPT):
        raise HTTPException(status_code=500, detail=f"Generator script not found: {GENERATOR_SCRIPT}")

    command = [
        PYTHON_EXECUTABLE,
        GENERATOR_SCRIPT,
        "--config",
        CONFIG_FILE
    ]

    try:
        # Run the script synchronously
        # Use cwd=SRC_DIR if the script relies on relative paths from src
        # Or adjust paths in the script if needed to be absolute
        print(f"Running command: {' '.join(command)}")
        result = subprocess.run(
            command,
            capture_output=True, # Capture stdout/stderr
            text=True, # Decode output as text
            check=False, # Don't raise exception on non-zero exit code automatically
            # cwd=SRC_DIR # Setting CWD might simplify path handling in the script
            # It seems the script already uses absolute paths based on its own location, so CWD might not be strictly needed
        )

        print(f"Script STDOUT:\n{result.stdout}")
        if result.stderr:
            print(f"Script STDERR:\n{result.stderr}")

        if result.returncode == 0:
            return JSONResponse(content={"message": "Generation completed successfully!", "output": result.stdout})
        else:
            # Return 500 for internal server error if script fails
            raise HTTPException(status_code=500, detail=f"Generation script failed with exit code {result.returncode}. Error: {result.stderr or result.stdout}")

    except Exception as e:
        print(f"Error running generation script: {e}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred while running the generator: {e}")

# 运行命令 (在 webapp 目录下): uvicorn main:app --reload
if __name__ == "__main__":
    # 这仅用于开发环境下的直接运行测试，生产环境推荐用 uvicorn 命令启动
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True) 