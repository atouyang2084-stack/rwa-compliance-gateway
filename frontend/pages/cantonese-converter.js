import { useState, useEffect } from 'react';

// 粤语映射表
const cantoneseMap = {
  'de': '嘅',
  'shi': '系',
  'bu': '唔',
  'mei': '冇',
  'zai': '喺',
  'shenme': '咩',
  'zenme': '点解',
  'nimen': '你哋',
  'women': '我哋',
  'ta': '佢',
  'tamen': '佢哋',
  'hao': '好',
  'hen': '好',
  'xiang': '想',
  'yao': '要',
  'qu': '去',
  'lai': '嚟',
  'kan': '睇',
  'shuo': '讲',
  'ting': '听',
  'zou': '走',
  'chi': '食',
  'he': '饮',
  'shui': '瞓',
  'ganma': '做乜',
  'zenmeyang': '点样',
  'xiexie': '多谢',
  'bukeqi': '唔使客气',
  'zaijian': '再见',
  'haode': '好嘅',
  'mingbai': '明晒',
  'budong': '唔明',
  'hao ma': '得唔得',
  'yes': '系',
  'no': '唔系'
};

// 核心转换函数
const convertToCantonese = (pinyinInput) => {
  if (!pinyinInput) return '';
  
  // 分割拼音
  const pinyinWords = pinyinInput.toLowerCase().split(/\s+/);
  
  // 转换每个拼音
  const cantoneseWords = pinyinWords.map(word => {
    return cantoneseMap[word] || word;
  });
  
  return cantoneseWords.join(' ');
};

export default function CantoneseConverter() {
  const [pinyinInput, setPinyinInput] = useState('');
  const [cantoneseOutput, setCantoneseOutput] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // 实时转换
  useEffect(() => {
    const result = convertToCantonese(pinyinInput);
    setCantoneseOutput(result);
  }, [pinyinInput]);

  // 复制到剪贴板
  const handleCopy = () => {
    navigator.clipboard.writeText(cantoneseOutput)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(err => {
        console.error('复制失败:', err);
      });
  };

  // 复制并跳转WhatsApp
  const handleCopyAndWhatsApp = () => {
    navigator.clipboard.writeText(cantoneseOutput)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
        // 打开WhatsApp网页版
        window.open('https://web.whatsapp.com', '_blank');
      })
      .catch(err => {
        console.error('复制失败:', err);
      });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">粤语输入转换助手</h1>
        
        {/* 拼音输入框 */}
        <div className="mb-6">
          <label htmlFor="pinyin" className="block text-sm font-medium text-gray-700 mb-2">输入拼音</label>
          <textarea
            id="pinyin"
            value={pinyinInput}
            onChange={(e) => setPinyinInput(e.target.value)}
            placeholder="例如：ni hao shenme shi hou"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-32"
          />
        </div>
        
        {/* 粤语结果框 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">粤语口语</label>
          <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 min-h-32 flex items-center">
            <p className="text-gray-800">{cantoneseOutput || '转换结果将显示在这里'}</p>
          </div>
        </div>
        
        {/* 按钮区域 */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleCopy}
            className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors duration-200"
          >
            {copySuccess ? '复制成功！' : '复制结果'}
          </button>
          <button
            onClick={handleCopyAndWhatsApp}
            className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors duration-200"
          >
            复制并跳转 WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}