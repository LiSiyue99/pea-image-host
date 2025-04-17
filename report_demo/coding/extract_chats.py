import json
import os
import sys
from datetime import datetime
import shutil
import re
import ntpath

def parse_timestamp(timestamp):
    """Convert millisecond timestamp to readable format."""
    dt = datetime.fromtimestamp(timestamp / 1000)
    return dt.strftime("%Y-%m-%d %H:%M:%S")

def extract_chats(folder_path, is_subdirectory=False):
    """Extract chat histories from all message_export files in given folder and subfolders."""
    # Results storage
    file_conversations = {}  # 按文件存储对话
    file_user_prompts = {}   # 按文件存储用户提示
    
    # 检查目录是否存在
    if not os.path.exists(folder_path):
        print(f"错误: 目录 '{folder_path}' 不存在")
        return {}, {}
    
    if is_subdirectory:
        # 如果是子目录模式，只处理当前目录下的JSON文件，不递归
        files = [f for f in os.listdir(folder_path) if f.startswith("messages_export_") and f.endswith(".json")]
        for file in files:
            file_path = os.path.join(folder_path, file)
            conversations, user_prompts = process_file(file_path)
            if conversations:
                file_conversations[file_path] = conversations
                file_user_prompts[file_path] = user_prompts
    else:
        # 递归处理所有子目录
        for root, dirs, files in os.walk(folder_path):
            for file in files:
                if file.startswith("messages_export_") and file.endswith(".json"):
                    file_path = os.path.join(root, file)
                    conversations, user_prompts = process_file(file_path)
                    if conversations:
                        file_conversations[file_path] = conversations
                        file_user_prompts[file_path] = user_prompts
    
    return file_conversations, file_user_prompts

def process_file(file_path):
    """处理单个JSON文件并按文件提取会话和用户提示。"""
    print(f"处理文件: {file_path}...")
    
    # 存储结果
    conversations = {}  # 存储对话
    user_prompts = []   # 存储用户提示
    
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        # 处理文件中的每条消息
        for msg in data:
            chat_id = msg["chat_id"]
            message_type = msg["message_type"]
            content = msg["content"]
            context = msg.get("context", "[]")
            timestamp = msg["created_at"]
            message_id = msg["id"]
            
            # 如果会话不存在则初始化
            if chat_id not in conversations:
                conversations[chat_id] = {
                    "messages": [],
                    "file_source": file_path
                }
            
            # 添加到会话中
            conversations[chat_id]["messages"].append({
                "id": message_id,
                "type": message_type,
                "content": content,
                "context": context,
                "timestamp": timestamp,
                "readable_time": parse_timestamp(timestamp)
            })
            
            # 如果是用户消息，添加到用户提示列表
            if message_type == "user":
                user_prompts.append({
                    "chat_id": chat_id,
                    "id": message_id,
                    "content": content,
                    "context": context,
                    "timestamp": timestamp,
                    "readable_time": parse_timestamp(timestamp),
                    "file_source": file_path
                })
        
        # 对所有会话按时间戳排序
        for chat_id in conversations:
            conversations[chat_id]["messages"].sort(key=lambda x: x["timestamp"])
        
        # 对用户提示按时间戳排序
        user_prompts.sort(key=lambda x: x["timestamp"])
        
        return conversations, user_prompts
        
    except Exception as e:
        print(f"处理文件 {file_path} 时出错: {e}")
        return {}, []

def format_full_conversation(conversation):
    """Format the full conversation with clear user/AI distinction."""
    output = []
    output.append(f"对话ID: {conversation['chat_id']}")
    output.append(f"源文件: {conversation['file_source']}")
    output.append("=" * 80)
    
    for i, msg in enumerate(conversation["messages"]):
        speaker = "用户" if msg["type"] == "user" else "AI"
        output.append(f"[{i+1}] {speaker} ({msg['readable_time']}):")
        output.append("-" * 40)
        output.append(msg["content"])
        
        # Add context info if it's not empty
        if msg["context"] != "[]":
            output.append("\n上下文:")
            try:
                context_data = json.loads(msg["context"])
                if context_data:
                    for ctx in context_data:
                        output.append(f"  - 文件: {ctx.get('path', '未知')}, 版本: {ctx.get('version', '未知')}")
            except:
                output.append(f"  {msg['context']}")
                
        output.append("\n" + "=" * 80)
    
    return "\n".join(output)

def format_user_prompts(prompts, source_file):
    """Format only the user prompts history."""
    output = []
    output.append(f"用户提示历史 - 源自: {source_file}")
    output.append("=" * 80)
    
    for i, prompt in enumerate(prompts):
        output.append(f"[{i+1}] 时间: {prompt['readable_time']}")
        output.append(f"对话ID: {prompt['chat_id']}")
        output.append("-" * 40)
        output.append(prompt["content"])
        
        # Add context info if it's not empty
        if prompt["context"] != "[]":
            output.append("\n上下文:")
            try:
                context_data = json.loads(prompt["context"])
                if context_data:
                    for ctx in context_data:
                        output.append(f"  - 文件: {ctx.get('path', '未知')}, 版本: {ctx.get('version', '未知')}")
            except:
                output.append(f"  {prompt['context']}")
                
        output.append("\n" + "=" * 80)
    
    return "\n".join(output)

def get_file_basename(file_path):
    """从文件路径中提取基本文件名（不含扩展名）"""
    # 提取文件名（含扩展名）
    filename = os.path.basename(file_path)
    # 去除扩展名
    basename = os.path.splitext(filename)[0]
    return basename

def save_results_by_file(file_conversations, file_user_prompts, output_dir):
    """保存结果，按原始文件名组织"""
    # 创建输出目录
    os.makedirs(output_dir, exist_ok=True)
    
    # 保存每个文件的对话和用户提示
    all_conversations = {}
    all_user_prompts = []
    
    for file_path, conversations in file_conversations.items():
        # 获取基本文件名
        basename = get_file_basename(file_path)
        
        # 创建该文件的输出子目录
        file_output_dir = os.path.join(output_dir, basename)
        os.makedirs(file_output_dir, exist_ok=True)
        
        # 保存对话文件
        for chat_id, conversation in conversations.items():
            # 格式化数据
            conversation_data = {
                "chat_id": chat_id,
                "file_source": conversation["file_source"],
                "messages": conversation["messages"]
            }
            
            # 保存格式化文本
            with open(f"{file_output_dir}/{basename}_conversation_{chat_id[:8]}.txt", "w", encoding="utf-8") as f:
                f.write(format_full_conversation(conversation_data))
            
            # 保存原始JSON
            with open(f"{file_output_dir}/{basename}_conversation_{chat_id[:8]}.json", "w", encoding="utf-8") as f:
                json.dump(conversation_data, f, ensure_ascii=False, indent=2)
            
            # 添加到总结果
            all_conversations[chat_id] = conversation_data
        
        # 保存该文件的用户提示
        user_prompts = file_user_prompts.get(file_path, [])
        if user_prompts:
            # 保存格式化文本
            with open(f"{file_output_dir}/{basename}_user_prompts.txt", "w", encoding="utf-8") as f:
                f.write(format_user_prompts(user_prompts, file_path))
            
            # 保存原始JSON
            with open(f"{file_output_dir}/{basename}_user_prompts.json", "w", encoding="utf-8") as f:
                json.dump(user_prompts, f, ensure_ascii=False, indent=2)
            
            # 添加到总结果
            all_user_prompts.extend(user_prompts)
        
        print(f"\n从 '{basename}' 提取的结果已保存到 '{file_output_dir}'")
        print(f"- 提取了 {len(conversations)} 个对话")
        print(f"- 提取了 {len(user_prompts)} 个用户提示")
    
    # 按文件名保存全部合并结果
    if all_conversations:
        # 创建all目录
        all_dir = os.path.join(output_dir, "all")
        os.makedirs(all_dir, exist_ok=True)
        
        # 对所有用户提示按时间排序
        all_user_prompts.sort(key=lambda x: x["timestamp"])
        
        # 保存所有对话和提示
        with open(f"{all_dir}/all_user_prompts.txt", "w", encoding="utf-8") as f:
            f.write(format_user_prompts(all_user_prompts, "所有文件"))
        
        with open(f"{all_dir}/all_user_prompts.json", "w", encoding="utf-8") as f:
            json.dump(all_user_prompts, f, ensure_ascii=False, indent=2)
        
        print(f"\n所有合并结果已保存到 '{all_dir}'")
        print(f"- 总共 {len(all_conversations)} 个对话")
        print(f"- 总共 {len(all_user_prompts)} 个用户提示")

def process_all_json(base_folder):
    """处理所有JSON文件，包括整合所有结果"""
    print(f"处理所有JSON文件，基础目录: {base_folder}")
    
    # 检查是否在当前目录下直接有子目录02和03
    has_number_dirs = False
    for item in os.listdir(base_folder):
        if os.path.isdir(os.path.join(base_folder, item)) and re.match(r'^[0-9]{2}$', item):
            has_number_dirs = True
            break
    
    # 存储所有文件的会话和提示
    all_file_conversations = {}
    all_file_user_prompts = {}
    
    # 如果存在数字目录，直接处理这些目录
    if has_number_dirs:
        for subdir in os.listdir(base_folder):
            # 只处理形如"02"、"03"的目录
            if not os.path.isdir(os.path.join(base_folder, subdir)) or not re.match(r'^[0-9]{2}$', subdir):
                continue
                
            subdir_path = os.path.join(base_folder, subdir)
            print(f"\n处理子目录: {subdir_path}")
            
            # 处理当前子目录中的JSON文件
            file_conversations, file_user_prompts = extract_chats(subdir_path, is_subdirectory=True)
            
            # 为子目录创建输出目录
            output_dir = os.path.join(subdir_path, "extracts")
            
            # 保存子目录的结果
            if file_conversations:
                save_results_by_file(file_conversations, file_user_prompts, output_dir)
                
                # 添加到总结果
                all_file_conversations.update(file_conversations)
                all_file_user_prompts.update(file_user_prompts)
    else:
        # 直接查找当前目录下的JSON文件
        print("\n未找到数字子目录，尝试直接处理当前目录下的JSON文件...")
        file_conversations, file_user_prompts = extract_chats(base_folder, is_subdirectory=True)
        
        if file_conversations:
            # 为当前目录创建输出目录
            output_dir = os.path.join(base_folder, "extracts")
            save_results_by_file(file_conversations, file_user_prompts, output_dir)
            
            # 添加到总结果
            all_file_conversations.update(file_conversations)
            all_file_user_prompts.update(file_user_prompts)
    
    # 创建一个合并的输出目录
    all_output_dir = os.path.join(base_folder, "all_extracts")
    
    # 保存所有结果
    if all_file_conversations:
        save_results_by_file(all_file_conversations, all_file_user_prompts, all_output_dir)
        print(f"\n所有数据已合并保存到: {all_output_dir}")
    else:
        print("\n没有找到任何对话数据")

def normalize_path(path):
    """规范化路径，去除多余的分隔符和相对路径"""
    # 获取绝对路径，解析.和..
    abs_path = os.path.abspath(path)
    return abs_path

def main():
    if len(sys.argv) < 2:
        # 如果没有提供参数，尝试处理当前目录
        folder_path = os.getcwd()
        mode = "all"
        print(f"未提供路径参数，将处理当前目录: {folder_path}")
    else:
        folder_path = sys.argv[1]
        mode = sys.argv[2] if len(sys.argv) > 2 else None
    
    # 规范化路径
    folder_path = normalize_path(folder_path)
    
    # 检查路径是否存在
    if not os.path.exists(folder_path):
        # 尝试在当前目录下查找
        current_dir = os.getcwd()
        possible_path = os.path.join(current_dir, os.path.basename(folder_path))
        
        if os.path.exists(possible_path):
            print(f"找到路径: {possible_path}")
            folder_path = possible_path
        else:
            print(f"错误: 文件夹 '{folder_path}' 不存在。")
            sys.exit(1)
    
    print(f"处理路径: {folder_path}")
    
    if mode == "all":
        # 处理所有JSON文件并整合
        process_all_json(folder_path)
    else:
        # 处理单个目录
        output_dir = os.path.join(folder_path, "extracts")
        print(f"从 '{folder_path}' 提取聊天历史...")
        file_conversations, file_user_prompts = extract_chats(folder_path, is_subdirectory=True)
        
        # 保存结果
        if file_conversations:
            save_results_by_file(file_conversations, file_user_prompts, output_dir)
        else:
            print("未找到任何对话数据")

if __name__ == "__main__":
    main() 