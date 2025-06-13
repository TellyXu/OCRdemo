#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OCR API 测试脚本
使用方法: python test_ocr_api.py <文件路径>
"""

import sys
import time
import requests
import shutil
import math
from pathlib import Path

API_BASE_URL = "http://209.20.156.150:8000"

# ANSI 颜色代码
class Colors:
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    CYAN = '\033[96m'
    MAGENTA = '\033[95m'

def get_terminal_width():
    """获取终端宽度"""
    try:
        return shutil.get_terminal_size().columns
    except:
        return 80

def print_progress_bar(iteration, total, prefix='', suffix='', length=None, fill='█', empty='░', print_end="\r"):
    """
    显示进度条
    @params:
        iteration   - 当前迭代次数
        total       - 总迭代次数
        prefix      - 前缀字符串
        suffix      - 后缀字符串
        length      - 进度条长度
        fill        - 进度条填充字符
        print_end   - 结束字符
    """
    # 获取终端宽度，计算进度条长度
    if length is None:
        terminal_width = get_terminal_width()
        # 预留前后缀和百分比的空间
        length = min(50, terminal_width - len(prefix) - len(suffix) - 10)
    
    # 计算进度和完成的大小
    percent = ("{0:.1f}").format(100 * (iteration / float(total)))
    filled_length = int(length * iteration // total)
    bar = fill * filled_length + empty * (length - filled_length)
    
    # 构建彩色进度条
    if iteration / float(total) < 0.3:
        color = Colors.YELLOW
    elif iteration / float(total) < 0.7:
        color = Colors.BLUE
    else:
        color = Colors.GREEN
    
    colored_bar = color + bar + Colors.ENDC
    
    # 输出进度条
    progress_line = f'\r{prefix} |{colored_bar}| {percent}% {suffix}'
    print(progress_line, end=print_end)
    
    # 完成时换行
    if iteration == total:
        print()

def test_ocr_api(file_path):
    """测试 OCR API"""
    file_path = Path(file_path)
    
    if not file_path.exists():
        print(f"{Colors.RED}❌ 文件不存在: {file_path}{Colors.ENDC}")
        return
    
    # 检查文件类型
    allowed_extensions = {'.pdf', '.png', '.jpg', '.jpeg'}
    if file_path.suffix.lower() not in allowed_extensions:
        print(f"{Colors.RED}❌ 不支持的文件类型: {file_path.suffix}{Colors.ENDC}")
        print(f"   支持的格式: {', '.join(allowed_extensions)}")
        return
    
    print(f"{Colors.BOLD}📄 准备上传文件: {Colors.CYAN}{file_path.name}{Colors.ENDC}")
    print(f"   文件大小: {Colors.YELLOW}{file_path.stat().st_size / 1024:.1f} KB{Colors.ENDC}")
    
    # 1. 上传文件
    print(f"\n{Colors.BOLD}🚀 正在上传文件...{Colors.ENDC}")
    try:
        with open(file_path, 'rb') as f:
            files = {'file': (file_path.name, f, 'application/octet-stream')}
            response = requests.post(f"{API_BASE_URL}/convert", files=files)
        
        if response.status_code != 200:
            print(f"{Colors.RED}❌ 上传失败: {response.status_code}{Colors.ENDC}")
            print(f"   响应: {response.text}")
            return
        
        result = response.json()
        task_id = result['task_id']
        print(f"{Colors.GREEN}✅ 上传成功! {Colors.ENDC}")
        print(f"   Task ID: {Colors.YELLOW}{task_id}{Colors.ENDC}")
        
    except Exception as e:
        print(f"{Colors.RED}❌ 上传出错: {e}{Colors.ENDC}")
        return
    
    # 2. 轮询任务状态
    print(f"\n{Colors.BOLD}⏳ 正在处理中...{Colors.ENDC}")
    max_attempts = 60
    
    # 显示一个动画的识别中提示
    animation = "|/-\\"
    try:
        for i in range(max_attempts):
            response = requests.get(f"{API_BASE_URL}/task/{task_id}")
            if response.status_code != 200:
                print(f"\n{Colors.RED}❌ 获取状态失败: {response.status_code}{Colors.ENDC}")
                return
            
            status_data = response.json()
            status = status_data['status']
            
            if status == 'completed':
                print_progress_bar(max_attempts, max_attempts, prefix=f'{Colors.BOLD}进度:', suffix=f'{Colors.GREEN}完成!{Colors.ENDC}', length=40)
                print(f"\n{Colors.GREEN}✅ 处理完成!{Colors.ENDC}")
                break
            elif status == 'failed':
                print(f"\n{Colors.RED}❌ 处理失败: {status_data.get('message', '未知错误')}{Colors.ENDC}")
                return
            else:
                # 更新进度条
                anim_char = animation[i % len(animation)]
                print_progress_bar(i + 1, max_attempts, prefix=f'{Colors.BOLD}进度:', 
                                 suffix=f'{anim_char} 识别中... {Colors.CYAN}{i+1}/{max_attempts}{Colors.ENDC}', length=40)
                time.sleep(2)
                
        else:
            print(f"\n{Colors.RED}❌ 处理超时{Colors.ENDC}")
            return
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}⚠️  操作已取消{Colors.ENDC}")
        return
    except Exception as e:
        print(f"\n{Colors.RED}❌ 查询状态出错: {e}{Colors.ENDC}")
        return
    
    # 3. 获取结果
    print(f"\n{Colors.BOLD}📥 获取识别结果...{Colors.ENDC}")
    try:
        # 获取 Markdown 结果
        response = requests.get(f"{API_BASE_URL}/result/{task_id}")
        if response.status_code == 200:
            markdown_content = response.text
            
            divider = "=" * min(get_terminal_width(), 80)
            print(f"\n{Colors.CYAN}{divider}")
            print(f"📝 Markdown 结果:")
            print(f"{divider}{Colors.ENDC}")
            
            # 截取预览内容，最多显示20行
            preview_lines = markdown_content.split('\n')[:20]
            preview = '\n'.join(preview_lines)
            
            # 如果内容被截断，添加提示
            if len(markdown_content.split('\n')) > 20:
                preview += f"\n{Colors.YELLOW}... 内容过长，已截断显示 ...{Colors.ENDC}"
                
            print(preview)
            print(f"{Colors.CYAN}{divider}{Colors.ENDC}")
            
            # 保存结果
            output_file = file_path.stem + "_result.md"
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(markdown_content)
            print(f"\n{Colors.GREEN}✅ 结果已保存到: {Colors.BOLD}{output_file}{Colors.ENDC}")
        
        # 获取 JSON 结果链接
        print(f"\n{Colors.MAGENTA}🔗 结果链接:{Colors.ENDC}")
        print(f"   Markdown: {Colors.BLUE}{API_BASE_URL}/result/{task_id}{Colors.ENDC}")
        print(f"   JSON: {Colors.BLUE}{API_BASE_URL}/json/{task_id}{Colors.ENDC}")
        
    except Exception as e:
        print(f"\n{Colors.RED}❌ 获取结果出错: {e}{Colors.ENDC}")

def main():
    if len(sys.argv) != 2:
        print(f"{Colors.YELLOW}使用方法: python test_ocr_api.py <文件路径>{Colors.ENDC}")
        print(f"示例: python test_ocr_api.py test.png")
        sys.exit(1)
    
    file_path = sys.argv[1]
    test_ocr_api(file_path)

if __name__ == "__main__":
    main() 