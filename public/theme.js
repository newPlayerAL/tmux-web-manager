'use strict';

try {
  const storedLanguage = localStorage.getItem('language');
  document.documentElement.lang = storedLanguage === 'zh-CN' || storedLanguage === 'en'
    ? storedLanguage
    : (navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en');
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.dataset.theme = 'dark';
  }
  const fontSize = Number.parseInt(localStorage.getItem('fontSize') || '', 10);
  if ([14, 16, 18, 20, 22, 24].includes(fontSize)) {
    document.documentElement.style.fontSize = `${fontSize}px`;
  }
} catch {
  // Keep the default language, light theme and font size when storage is unavailable.
}
