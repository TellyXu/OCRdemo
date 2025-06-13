import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import '../styles/Home.css';

// 使用代理URL
const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? '/api'  // 开发环境使用代理
  : 'http://209.20.156.150:8000'; // 生产环境使用实际URL

// 初始化 markdown-it 实例
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (__) {}
    }
    return '';
  }
});

const Home = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileInfo, setFileInfo] = useState({ name: '', size: 0 });
  const [status, setStatus] = useState({ show: false, message: '', type: '', progress: null });
  const [result, setResult] = useState(null);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [activeTab, setActiveTab] = useState('rendered');
  const [showCorsNotice, setShowCorsNotice] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // 检测是否需要本地模式
    const isLocalFile = window.location.protocol === 'file:';
    if (isLocalFile) {
      console.warn("在本地文件模式下运行可能会遇到跨域问题。建议通过本地开发服务器运行此应用。");
      setIsLocalMode(true);
    }
  }, []);

  const handleFileSelect = (file) => {
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setStatus({
        show: true,
        message: '请选择 PDF、PNG 或 JPEG 格式的文件',
        type: 'error'
      });
      return;
    }

    setSelectedFile(file);
    setFileInfo({
      name: file.name,
      size: formatFileSize(file.size)
    });
    setStatus({ show: false });
    setShowCorsNotice(false);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const escapeHtml = (text) => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setStatus({
      show: true,
      message: '正在上传文件...',
      type: 'processing'
    });

    try {
      // 在本地模式下使用模拟数据
      if (isLocalMode) {
        await simulateProcessing();
      } else {
        // 正常上传文件
        const formData = new FormData();
        formData.append('file', selectedFile);

        const uploadResponse = await axios.post(`${API_BASE_URL}/convert`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        const taskId = uploadResponse.data.task_id;

        setStatus({
          show: true,
          message: '文件已上传，正在识别中...',
          type: 'processing'
        });

        // 轮询检查任务状态
        const taskResult = await pollTaskStatus(taskId);
        
        // 获取结果
        const resultResponse = await axios.get(`${API_BASE_URL}/result/${taskId}`);
        const markdownText = resultResponse.data;
        
        // 设置结果
        setResult({
          markdown: markdownText,
          taskId: taskId
        });
      }

      setStatus({
        show: true,
        message: '识别完成！',
        type: 'success'
      });

    } catch (error) {
      console.error('Error:', error);
      setStatus({
        show: true,
        message: `处理失败：${error.message}`,
        type: 'error'
      });
      
      // 检查是否是跨域问题
      if (error.message.includes('Network Error') || 
          error.message.includes('CORS') || 
          error.code === 'ERR_NETWORK') {
        setShowCorsNotice(true);
      }
    }
  };

  // 模拟处理过程(用于本地模式)
  const simulateProcessing = async () => {
    // 模拟上传
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 模拟处理
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      setStatus({
        show: true,
        message: '正在识别中...',
        type: 'processing',
        progress: {
          current: i,
          total: steps
        }
      });
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 模拟结束，显示演示结果
    const demoMarkdown = generateDemoMarkdown(selectedFile.name);
    setResult({
      markdown: demoMarkdown,
      taskId: 'demo-123'
    });
  };

  // 生成演示用的Markdown文本
  const generateDemoMarkdown = (filename) => {
    const now = new Date().toLocaleString();
    return `# OCR 识别结果

## 文档信息

- **文件名**: ${filename}
- **处理时间**: ${now}
- **状态**: 完成

## 识别内容

这是一段演示文本，因为您正在本地模式下运行前端应用。要获取真实的OCR结果，需要解决跨域问题或部署到同源服务器。

### 示例段落

这是第一段文字。OCR技术使用计算机视觉和机器学习算法，从图像或PDF文档中提取文本内容。现代OCR系统可以识别多种语言和字体。

### 示例代码

\`\`\`python
def hello_ocr():
    print("欢迎使用OCR系统!")
    return "识别成功"

# 调用函数
result = hello_ocr()
\`\`\`

### 示例表格

| 项目 | 描述 | 状态 |
|------|------|------|
| 文本识别 | 识别文档中的文本内容 | ✅ |
| 表格识别 | 识别文档中的表格结构 | ✅ |
| 公式识别 | 识别数学公式 | ✅ |

## 注意事项

* 这只是一个演示结果
* 实际识别效果取决于原始文档质量
* 如需真实OCR处理，请解决跨域问题

感谢使用我们的OCR系统！
`;
  };

  // 轮询任务状态
  const pollTaskStatus = async (taskId) => {
    const maxAttempts = 60; // 最多等待60次
    const delay = 2000; // 每2秒检查一次

    for (let i = 0; i < maxAttempts; i++) {
      const response = await axios.get(`${API_BASE_URL}/task/${taskId}`);
      const taskStatus = response.data;

      if (taskStatus.status === 'completed') {
        return taskStatus;
      } else if (taskStatus.status === 'failed') {
        throw new Error(taskStatus.message || '处理失败');
      }

      // 更新状态信息
      setStatus({
        show: true,
        message: '正在识别中...',
        type: 'processing',
        progress: {
          current: i + 1,
          total: maxAttempts
        }
      });

      // 等待后继续
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    throw new Error('处理超时');
  };

  // 本地保存文件的辅助函数(用于本地模式)
  const saveTextAsFile = (text, filename) => {
    const blob = new Blob([text], {type: 'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownload = (type, taskId) => {
    if (isLocalMode) {
      if (type === 'markdown') {
        saveTextAsFile(result.markdown, 'result.md');
      } else {
        saveTextAsFile(JSON.stringify({text: '模拟数据'}, null, 2), 'result.json');
      }
    } else {
      const url = type === 'markdown' 
        ? `${API_BASE_URL}/result/${taskId}`
        : `${API_BASE_URL}/json/${taskId}`;
      window.open(url, '_blank');
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>📄 OCR 文档识别系统</h1>
        <p>支持 PDF、PNG、JPEG 格式文件的智能文字识别</p>
      </div>

      <div className="main-content">
        {/* 上传区域 */}
        <div className="card upload-section">
          <h2>上传文件</h2>
          <div 
            className="upload-area" 
            onClick={handleUploadClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={(e) => e.preventDefault()}
          >
            <div className="upload-icon">📤</div>
            <div className="upload-text">拖拽文件到此处或点击选择</div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="file-input" 
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => handleFileSelect(e.target.files[0])} 
            />
            <button className="upload-button">选择文件</button>
          </div>
          
          {fileInfo.name && (
            <div className="file-info">
              <div className="file-name">{fileInfo.name}</div>
              <div className="file-size">{fileInfo.size}</div>
            </div>
          )}

          <button 
            className="submit-button" 
            disabled={!selectedFile} 
            onClick={handleSubmit}
          >
            开始识别
          </button>

          {status.show && (
            <div className={`status ${status.type}`}>
              {status.type === 'processing' && (
                <>
                  <span className="loading"></span>
                  {status.message}
                  {status.progress && (
                    <>
                      <div className="progress-container">
                        <div className="progress-bar" style={{ width: `${Math.min(100, Math.round((status.progress.current / status.progress.total) * 100))}%` }}></div>
                      </div>
                      <div className="progress-text">
                        <span>{status.progress.current}/{status.progress.total}</span>
                        <span>{Math.min(100, Math.round((status.progress.current / status.progress.total) * 100))}%</span>
                      </div>
                    </>
                  )}
                </>
              )}
              {status.type !== 'processing' && status.message}
            </div>
          )}

          {showCorsNotice && (
            <div className="cors-notice">
              <strong>⚠️ 跨域访问错误</strong>
              <p>由于浏览器的安全限制，直接从本地文件访问远程API时会遇到跨域问题。要解决此问题，请尝试以下方法：</p>
              <ol>
                <li>使用开发服务器运行此应用（npm start）</li>
                <li>配置API服务器允许跨域请求</li>
                <li>使用代理服务器中转API请求</li>
              </ol>
            </div>
          )}
        </div>

        {/* 结果区域 */}
        <div className="card result-section">
          <h2>识别结果</h2>
          {!result ? (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <p>上传文件后，识别结果将在此显示</p>
            </div>
          ) : (
            <>
              {isLocalMode && (
                <div className="demo-warning">
                  <strong>📢 本地演示模式</strong>
                  <p>您正在本地模式下预览OCR功能。这是模拟的结果，不是真实的OCR处理结果。</p>
                </div>
              )}
              
              <div className="tabs">
                <div 
                  className={`tab ${activeTab === 'rendered' ? 'active' : ''}`}
                  onClick={() => setActiveTab('rendered')}
                >
                  <span className="tab-icon">📝</span>
                  <span>渲染视图</span>
                </div>
                <div 
                  className={`tab ${activeTab === 'source' ? 'active' : ''}`}
                  onClick={() => setActiveTab('source')}
                >
                  <span className="tab-icon">📄</span>
                  <span>源代码</span>
                </div>
              </div>
              
              <div className={`tab-content ${activeTab === 'rendered' ? 'active' : ''}`}>
                <div 
                  className="result-content markdown-body"
                  dangerouslySetInnerHTML={{ __html: md.render(result.markdown) }}
                ></div>
              </div>
              
              <div className={`tab-content ${activeTab === 'source' ? 'active' : ''}`}>
                <div className="result-content">
                  <button 
                    className="copy-button"
                    onClick={() => {
                      navigator.clipboard.writeText(result.markdown);
                      // 这里可以添加复制成功的反馈
                    }}
                  >
                    <span>复制</span>
                  </button>
                  <pre className="source-code">{result.markdown}</pre>
                </div>
              </div>
              
              <div className="result-actions">
                <button 
                  onClick={() => handleDownload('markdown', result.taskId)}
                  className="download-button"
                >
                  📥 下载 Markdown
                </button>
                <button 
                  onClick={() => handleDownload('json', result.taskId)}
                  className="download-button json"
                >
                  📊 下载 JSON
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home; 