// Get tauri methods
const isTauri = typeof window.__TAURI__ !== 'undefined';
const invoke = isTauri ? window.__TAURI__.core.invoke : null;
const getCurrentWindow = isTauri ? window.__TAURI__.window.getCurrentWindow : null;

// Initialize Turndown (HTML to Markdown converter)
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

// DOM Elements
const docTitle = document.getElementById('doc-title');
const unsavedIndicator = document.getElementById('unsaved-indicator');
const editor = document.getElementById('markdown-editor');
const preview = document.getElementById('markdown-preview');
const editorPreviewContainer = document.getElementById('editor-preview-container');

// View Buttons
const viewEditor = document.getElementById('view-editor');
const viewRaw = document.getElementById('view-raw');
const viewSplit = document.getElementById('view-split');
const viewReader = document.getElementById('view-reader');

// Window Buttons
const winClose = document.getElementById('win-close');
const winMinimize = document.getElementById('win-minimize');
const winMaximize = document.getElementById('win-maximize');

// Sidebar Elements
const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
const sidebar = document.getElementById('sidebar');
const newFileBtn = document.getElementById('new-file-btn');
const openFileBtn = document.getElementById('open-file-btn');
const saveFileBtn = document.getElementById('save-file-btn');
const saveAsBtn = document.getElementById('save-as-btn');
const exportBtn = document.getElementById('export-btn');
const exportDropdownMenu = document.getElementById('export-dropdown-menu');
const exportPdfBtn = document.getElementById('export-pdf-btn');
const exportHtmlBtn = document.getElementById('export-html-btn');
const exportTxtBtn = document.getElementById('export-txt-btn');
const fontSelectBtn = document.getElementById('font-select-btn');
const recentFilesList = document.getElementById('recent-files-list');
const autosaveToggle = document.getElementById('autosave-toggle');
const saveStatus = document.getElementById('save-status');
const dragDropOverlay = document.getElementById('drag-drop-overlay');

// Toolbar Elements
const tabBar = document.getElementById('tab-bar');
const btnBold = document.getElementById('btn-bold');
const btnItalic = document.getElementById('btn-italic');
const btnUnderline = document.getElementById('btn-underline');
const btnH1 = document.getElementById('btn-h1');
const btnH2 = document.getElementById('btn-h2');
const btnH3 = document.getElementById('btn-h3');
const btnUl = document.getElementById('btn-ul');
const btnOl = document.getElementById('btn-ol');
const btnQuote = document.getElementById('btn-quote');
const btnCode = document.getElementById('btn-code');

// Footer Elements
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeIcon = document.getElementById('theme-icon');
const helpBtn = document.getElementById('help-btn');
const closeHelpBtn = document.getElementById('close-help-btn');
const helpDrawer = document.getElementById('help-drawer');
const wordCount = document.getElementById('word-count');
const lineCount = document.getElementById('line-count');

// Application State
let currentFilePath = null;
let currentFileContent = '';
let tabs = [];
let activeTabId = null;
let recentFiles = JSON.parse(localStorage.getItem('recentFiles')) || [];
let isRawMode = false; // true = Raw markdown, false = WYSIWYG rich text
let autosaveEnabled = localStorage.getItem('autosaveEnabled') === 'true';
let autosaveTimeout = null;
let saveStatusTimeout = null;

// Window Controls Setup
const appWindow = isTauri ? getCurrentWindow() : null;
if (isTauri) {
  winClose.addEventListener('click', () => appWindow.close());
  winMinimize.addEventListener('click', () => appWindow.minimize());
} else {
  // Hide desktop window controls in web browser mode
  document.querySelector('.win-controls').style.display = 'none';
}

// Dynamic Maximize / Restore handler
async function updateMaximizeButton() {
  if (!isTauri) return;
  const maximized = await appWindow.isMaximized();
  if (maximized) {
    winMaximize.title = 'Restaurar';
    winMaximize.innerHTML = `<svg viewBox="0 0 12 12"><path d="M4,2 L10,2 L10,8 M2,4 L8,4 L8,10 L2,10 Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"></path></svg>`;
  } else {
    winMaximize.title = 'Maximizar';
    winMaximize.innerHTML = `<svg viewBox="0 0 12 12"><path d="M3,3 L9,3 L9,9 L3,9 Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"></path></svg>`;
  }
}

if (isTauri) {
  winMaximize.addEventListener('click', async () => {
    await appWindow.toggleMaximize();
    setTimeout(updateMaximizeButton, 50);
  });

  appWindow.onResized(() => {
    updateMaximizeButton();
  });
}

// Helper: Get Markdown text from editor depending on current active mode
function getMarkdownContent() {
  if (isRawMode) {
    return editor.innerText || '';
  } else {
    return turndownService.turndown(editor.innerHTML);
  }
}

// View Mode Selector Setup
const viewButtons = [viewEditor, viewRaw, viewSplit, viewReader];
viewButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    viewButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    const viewMode = btn.dataset.view;
    
    // Transition Editor State based on active mode (BEFORE updating container class to avoid display: none innerText bug)
    if (viewMode === 'split' || viewMode === 'raw') {
      // Transition to RAW MARKDOWN mode (for split or pure raw editing)
      if (!isRawMode) {
        const markdownText = turndownService.turndown(editor.innerHTML);
        editor.innerText = markdownText;
        editor.classList.remove('markdown-body');
        editor.classList.add('raw-editor');
        document.querySelector('.editor-toolbar').classList.add('hidden');
        isRawMode = true;
      }
    } else {
      // Transition to WYSIWYG RICH TEXT mode (for both editor and reader views)
      if (isRawMode) {
        const markdownText = editor.innerText;
        editor.innerHTML = window.marked.parse(markdownText);
        editor.classList.add('markdown-body');
        editor.classList.remove('raw-editor');
        document.querySelector('.editor-toolbar').classList.remove('hidden');
        isRawMode = false;
      }
    }
    
    // Now update the layout class (which hides/shows panels)
    editorPreviewContainer.className = `view-${viewMode}`;
    
    // Render Markdown preview if split or reader mode
    if (viewMode === 'split' || viewMode === 'reader') {
      renderMarkdown();
    }
  });
});

// Sidebar Toggle
toggleSidebarBtn.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
});

// Theme Management
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
    document.body.classList.remove('light-theme');
    themeIcon.setAttribute('data-lucide', 'sun');
  } else {
    document.body.classList.add('light-theme');
    document.body.classList.remove('dark-theme');
    themeIcon.setAttribute('data-lucide', 'moon');
  }
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

themeToggleBtn.addEventListener('click', () => {
  const isDark = document.body.classList.contains('dark-theme');
  if (isDark) {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
    localStorage.setItem('theme', 'light');
    themeIcon.setAttribute('data-lucide', 'moon');
  } else {
    document.body.classList.remove('light-theme');
    document.body.classList.add('dark-theme');
    localStorage.setItem('theme', 'dark');
    themeIcon.setAttribute('data-lucide', 'sun');
  }
  window.lucide.createIcons();
});

// Help Drawer Toggle
helpBtn.addEventListener('click', () => {
  helpDrawer.classList.toggle('hidden');
});

closeHelpBtn.addEventListener('click', () => {
  helpDrawer.classList.add('hidden');
});

// Tab System Helpers
function generateTabId() {
  return 'tab-' + Math.random().toString(36).substr(2, 9);
}

function createTab(path = null, name = 'Sin Título', content = '') {
  // If the file is already open in a tab, switch to it!
  if (path) {
    const existingTab = tabs.find(t => t.path === path);
    if (existingTab) {
      switchTab(existingTab.id);
      return;
    }
  }

  // If there is only one tab, and it is the default empty tab, reuse/replace it!
  if (tabs.length === 1 && tabs[0].path === null && tabs[0].content === '' && !tabs[0].isDirty) {
    tabs[0].path = path;
    tabs[0].name = name;
    tabs[0].content = content;
    tabs[0].isDirty = false;
    switchTab(tabs[0].id);
    renderTabs();
    return;
  }

  const newId = generateTabId();
  const newTab = {
    id: newId,
    path: path,
    name: name,
    content: content,
    isDirty: false
  };

  tabs.push(newTab);
  renderTabs();
  switchTab(newId);
}

function switchTab(tabId) {
  if (activeTabId === tabId) return;

  // Save current editor state to the previous active tab
  if (activeTabId) {
    const prevTab = tabs.find(t => t.id === activeTabId);
    if (prevTab) {
      prevTab.content = getMarkdownContent();
    }
  }

  activeTabId = tabId;
  const activeTab = tabs.find(t => t.id === tabId);
  if (activeTab) {
    currentFilePath = activeTab.path;
    currentFileContent = activeTab.content;
    
    // Set text depending on isRawMode
    if (isRawMode) {
      editor.innerText = activeTab.content;
    } else {
      editor.innerHTML = window.marked.parse(activeTab.content);
    }
    
    docTitle.textContent = activeTab.name;
    updateCounts();
    checkUnsavedChanges();
    renderMarkdown();
    renderTabs();
  }
}

async function closeTab(tabId, e) {
  if (e) e.stopPropagation();

  const tabIndex = tabs.findIndex(t => t.id === tabId);
  if (tabIndex === -1) return;

  const tab = tabs[tabIndex];
  
  if (tabId === activeTabId) {
    tab.content = getMarkdownContent();
  }

  if (tab.isDirty) {
    const confirmDiscard = confirm(`¿Deseas descartar los cambios no guardados en "${tab.name}"?`);
    if (!confirmDiscard) return;
  }

  tabs.splice(tabIndex, 1);

  if (tabs.length === 0) {
    activeTabId = null;
    createTab();
    return;
  }

  if (activeTabId === tabId) {
    const nextActiveIndex = Math.min(tabIndex, tabs.length - 1);
    const nextActiveTab = tabs[nextActiveIndex];
    activeTabId = null; // force reload
    switchTab(nextActiveTab.id);
  } else {
    renderTabs();
  }
}

function renderTabs() {
  updateRecentFilesUI();
}

function renderTabsOnly() {
  tabs.forEach(tab => {
    const li = document.querySelector(`#recent-files-list li[data-tab-id="${tab.id}"]`);
    if (li) {
      let dirtyDot = li.querySelector('.tab-dirty-indicator');
      if (tab.isDirty && !dirtyDot) {
        dirtyDot = document.createElement('span');
        dirtyDot.className = 'tab-dirty-indicator';
        const closeBtn = li.querySelector('.recent-file-close-btn');
        li.insertBefore(dirtyDot, closeBtn);
      } else if (!tab.isDirty && dirtyDot) {
        dirtyDot.remove();
      }
    }
  });
}

// Editor Helper: Update Word & Line Counts
function updateCounts() {
  const text = getMarkdownContent();
  
  // Word count
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  wordCount.textContent = `${words} ${words === 1 ? 'palabra' : 'palabras'}`;
  
  // Line count
  const lines = text.split('\n').length;
  lineCount.textContent = `${lines} ${lines === 1 ? 'línea' : 'líneas'}`;
}

// Markdown Parser Setup
// Code block copy button injection
function addCodeCopyButtons() {
  const preElements = preview.querySelectorAll('pre');
  preElements.forEach(pre => {
    if (pre.parentElement.classList.contains('code-block-wrapper')) return;
    
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);
    
    const btn = document.createElement('button');
    btn.className = 'copy-code-btn';
    btn.title = 'Copiar Código';
    btn.innerHTML = '<i data-lucide="copy"></i>';
    
    btn.addEventListener('click', async () => {
      const code = pre.querySelector('code');
      const textToCopy = code ? code.innerText : pre.innerText;
      
      try {
        await navigator.clipboard.writeText(textToCopy);
        btn.classList.add('copied');
        btn.innerHTML = '<i data-lucide="check"></i>';
        window.lucide.createIcons();
        
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = '<i data-lucide="copy"></i>';
          window.lucide.createIcons();
        }, 2000);
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    });
    
    wrapper.appendChild(btn);
  });
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function renderMarkdown() {
  const markdownText = getMarkdownContent();
  if (window.marked) {
    window.marked.setOptions({
      breaks: true,
      gfm: true,
      headerIds: true
    });
    
    // Parse Markdown to HTML
    const htmlContent = window.marked.parse(markdownText);
    preview.innerHTML = htmlContent;
    
    // Highlight Code blocks with Prism
    if (window.Prism) {
      window.Prism.highlightAllUnder(preview);
    }

    // Inject copy buttons
    addCodeCopyButtons();
  }
}

// Unsaved changes tracking
function checkUnsavedChanges() {
  const markdownText = getMarkdownContent();
  const hasChanges = markdownText.trim() !== currentFileContent.trim();
  
  if (activeTabId) {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (activeTab) {
      activeTab.isDirty = hasChanges;
    }
  }

  if (hasChanges) {
    unsavedIndicator.classList.remove('hidden');
  } else {
    unsavedIndicator.classList.add('hidden');
  }
  
  renderTabsOnly();
}

// Titlebar Save Status Helper
function showSaveStatus(state, message = '') {
  saveStatus.className = `save-status-${state}`;
  saveStatus.textContent = message;
}

// Silent save file for Auto-save
async function saveFileSilently() {
  if (!currentFilePath) return;
  const text = getMarkdownContent();
  
  if (isTauri) {
    try {
      await invoke('save_file', { path: currentFilePath, content: text });
      currentFileContent = text;
      checkUnsavedChanges();
      showSaveStatus('saved', 'Historial guardado');
      clearTimeout(saveStatusTimeout);
      saveStatusTimeout = setTimeout(() => {
        showSaveStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Error in auto-save:', error);
      showSaveStatus('editing', 'Error al guardar');
    }
  } else {
    currentFileContent = text;
    checkUnsavedChanges();
    showSaveStatus('saved', 'Historial guardado (Memoria)');
    clearTimeout(saveStatusTimeout);
    saveStatusTimeout = setTimeout(() => {
      showSaveStatus('idle');
    }, 2000);
  }
}

// Listen to input changes in contenteditable editor
editor.addEventListener('input', () => {
  updateCounts();
  checkUnsavedChanges();
  
  // Real-time render if preview is visible
  if (editorPreviewContainer.classList.contains('view-split')) {
    renderMarkdown();
  }

  // Auto-save debounced logic
  if (autosaveEnabled && currentFilePath) {
    showSaveStatus('editing', 'Editando...');
    clearTimeout(autosaveTimeout);
    autosaveTimeout = setTimeout(async () => {
      showSaveStatus('saving', 'Guardando...');
      await saveFileSilently();
    }, 1500);
  }
});

// Sync toolbar active button states based on text selection (only relevant in WYSIWYG)
document.addEventListener('selectionchange', () => {
  if (document.activeElement === editor && !isRawMode) {
    updateToolbarStates();
  }
});

function updateToolbarStates() {
  btnBold.classList.toggle('active', document.queryCommandState('bold'));
  btnItalic.classList.toggle('active', document.queryCommandState('italic'));
  btnUnderline.classList.toggle('active', document.queryCommandState('underline'));
}

// Execute Rich Text commands and update status (only in WYSIWYG)
function execFormat(command, value = null) {
  if (isRawMode) return;
  document.execCommand(command, false, value);
  editor.focus();
  updateCounts();
  checkUnsavedChanges();
  updateToolbarStates();
}

// Bind Toolbar buttons click events
btnBold.addEventListener('click', () => execFormat('bold'));
btnItalic.addEventListener('click', () => execFormat('italic'));
btnUnderline.addEventListener('click', () => execFormat('underline'));

btnH1.addEventListener('click', () => execFormat('formatBlock', '<h1>'));
btnH2.addEventListener('click', () => execFormat('formatBlock', '<h2>'));
btnH3.addEventListener('click', () => execFormat('formatBlock', '<h3>'));

btnUl.addEventListener('click', () => execFormat('insertUnorderedList'));
btnOl.addEventListener('click', () => execFormat('insertOrderedList'));
btnQuote.addEventListener('click', () => execFormat('formatBlock', '<blockquote>'));
btnCode.addEventListener('click', () => {
  if (isRawMode) {
    wrapSelectionInRawEditor('`', '`');
    return;
  }
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  const selectedText = range.toString();
  
  if (selectedText.includes('\n')) {
    execFormat('insertHTML', `<pre><code>${selectedText}</code></pre>`);
  } else {
    execFormat('insertHTML', `<code>${selectedText || 'código'}</code>`);
  }
});

// Wrap selection with markdown tags in raw text mode
function wrapSelectionInRawEditor(prefix, suffix) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  const selectedText = range.toString();
  const replacementText = prefix + selectedText + suffix;
  
  range.deleteContents();
  const textNode = document.createTextNode(replacementText);
  range.insertNode(textNode);
  
  // Reselect the text
  range.selectNode(textNode);
  selection.removeAllRanges();
  selection.addRange(range);
  
  updateCounts();
  checkUnsavedChanges();
  renderMarkdown();
}

// Editor Keydown Handler (Formatting shortcuts + Notion-style markdown triggers)
editor.addEventListener('keydown', (e) => {
  // 1. RAW MODE SHORTCUTS (inserts markdown syntax characters)
  if (isRawMode) {
    if (e.ctrlKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        wrapSelectionInRawEditor('**', '**');
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        wrapSelectionInRawEditor('*', '*');
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        wrapSelectionInRawEditor('<u>', '</u>');
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        wrapSelectionInRawEditor('`', '`');
      }
    }
    return; // Don't run WYSIWYG block actions
  }

  // 2. WYSIWYG MODE SHORTCUTS
  if (e.ctrlKey) {
    if (e.key === '1') {
      e.preventDefault();
      execFormat('formatBlock', '<h1>');
    } else if (e.key === '2') {
      e.preventDefault();
      execFormat('formatBlock', '<h2>');
    } else if (e.key === '3') {
      e.preventDefault();
      execFormat('formatBlock', '<h3>');
    }
  }

  // Handle Notion-like block markdown triggers when pressing Space
  if (e.key === ' ') {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const node = range.startContainer;
      
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        const caretPos = range.startOffset;
        const textBeforeCaret = text.substring(0, caretPos);
        
        if (textBeforeCaret === '#') {
          e.preventDefault();
          node.textContent = text.substring(caretPos);
          execFormat('formatBlock', '<h1>');
        } else if (textBeforeCaret === '##') {
          e.preventDefault();
          node.textContent = text.substring(caretPos);
          execFormat('formatBlock', '<h2>');
        } else if (textBeforeCaret === '###') {
          e.preventDefault();
          node.textContent = text.substring(caretPos);
          execFormat('formatBlock', '<h3>');
        } else if (textBeforeCaret === '>') {
          e.preventDefault();
          node.textContent = text.substring(caretPos);
          execFormat('formatBlock', '<blockquote>');
        } else if (textBeforeCaret === '-' || textBeforeCaret === '*') {
          e.preventDefault();
          node.textContent = text.substring(caretPos);
          execFormat('insertUnorderedList');
        } else if (textBeforeCaret === '1.') {
          e.preventDefault();
          node.textContent = text.substring(caretPos);
          execFormat('insertOrderedList');
        }
      }
    }
  }
});

// File Operations Actions
async function newFile() {
  createTab(null, 'Sin Título', '');
}

async function openFile() {
  if (isTauri) {
    try {
      const fileData = await invoke('open_file_dialog');
      if (fileData) {
        loadFileData(fileData);
      }
    } catch (error) {
      alert('Error al abrir el archivo: ' + error);
    }
  } else {
    // Browser fallback: open local file
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.markdown,.txt';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        loadFileData({
          path: file.name,
          name: file.name,
          content: evt.target.result
        });
      };
      reader.readAsText(file);
    };
    input.click();
  }
}

function loadFileData(fileData) {
  createTab(fileData.path, fileData.name, fileData.content);
  addToRecentFiles(fileData.name, fileData.path);
}

async function saveFile() {
  if (!currentFilePath) {
    return saveFileAs();
  }

  if (isTauri) {
    try {
      const text = getMarkdownContent();
      await invoke('save_file', { path: currentFilePath, content: text });
      currentFileContent = text;
      
      const activeTab = tabs.find(t => t.id === activeTabId);
      if (activeTab) {
        activeTab.content = text;
        activeTab.isDirty = false;
      }
      
      checkUnsavedChanges();
      renderTabs();
    } catch (error) {
      alert('Error al guardar el archivo: ' + error);
    }
  } else {
    return saveFileAs();
  }
}

async function saveFileAs() {
  const text = getMarkdownContent();
  
  if (isTauri) {
    try {
      const path = await invoke('save_file_dialog', { content: text });
      if (path) {
        currentFilePath = path;
        currentFileContent = text;
        const separator = path.includes('\\') ? '\\' : '/';
        const name = path.split(separator).pop();
        docTitle.textContent = name;
        
        const activeTab = tabs.find(t => t.id === activeTabId);
        if (activeTab) {
          activeTab.path = path;
          activeTab.name = name;
          activeTab.content = text;
          activeTab.isDirty = false;
        }
        
        checkUnsavedChanges();
        renderTabs();
        addToRecentFiles(name, path);
      }
    } catch (error) {
      alert('Error al guardar como: ' + error);
    }
  } else {
    // Browser fallback: download file
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = docTitle.textContent === 'Sin Título' ? 'documento.md' : docTitle.textContent;
    a.click();
    URL.revokeObjectURL(url);
    
    currentFileContent = text;
    
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (activeTab) {
      activeTab.content = text;
      activeTab.isDirty = false;
    }
    
    checkUnsavedChanges();
    renderTabs();
  }
}

// Recent Files List management
function updateRecentFilesUI() {
  recentFilesList.innerHTML = '';
  
  // 1. Render unsaved open files first (like "Sin Título")
  const unsavedTabs = tabs.filter(t => t.path === null);
  unsavedTabs.forEach(tab => {
    const li = document.createElement('li');
    li.className = 'open-tab';
    li.setAttribute('data-tab-id', tab.id);
    if (tab.id === activeTabId) {
      li.classList.add('active');
    }
    
    const iconSpan = document.createElement('span');
    iconSpan.className = 'file-icon';
    iconSpan.innerHTML = '<i data-lucide="file-warning"></i>';
    li.appendChild(iconSpan);
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'file-name';
    nameSpan.textContent = tab.name;
    li.appendChild(nameSpan);
    
    if (tab.isDirty) {
      const dirtyDot = document.createElement('span');
      dirtyDot.className = 'tab-dirty-indicator';
      li.appendChild(dirtyDot);
    }
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'recent-file-close-btn';
    closeBtn.innerHTML = '<i data-lucide="x"></i>';
    closeBtn.title = 'Cerrar archivo';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(tab.id);
    });
    li.appendChild(closeBtn);
    
    li.addEventListener('click', () => switchTab(tab.id));
    recentFilesList.appendChild(li);
  });
  
  if (recentFiles.length === 0 && unsavedTabs.length === 0) {
    recentFilesList.innerHTML = '<li class="empty-list">No hay archivos recientes</li>';
    if (window.lucide) {
      window.lucide.createIcons();
    }
    return;
  }

  // 2. Render saved recent files
  recentFiles.forEach(file => {
    const li = document.createElement('li');
    li.title = file.path;
    
    const openTab = tabs.find(t => t.path === file.path);
    if (openTab) {
      li.className = 'open-tab';
      li.setAttribute('data-tab-id', openTab.id);
      if (openTab.id === activeTabId) {
        li.classList.add('active');
      }
      
      const iconSpan = document.createElement('span');
      iconSpan.className = 'file-icon';
      iconSpan.innerHTML = '<i data-lucide="file-edit"></i>';
      li.appendChild(iconSpan);
      
      const nameSpan = document.createElement('span');
      nameSpan.className = 'file-name';
      nameSpan.textContent = file.name;
      li.appendChild(nameSpan);
      
      if (openTab.isDirty) {
        const dirtyDot = document.createElement('span');
        dirtyDot.className = 'tab-dirty-indicator';
        li.appendChild(dirtyDot);
      }
      
      const closeBtn = document.createElement('button');
      closeBtn.className = 'recent-file-close-btn';
      closeBtn.innerHTML = '<i data-lucide="x"></i>';
      closeBtn.title = 'Cerrar archivo';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTab(openTab.id);
      });
      li.appendChild(closeBtn);
      
      li.addEventListener('click', () => switchTab(openTab.id));
    } else {
      const iconSpan = document.createElement('span');
      iconSpan.className = 'file-icon';
      iconSpan.innerHTML = '<i data-lucide="file"></i>';
      li.appendChild(iconSpan);
      
      const nameSpan = document.createElement('span');
      nameSpan.className = 'file-name';
      nameSpan.textContent = file.name;
      li.appendChild(nameSpan);
      
      li.addEventListener('click', async () => {
        try {
          const content = await invoke('read_file', { path: file.path });
          loadFileData({ path: file.path, name: file.name, content });
        } catch (error) {
          alert('No se pudo abrir el archivo de la lista de recientes. Es posible que haya sido movido o eliminado.');
          recentFiles = recentFiles.filter(f => f.path !== file.path);
          localStorage.setItem('recentFiles', JSON.stringify(recentFiles));
          updateRecentFilesUI();
        }
      });
    }

    recentFilesList.appendChild(li);
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function addToRecentFiles(name, path) {
  recentFiles = recentFiles.filter(file => file.path !== path);
  recentFiles.unshift({ name, path });
  if (recentFiles.length > 10) {
    recentFiles.pop();
  }
  localStorage.setItem('recentFiles', JSON.stringify(recentFiles));
  updateRecentFilesUI();
}

// High-Fidelity Print/PDF Generation using a sandboxed offscreen iframe
function exportToPdf() {
  // Get latest content parsed as HTML
  const markdownText = getMarkdownContent();
  const contentHtml = window.marked.parse(markdownText);
  
  // Create offscreen iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);
  
  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
  
  // Write isolated document HTML with tailored print CSS
  iframeDoc.write(`
    <!doctype html>
    <html>
      <head>
        <title>${docTitle.textContent || 'Documento'}</title>
        <link rel="stylesheet" href="styles.css">
        <link rel="stylesheet" href="lib/prism-tomorrow.min.css">
        <style>
          @page {
            size: A4;
            margin: 20mm 15mm;
          }
          
          body {
            background: #ffffff !important;
            color: #111111 !important;
            font-family: "Georgia", "Times New Roman", Times, serif !important;
            font-size: 11pt !important;
            line-height: 1.6 !important;
            padding: 20px !important;
            margin: 0 !important;
            overflow: visible !important;
            height: auto !important;
          }
          
          .markdown-body {
            background: #ffffff !important;
            color: #111111 !important;
            font-family: "Georgia", "Times New Roman", Times, serif !important;
          }
          
          .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5, .markdown-body h6 {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            color: #000000 !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          
          .markdown-body h1 {
            font-size: 22pt !important;
            border-bottom: 2px solid #000000 !important;
            padding-bottom: 5px !important;
            margin-top: 24pt !important;
          }
          
          .markdown-body h2 {
            font-size: 16pt !important;
            border-bottom: 1px solid #333333 !important;
            padding-bottom: 3px !important;
            margin-top: 20pt !important;
          }
          
          .markdown-body p, .markdown-body li {
            font-size: 11pt !important;
            margin-bottom: 10pt !important;
            text-align: justify !important;
          }
          
          .markdown-body pre {
            background-color: #f6f8fa !important;
            border: 1px solid #d0d7de !important;
            padding: 12px !important;
            border-radius: 6px !important;
            page-break-inside: avoid !important;
            white-space: pre-wrap !important;
          }
          
          .markdown-body pre code {
            color: #24292f !important;
            font-size: 9.5pt !important;
            font-family: monospace !important;
          }
          
          .markdown-body code {
            background-color: rgba(175, 184, 193, 0.2) !important;
            padding: 0.2em 0.4em !important;
            border-radius: 6px !important;
            font-size: 85% !important;
            font-family: monospace !important;
          }
          
          .markdown-body blockquote {
            border-left: 4px solid #d0d7de !important;
            color: #57606a !important;
            padding: 10px 15px !important;
            margin-left: 0 !important;
            background-color: #f6f8fa !important;
            font-style: italic !important;
            page-break-inside: avoid !important;
          }
          
          .markdown-body table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-bottom: 16px !important;
            page-break-inside: avoid !important;
          }
          
          .markdown-body tr {
            page-break-inside: avoid !important;
          }
          
          .markdown-body th, .markdown-body td {
            border: 1px solid #d0d7de !important;
            padding: 8px 12px !important;
            font-size: 10pt !important;
          }
          
          .markdown-body th {
            background-color: #f6f8fa !important;
            font-weight: bold !important;
          }
          
          .markdown-body img {
            max-width: 100% !important;
            height: auto !important;
            page-break-inside: avoid !important;
            display: block !important;
            margin: 15px auto !important;
          }
        </style>
      </head>
      <body class="markdown-body">
        ${contentHtml}
        <script>
          window.addEventListener('load', () => {
            setTimeout(() => {
              window.print();
              setTimeout(() => {
                window.parent.document.body.removeChild(window.frameElement);
              }, 100);
            }, 400);
          });
        </script>
      </body>
    </html>
  `);
  iframeDoc.close();
}

// Event Listeners for File buttons
newFileBtn.addEventListener('click', newFile);
openFileBtn.addEventListener('click', openFile);
saveFileBtn.addEventListener('click', saveFile);
saveAsBtn.addEventListener('click', saveFileAs);
exportPdfBtn.addEventListener('click', () => {
  exportDropdownMenu.classList.add('hidden');
  exportToPdf();
});

// Export HTML and Plain Text
async function exportToHtml() {
  try {
    const markdownText = getMarkdownContent();
    const contentHtml = window.marked.parse(markdownText);
    
    // Premium isolated HTML document template
    const fullHtml = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${docTitle.textContent || 'Documento Exportado'}</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #1d1d1f;
        background-color: #ffffff;
        line-height: 1.6;
        padding: 40px 20px;
        max-width: 800px;
        margin: 0 auto;
      }
      h1, h2, h3, h4 {
        color: #000000;
        margin-top: 24px;
        margin-bottom: 16px;
        font-weight: 600;
      }
      h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
      h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
      p, ul, ol { margin-bottom: 16px; }
      code {
        background-color: rgba(175, 184, 193, 0.2);
        padding: 0.2em 0.4em;
        border-radius: 6px;
        font-family: monospace;
        font-size: 85%;
      }
      pre {
        background-color: #f6f8fa;
        padding: 16px;
        border-radius: 8px;
        overflow: auto;
        border: 1px solid #d0d7de;
      }
      pre code {
        background: transparent;
        padding: 0;
        font-size: 100%;
      }
      blockquote {
        border-left: 4px solid #d0d7de;
        color: #57606a;
        padding: 0 1em;
        margin-left: 0;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        margin-bottom: 16px;
      }
      th, td {
        border: 1px solid #d0d7de;
        padding: 6px 13px;
      }
      tr:nth-child(even) {
        background-color: #f6f8fa;
      }
    </style>
  </head>
  <body>
    ${contentHtml}
  </body>
</html>`;

    if (isTauri) {
      await invoke('save_file_dialog', { content: fullHtml });
    } else {
      // Browser fallback: download HTML file
      const blob = new Blob([fullHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (docTitle.textContent === 'Sin Título' ? 'documento' : docTitle.textContent.split('.')[0]) + '.html';
      a.click();
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    alert('Error al exportar a HTML: ' + error);
  }
}

async function exportToTxt() {
  try {
    const text = getMarkdownContent();
    if (isTauri) {
      await invoke('save_file_dialog', { content: text });
    } else {
      // Browser fallback: download TXT file
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (docTitle.textContent === 'Sin Título' ? 'documento' : docTitle.textContent.split('.')[0]) + '.txt';
      a.click();
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    alert('Error al exportar a Texto Plano: ' + error);
  }
}

exportHtmlBtn.addEventListener('click', () => {
  exportDropdownMenu.classList.add('hidden');
  exportToHtml();
});
exportTxtBtn.addEventListener('click', () => {
  exportDropdownMenu.classList.add('hidden');
  exportToTxt();
});

// Keyboard shortcuts (Ctrl+S to save, Ctrl+O to open, Ctrl+N for new)
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey) {
    if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      saveFile();
    }
    if (e.key === 'o' || e.key === 'O') {
      e.preventDefault();
      openFile();
    }
    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      newFile();
    }
  }
});

// Typography Management
const fontStyles = ['sans', 'serif', 'mono'];
let currentFont = localStorage.getItem('font') || 'sans';
const fontDropdownMenu = document.getElementById('font-dropdown-menu');

function applyFont(font) {
  fontStyles.forEach(f => document.body.classList.remove(`font-${f}`));
  document.body.classList.add(`font-${font}`);
  localStorage.setItem('font', font);
  
  // Highlight active font item in dropdown
  document.querySelectorAll('.dropdown-item').forEach(item => {
    if (item.dataset.font === font) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

// Initialize font on start
applyFont(currentFont);

// Toggle dropdown menu
fontSelectBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  exportDropdownMenu.classList.add('hidden');
  fontDropdownMenu.classList.toggle('hidden');
});

exportBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  fontDropdownMenu.classList.add('hidden');
  exportDropdownMenu.classList.toggle('hidden');
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.dropdown-container')) {
    fontDropdownMenu.classList.add('hidden');
    exportDropdownMenu.classList.add('hidden');
  }
});

// Handle dropdown item selections
document.querySelectorAll('.dropdown-item').forEach(item => {
  item.addEventListener('click', () => {
    currentFont = item.dataset.font;
    applyFont(currentFont);
    fontDropdownMenu.classList.add('hidden');
    
    if (editorPreviewContainer.classList.contains('view-split') || editorPreviewContainer.classList.contains('view-reader')) {
      renderMarkdown();
    }
  });
});

// Scroll Sync Setup
const previewPane = document.getElementById('preview-pane');
let isScrollingEditor = false;
let isScrollingPreview = false;

editor.addEventListener('scroll', () => {
  if (editorPreviewContainer.classList.contains('view-split')) {
    if (isScrollingPreview) {
      isScrollingPreview = false;
      return;
    }
    isScrollingEditor = true;
    const scrollPercentage = editor.scrollTop / (editor.scrollHeight - editor.clientHeight);
    previewPane.scrollTop = scrollPercentage * (previewPane.scrollHeight - previewPane.clientHeight);
  }
});

previewPane.addEventListener('scroll', () => {
  if (editorPreviewContainer.classList.contains('view-split')) {
    if (isScrollingEditor) {
      isScrollingEditor = false;
      return;
    }
    isScrollingPreview = true;
    const scrollPercentage = previewPane.scrollTop / (previewPane.scrollHeight - previewPane.clientHeight);
    editor.scrollTop = scrollPercentage * (editor.scrollHeight - editor.clientHeight);
  }
});

// Drag and Drop (Tauri native listeners vs browser HTML5 fallback)
if (isTauri) {
  const { listen } = window.__TAURI__.event;

  listen('tauri://drag-over', () => {
    dragDropOverlay.classList.add('active');
    dragDropOverlay.classList.remove('hidden');
  });

  listen('tauri://drag-leave', () => {
    dragDropOverlay.classList.remove('active');
    setTimeout(() => {
      if (!dragDropOverlay.classList.contains('active')) {
        dragDropOverlay.classList.add('hidden');
      }
    }, 250);
  });

  listen('tauri://drag-drop', async (event) => {
    dragDropOverlay.classList.remove('active');
    setTimeout(() => {
      if (!dragDropOverlay.classList.contains('active')) {
        dragDropOverlay.classList.add('hidden');
      }
    }, 250);
    
    const paths = event.payload.paths;
    if (paths && paths.length > 0) {
      const filePath = paths[0];
      const ext = filePath.split('.').pop().toLowerCase();
      
      if (ext === 'md' || ext === 'markdown' || ext === 'txt') {
        try {
          const content = await invoke('read_file', { path: filePath });
          const separator = filePath.includes('\\') ? '\\' : '/';
          const name = filePath.split(separator).pop();
          loadFileData({ path: filePath, name, content });
        } catch (error) {
          alert('Error al abrir el archivo arrastrado: ' + error);
        }
      }
    }
  });
} else {
  // Web browser HTML5 Drag and Drop fallback
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    dragDropOverlay.classList.add('active');
    dragDropOverlay.classList.remove('hidden');
  });

  window.addEventListener('dragleave', () => {
    dragDropOverlay.classList.remove('active');
    setTimeout(() => {
      if (!dragDropOverlay.classList.contains('active')) {
        dragDropOverlay.classList.add('hidden');
      }
    }, 250);
  });

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragDropOverlay.classList.remove('active');
    setTimeout(() => {
      if (!dragDropOverlay.classList.contains('active')) {
        dragDropOverlay.classList.add('hidden');
      }
    }, 250);

    const file = e.dataTransfer.files[0];
    if (file) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext === 'md' || ext === 'markdown' || ext === 'txt') {
        const reader = new FileReader();
        reader.onload = (evt) => {
          loadFileData({
            path: file.name,
            name: file.name,
            content: evt.target.result
          });
        };
        reader.readAsText(file);
      }
    }
  });
}

// Auto-save option control setup
autosaveToggle.checked = autosaveEnabled;
autosaveToggle.addEventListener('change', (e) => {
  autosaveEnabled = e.target.checked;
  localStorage.setItem('autosaveEnabled', autosaveEnabled);
  if (!autosaveEnabled) {
    clearTimeout(autosaveTimeout);
    showSaveStatus('idle');
  }
});

// App Initialization
window.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  updateMaximizeButton();
  
  // Create initial empty tab
  createTab(null, 'Sin Título', '');
  
  updateCounts();
  renderMarkdown();
  updateRecentFilesUI();
  editor.focus();
  
  // Check if a file was double-clicked or passed via CLI args (Tauri-only)
  if (isTauri) {
    try {
      const cliFile = await invoke('get_cli_args');
      if (cliFile) {
        loadFileData(cliFile);
      }
    } catch (error) {
      console.error('Error opening file from command line:', error);
    }
  }
});
