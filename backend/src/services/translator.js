import axios from 'axios';

const TRANSLATE_API = 'https://api.mymemory.translated.net/get';

const languageCache = new Map();

function detectLanguage(text) {
  const chineseRegex = /[\u4e00-\u9fff]/;
  return chineseRegex.test(text) ? 'zh-CN' : 'en';
}

function isChinese(text) {
  const chineseRegex = /[\u4e00-\u9fff]/;
  return chineseRegex.test(text);
}

async function translateToChinese(text) {
  if (!text || isChinese(text)) {
    return null;
  }
  
  const cacheKey = text.substring(0, 50);
  if (languageCache.has(cacheKey)) {
    return languageCache.get(cacheKey);
  }
  
  try {
    const response = await axios.get(TRANSLATE_API, {
      params: {
        q: text,
        langpair: `en|zh-CN`
      },
      timeout: 5000
    });
    
    if (response.data && response.data.responseStatus === 200) {
      const translatedText = response.data.responseData.translatedText;
      languageCache.set(cacheKey, translatedText);
      
      if (languageCache.size > 100) {
        const firstKey = languageCache.keys().next().value;
        languageCache.delete(firstKey);
      }
      
      return translatedText;
    }
  } catch (error) {
    console.error('[Translator] 翻译失败:', error.message);
  }
  
  return null;
}

async function translateBatch(texts) {
  const results = await Promise.all(
    texts.map(text => translateToChinese(text))
  );
  return results;
}

export {
  translateToChinese,
  translateBatch,
  detectLanguage,
  isChinese
};
