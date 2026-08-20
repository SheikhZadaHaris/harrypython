class HarryApp {
  constructor() {
    this.currentConversationId = null;
    this.conversations = [];
    this.currentTab = 'chats';
    this.fileContent = null;
    this.init();
  }

  async init() {
    this.bindEvents();
    this.bindVoice();
    await this.loadConversations();
    await this.loadNotes();
    await this.loadTasks();
    await this.loadMemory();
  }

  // === API HELPERS ===
  async api(method, url, body = null) {
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }

  // === EVENT BINDING ===
  bindEvents() {
    // Chat input
    document.getElementById('chatInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }
    });
    document.getElementById('sendBtn').addEventListener('click', () => this.sendMessage());

    // New chat
    document.getElementById('newChatBtn').addEventListener('click', () => this.newChat());

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });

    // Notes
    document.getElementById('newNoteBtn').addEventListener('click', () => this.showNoteModal());
    document.getElementById('noteModalSave').addEventListener('click', () => this.saveNote());
    document.getElementById('noteModalCancel').addEventListener('click', () => this.hideNoteModal());
    document.getElementById('noteModalClose').addEventListener('click', () => this.hideNoteModal());
    document.getElementById('noteSearch').addEventListener('input', (e) => this.searchNotes(e.target.value));

    // Tasks
    document.getElementById('addTaskBtn').addEventListener('click', () => this.addTask());
    document.getElementById('taskInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.addTask();
    });

    // Settings
    document.getElementById('voiceToggle').addEventListener('change', (e) => voice.setVoiceEnabled(e.target.checked));
    document.getElementById('autoListenToggle').addEventListener('change', (e) => voice.setAutoListen(e.target.checked));
    document.getElementById('voiceLangSelect').addEventListener('change', (e) => voice.setLanguage(e.target.value));
    document.getElementById('clearMemoryBtn').addEventListener('click', () => this.clearMemory());

    // File upload
    document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileUpload(e));
    document.getElementById('fileModalClose').addEventListener('click', () => this.hideFileModal());
    document.getElementById('fileSummarize').addEventListener('click', () => this.askAboutFile('Summarize this file'));
    document.getElementById('fileAsk').addEventListener('click', () => this.askAboutFile('What is this file about?'));

    // Mobile menu
    document.getElementById('menuToggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });

    // Close sidebar on main area click (mobile)
    document.querySelector('.main-area').addEventListener('click', () => {
      document.getElementById('sidebar').classList.remove('open');
    });
  }

  // === VOICE ===
  bindVoice() {
    const micBtn = document.getElementById('micBtn');
    micBtn.addEventListener('click', () => voice.toggleListening());

    voice.onResult = (transcript) => {
      document.getElementById('chatInput').value = transcript;
      this.sendMessage();
    };

    voice.onStatusChange = (status) => {
      micBtn.className = 'mic-btn' + (status !== 'idle' ? ' ' + status : '');
      // Waveform animation
      const waveform = document.getElementById('waveform');
      waveform.classList.toggle('active', status === 'listening' || status === 'speaking');
    };
  }

  // === CONVERSATIONS ===
  async loadConversations() {
    try {
      const data = await this.api('GET', '/api/conversations');
      this.conversations = data;
      this.renderConversations();
    } catch (e) { console.error('Load conversations:', e); }
  }

  renderConversations() {
    const list = document.getElementById('conversationList');
    list.innerHTML = this.conversations.map(c => `
      <div class="sidebar-item ${c.id === this.currentConversationId ? 'active' : ''}" data-id="${c.id}">
        <span class="item-title">${this.escapeHtml(c.title)}</span>
        <button class="item-delete" title="Delete" data-delete="${c.id}">&times;</button>
      </div>
    `).join('');

    // Bind clicks
    list.querySelectorAll('.sidebar-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e.target.classList.contains('item-delete')) {
          this.loadConversation(item.dataset.id);
        }
      });
    });
    list.querySelectorAll('.item-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteConversation(btn.dataset.delete);
      });
    });
  }

  async loadConversation(id) {
    try {
      const data = await this.api('GET', `/api/conversations/${id}`);
      this.currentConversationId = id;
      document.getElementById('chatTitle').textContent = data.title;
      document.getElementById('welcomeScreen').style.display = 'none';
      this.renderMessages(data.messages);
      this.renderConversations();
    } catch (e) { console.error('Load conversation:', e); }
  }

  async newChat() {
    this.currentConversationId = null;
    document.getElementById('chatTitle').textContent = 'New Chat';
    document.getElementById('chatMessages').innerHTML = `
      <div class="welcome-screen" id="welcomeScreen">
        <div class="welcome-icon">🎙️</div>
        <h2 class="gradient-text">Hello, I'm Harry</h2>
        <p>Your voice-first AI assistant. Press the microphone or type a message to start.</p>
      </div>`;
    this.renderConversations();
  }

  async deleteConversation(id) {
    try {
      await this.api('DELETE', `/api/conversations/${id}`);
      if (this.currentConversationId === id) this.newChat();
      await this.loadConversations();
    } catch (e) { console.error('Delete conversation:', e); }
  }

  // === MESSAGES ===
  renderMessages(messages) {
    const container = document.getElementById('chatMessages');
    container.innerHTML = messages.map(m => this.createMessageHTML(m.role, m.content, m.timestamp)).join('');
    this.scrollToBottom();
  }

  createMessageHTML(role, content, time) {
    const timeStr = time ? new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    return `
      <div class="message ${role}">
        <div class="message-bubble">
          <div class="message-content">${this.formatMessage(content)}</div>
          ${timeStr ? `<span class="message-time">${timeStr}</span>` : ''}
        </div>
      </div>`;
  }

  formatMessage(text) {
    // Basic markdown-like formatting
    return this.escapeHtml(text)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  async sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;

    input.value = '';
    // Stop speaking if user inputs/sends a new message
    if (voice.isSpeaking) {
      voice.stopSpeaking();
    }
    document.getElementById('welcomeScreen')?.remove();

    // Add user message to UI
    const container = document.getElementById('chatMessages');
    container.insertAdjacentHTML('beforeend', this.createMessageHTML('user', message, new Date().toISOString()));

    // Show typing indicator
    container.insertAdjacentHTML('beforeend', `
      <div class="message assistant typing-message">
        <div class="message-bubble">
          <div class="typing-indicator"><span></span><span></span><span></span></div>
        </div>
      </div>`);
    this.scrollToBottom();

    try {
      const data = await this.api('POST', '/api/chat', {
        conversation_id: this.currentConversationId,
        message: message
      });

      // Remove typing indicator
      document.querySelector('.typing-message')?.remove();

      // Add AI response
      container.insertAdjacentHTML('beforeend', this.createMessageHTML('assistant', data.response, new Date().toISOString()));
      this.scrollToBottom();

      // Update conversation
      this.currentConversationId = data.conversation_id;
      await this.loadConversations();

      // Voice response
      if (voice.voiceEnabled) {
        voice.speak(data.response);
      }
    } catch (e) {
      document.querySelector('.typing-message')?.remove();
      container.insertAdjacentHTML('beforeend', this.createMessageHTML('assistant', 'Sorry, I encountered an error. Please try again.', new Date().toISOString()));
      console.error('Send message:', e);
    }
  }

  scrollToBottom() {
    const container = document.getElementById('chatMessages');
    container.scrollTop = container.scrollHeight;
  }

  // === TABS ===
  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
  }

  // === NOTES ===
  async loadNotes() {
    try {
      const data = await this.api('GET', '/api/notes');
      this.renderNotes(data);
    } catch (e) { console.error('Load notes:', e); }
  }

  renderNotes(notes) {
    const list = document.getElementById('notesList');
    list.innerHTML = notes.map(n => `
      <div class="sidebar-item note-item" data-id="${n.id}">
        <span class="item-title">${this.escapeHtml(n.title)}</span>
        <button class="item-delete" data-delete-note="${n.id}">&times;</button>
      </div>`).join('');

    list.querySelectorAll('.note-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e.target.hasAttribute('data-delete-note')) {
          const note = notes.find(n => n.id === item.dataset.id);
          if (note) this.showNoteModal(note);
        }
      });
    });
    list.querySelectorAll('[data-delete-note]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); this.deleteNote(btn.dataset.deleteNote); });
    });
  }

  showNoteModal(note = null) {
    document.getElementById('noteModal').classList.add('active');
    document.getElementById('noteModalTitle').textContent = note ? 'Edit Note' : 'New Note';
    document.getElementById('noteTitleInput').value = note?.title || '';
    document.getElementById('noteContentInput').value = note?.content || '';
    document.getElementById('noteModalSave').dataset.editId = note?.id || '';
  }

  hideNoteModal() {
    document.getElementById('noteModal').classList.remove('active');
  }

  async saveNote() {
    const title = document.getElementById('noteTitleInput').value.trim();
    const content = document.getElementById('noteContentInput').value.trim();
    const editId = document.getElementById('noteModalSave').dataset.editId;
    if (!title) return;

    try {
      if (editId) {
        await this.api('PUT', `/api/notes/${editId}`, { title, content });
      } else {
        await this.api('POST', '/api/notes', { title, content });
      }
      this.hideNoteModal();
      await this.loadNotes();
    } catch (e) { console.error('Save note:', e); }
  }

  async deleteNote(id) {
    try {
      await this.api('DELETE', `/api/notes/${id}`);
      await this.loadNotes();
    } catch (e) { console.error('Delete note:', e); }
  }

  async searchNotes(query) {
    try {
      const url = query ? `/api/notes/search?q=${encodeURIComponent(query)}` : '/api/notes';
      const data = await this.api('GET', url);
      this.renderNotes(data);
    } catch (e) { console.error('Search notes:', e); }
  }

  // === TASKS ===
  async loadTasks() {
    try {
      const data = await this.api('GET', '/api/tasks');
      this.renderTasks(data);
    } catch (e) { console.error('Load tasks:', e); }
  }

  renderTasks(tasks) {
    const list = document.getElementById('tasksList');
    list.innerHTML = tasks.map(t => `
      <div class="task-item ${t.completed ? 'completed' : ''}" data-id="${t.id}">
        <label class="task-check">
          <input type="checkbox" ${t.completed ? 'checked' : ''} data-toggle-task="${t.id}">
          <span class="task-title">${this.escapeHtml(t.title)}</span>
        </label>
        <button class="item-delete" data-delete-task="${t.id}">&times;</button>
      </div>`).join('');

    list.querySelectorAll('[data-toggle-task]').forEach(cb => {
      cb.addEventListener('change', () => this.toggleTask(cb.dataset.toggleTask));
    });
    list.querySelectorAll('[data-delete-task]').forEach(btn => {
      btn.addEventListener('click', () => this.deleteTask(btn.dataset.deleteTask));
    });
  }

  async addTask() {
    const input = document.getElementById('taskInput');
    const title = input.value.trim();
    if (!title) return;
    try {
      await this.api('POST', '/api/tasks', { title });
      input.value = '';
      await this.loadTasks();
    } catch (e) { console.error('Add task:', e); }
  }

  async toggleTask(id) {
    try {
      await this.api('PATCH', `/api/tasks/${id}/toggle`);
      await this.loadTasks();
    } catch (e) { console.error('Toggle task:', e); }
  }

  async deleteTask(id) {
    try {
      await this.api('DELETE', `/api/tasks/${id}`);
      await this.loadTasks();
    } catch (e) { console.error('Delete task:', e); }
  }

  // === MEMORY ===
  async loadMemory() {
    try {
      const data = await this.api('GET', '/api/memory');
      this.renderMemory(data);
    } catch (e) { console.error('Load memory:', e); }
  }

  renderMemory(memories) {
    const list = document.getElementById('memoryList');
    if (!memories.length) {
      list.innerHTML = '<p class="empty-text">No memories stored yet.</p>';
      return;
    }
    list.innerHTML = memories.map(m => `
      <div class="memory-item">
        <span class="memory-key">${this.escapeHtml(m.key)}</span>
        <span class="memory-value">${this.escapeHtml(m.value)}</span>
        <button class="item-delete" data-delete-memory="${m.id}">&times;</button>
      </div>`).join('');

    list.querySelectorAll('[data-delete-memory]').forEach(btn => {
      btn.addEventListener('click', () => this.deleteMemory(btn.dataset.deleteMemory));
    });
  }

  async deleteMemory(id) {
    try {
      await this.api('DELETE', `/api/memory/${id}`);
      await this.loadMemory();
    } catch (e) { console.error('Delete memory:', e); }
  }

  async clearMemory() {
    if (!confirm('Are you sure you want to clear all memory?')) return;
    try {
      const memories = await this.api('GET', '/api/memory');
      for (const m of memories) {
        await this.api('DELETE', `/api/memory/${m.id}`);
      }
      await this.loadMemory();
    } catch (e) { console.error('Clear memory:', e); }
  }

  // === FILE UPLOAD ===
  async handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/files/upload', { method: 'POST', body: formData });
      const data = await res.json();
      this.fileContent = data.content;
      document.getElementById('fileName').textContent = file.name;
      document.getElementById('fileContent').textContent = data.content?.substring(0, 500) + (data.content?.length > 500 ? '...' : '');
      document.getElementById('fileModal').classList.add('active');
    } catch (e) {
      console.error('File upload:', e);
      alert('Failed to process file.');
    }
    event.target.value = '';
  }

  hideFileModal() {
    document.getElementById('fileModal').classList.remove('active');
  }

  askAboutFile(prompt) {
    this.hideFileModal();
    const input = document.getElementById('chatInput');
    input.value = `${prompt}:\n\n${this.fileContent?.substring(0, 2000) || ''}`;
    this.sendMessage();
  }

  // === UTILITIES ===
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new HarryApp();
});
