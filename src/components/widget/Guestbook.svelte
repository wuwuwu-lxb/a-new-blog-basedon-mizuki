<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from "@iconify/svelte";

  interface GuestbookEntry {
    id: number;
    nickname: string;
    content: string;
    createdAt: string;
  }

  let entries: GuestbookEntry[] = [];
  let loading = true;
  let error = '';
  let newContent = '';
  let isAnonymous = false;
  let submitting = false;
  let isLoggedIn = false;
  let userNickname = '';
  let expandedId: number | null = null;
  let hoveredId: number | null = null;

  onMount(async () => {
    await checkLoginStatus();
    await fetchGuestbook();
  });

  function parseToken(): { userId: number; email: string; role: string; name: string } | null {
    const token = localStorage.getItem('mizuki-auth-token');
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }

  async function checkLoginStatus() {
    const payload = parseToken();
    if (payload) {
      isLoggedIn = true;
      userNickname = payload.name || '用户';
    }
  }

  async function fetchGuestbook() {
    try {
      const res = await fetch('/api/guestbook');
      if (res.ok) {
        const data = await res.json();
        entries = data.guestbook || [];
      } else {
        error = '获取留言失败';
      }
    } catch (err) {
      error = '网络错误';
    } finally {
      loading = false;
    }
  }

  async function submitEntry() {
    if (!newContent.trim() || submitting) return;

    submitting = true;
    try {
      const res = await fetch('/api/guestbook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newContent,
          isAnonymous: isAnonymous,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        entries = [data.entry, ...entries];
        newContent = '';
        isAnonymous = false;
      } else {
        const data = await res.json();
        alert(data.error || '发布失败');
      }
    } catch (err) {
      alert('发布失败');
    } finally {
      submitting = false;
    }
  }

  async function deleteEntry(id: number) {
    if (!confirm('确定要删除这条留言吗？')) return;

    const token = localStorage.getItem('mizuki-auth-token');
    try {
      const res = await fetch(`/api/guestbook/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        entries = entries.filter(e => e.id !== id);
        expandedId = null;
      } else {
        const data = await res.json();
        alert(data.error || '删除失败');
      }
    } catch (err) {
      alert('删除失败');
    }
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes <= 1 ? '刚刚' : `${minutes} 分钟前`;
      }
      return `${hours} 小时前`;
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      return `${days} 天前`;
    } else {
      return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(date);
    }
  }

  function isAdmin(): boolean {
    const payload = parseToken();
    return payload?.role === 'ADMIN';
  }

  function toggleExpand(id: number) {
    expandedId = expandedId === id ? null : id;
  }

  function getScrollDuration(index: number): number {
    return 12 + (index % 5) * 3;
  }
</script>

<div class="guestbook-wrapper">
  <!-- 头部 -->
  <div class="guestbook-header">
    <div class="header-icon">
      <Icon icon="material-symbols:chatbubbles-outline" class="text-4xl text-white" />
    </div>
    <div>
      <h1 class="header-title">留言板</h1>
      <p class="header-subtitle">{entries.length} 条留言</p>
    </div>
  </div>

  <!-- 留言表单 -->
  <div class="guestbook-form">
    {#if isLoggedIn}
      <div class="form-row">
        <input
          type="text"
          bind:value={newContent}
          placeholder="说点什么吧..."
          class="form-input"
          disabled={submitting}
        />
        <label class="anonymous-toggle">
          <input type="checkbox" bind:checked={isAnonymous} />
          <span class="toggle-label">匿名</span>
        </label>
        <button
          class="submit-btn"
          on:click={submitEntry}
          disabled={submitting || !newContent.trim()}
        >
          {#if submitting}
            <Icon icon="eos-icons:loading" class="animate-spin" />
          {:else}
            <Icon icon="material-symbols:send" />
          {/if}
        </button>
      </div>
    {:else}
      <div class="login-hint">
        <Icon icon="material-symbols:lock-outline" class="text-lg" />
        <span>登录后即可留言</span>
      </div>
    {/if}
  </div>

  <!-- 留言列表 -->
  <div class="messages-container">
    {#if loading}
      <div class="loading-state">
        <Icon icon="eos-icons:loading" class="text-3xl animate-spin text-primary" />
        <span>加载中...</span>
      </div>
    {:else if error}
      <div class="error-state">
        <Icon icon="material-symbols:error-outline" class="text-3xl" />
        <span>{error}</span>
      </div>
    {:else if entries.length === 0}
      <div class="empty-state">
        <Icon icon="material-symbols:chat-outline" class="text-5xl text-30" />
        <p class="text-50 mt-3">还没有留言，快来抢沙发吧~</p>
      </div>
    {:else}
      {@const bubblesPerRow = 4}
      {@const totalRows = Math.max(4, Math.ceil(entries.length / bubblesPerRow))}
      {@const rowHeight = 50}
      <div class="scroll-wrapper">
        <div class="bubbles-container" style="height: {totalRows * rowHeight}px;">
          {#each entries as entry, i (entry.id)}
            {@const isAnon = entry.nickname === '匿名用户'}
            {@const duration = 12 + Math.random() * 10}
            {@const delay = -(Math.random() * 20)}
            {@const rowSeed = Math.random()}
            {@const contentLen = isAnon ? entry.content.length : entry.nickname.length + entry.content.length + 2}
            {@const bubbleWidth = Math.min(Math.max(contentLen * 9, 120), 2500)}
            <button
              class="message-bubble"
              class:anonymous={isAnon}
              class:expanded={expandedId === entry.id}
              style="width: {bubbleWidth}px; top: {Math.floor(rowSeed * totalRows) * rowHeight}px; animation-duration: {duration}s; animation-delay: {delay}s;"
              on:mouseenter={() => hoveredId = entry.id}
              on:mouseleave={() => hoveredId = null}
              on:click={() => toggleExpand(entry.id)}
            >
              {#if isAnon}
                <span class="message-text">{entry.content}</span>
              {:else}
                <span class="message-name">{entry.nickname}:</span>
                <span class="message-text">{entry.content}</span>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      <!-- 详情弹窗 -->
      {#if expandedId !== null}
        {@const entry = entries.find(e => e.id === expandedId)}
        {#if entry}
          <div class="detail-overlay" on:click={() => expandedId = null}>
            <div class="detail-panel" on:click|stopPropagation>
              <div class="detail-header">
                <span class="detail-name">{entry.nickname}</span>
                <span class="detail-time">{formatDate(entry.createdAt)}</span>
              </div>
              <p class="detail-text">{entry.content}</p>
              {#if isAdmin()}
                <button class="delete-btn" on:click={() => deleteEntry(entry.id)}>
                  <Icon icon="material-symbols:delete-outline" />
                  删除
                </button>
              {/if}
            </div>
          </div>
        {/if}
      {/if}
    {/if}
  </div>
</div>

<style>
  .guestbook-wrapper {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  /* 头部 */
  .guestbook-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding: 1.25rem 1.5rem;
    background: var(--card-bg);
    border-radius: 1rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }

  .header-icon {
    width: 52px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--primary) 0%, #8b5cf6 100%);
    border-radius: 0.875rem;
    color: white;
  }

  .header-title {
    font-size: 1.375rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  .header-subtitle {
    font-size: 0.875rem;
    color: var(--text-50);
    margin: 0.25rem 0 0;
  }

  /* 留言表单 */
  .guestbook-form {
    margin-bottom: 1.5rem;
  }

  .form-row {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .form-input {
    flex: 1;
    padding: 0.75rem 1rem;
    background: var(--btn-regular-bg);
    border: 1px solid var(--border);
    border-radius: 0.75rem;
    font-size: 0.9375rem;
    color: var(--text-primary);
    transition: all 0.2s;
  }

  .form-input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
  }

  .form-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .form-input::placeholder {
    color: var(--text-40);
  }

  .anonymous-toggle {
    display: flex;
    align-items: center;
    cursor: pointer;
    white-space: nowrap;
  }

  .anonymous-toggle input {
    display: none;
  }

  .toggle-label {
    padding: 0.5rem 0.75rem;
    background: var(--btn-regular-bg);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    font-size: 0.8125rem;
    color: var(--text-50);
    transition: all 0.2s;
  }

  .anonymous-toggle input:checked + .toggle-label {
    background: var(--primary);
    border-color: var(--primary);
    color: white;
  }

  .submit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    background: linear-gradient(135deg, var(--primary) 0%, #8b5cf6 100%);
    color: white;
    border: none;
    border-radius: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  }

  .submit-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .login-hint {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem;
    background: var(--card-bg);
    border-radius: 0.75rem;
    color: var(--text-50);
    font-size: 0.875rem;
  }

  /* 留言列表 */
  .messages-container {
    position: relative;
    min-height: 200px;
  }

  .scroll-wrapper {
    overflow: hidden;
    padding: 0.5rem 0;
  }

  .bubbles-container {
    position: relative !important;
    min-height: 250px;
  }

  /* 消息气泡 */
  .message-bubble {
    position: absolute;
    display: inline-block;
    height: 36px;
    padding: 0 1rem;
    border-radius: 18px;
    border: none;
    cursor: pointer;
    color: white;
    font-size: 0.875rem;
    line-height: 36px;
    white-space: nowrap;
    overflow: hidden;
    background: var(--primary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s, box-shadow 0.2s;
    animation: scrollRight linear infinite;
    animation-play-state: running;
  }

  .message-bubble:hover,
  .message-bubble[style*="paused"] {
    animation-play-state: paused;
    transform: scale(1.05);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  }

  .message-bubble.anonymous {
    background: linear-gradient(135deg, #6b7280, #374151) !important;
    border: 1px dashed rgba(255, 255, 255, 0.3);
  }

  .message-name {
    font-weight: 600;
    flex-shrink: 0;
  }

  .message-text {
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 2400px;
  }

  @keyframes scrollRight {
    0% {
      transform: translateX(calc(-100% - 50px));
    }
    100% {
      transform: translateX(100vw);
    }
  }

  /* 详情弹窗 */
  .detail-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
    backdrop-filter: blur(4px);
  }

  .detail-panel {
    background: var(--card-bg);
    border-radius: 1rem;
    padding: 1.5rem;
    max-width: 500px;
    width: 100%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    animation: slideUp 0.3s ease;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .detail-name {
    font-weight: 700;
    font-size: 1.125rem;
    color: var(--text-primary);
  }

  .detail-time {
    font-size: 0.8125rem;
    color: var(--text-40);
  }

  .detail-text {
    color: var(--text-80);
    font-size: 0.9375rem;
    line-height: 1.7;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0 0 1rem;
  }

  .delete-btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 1rem;
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .delete-btn:hover {
    background: rgba(239, 68, 68, 0.2);
  }

  /* 状态 */
  .loading-state, .error-state, .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    background: var(--card-bg);
    border-radius: 1rem;
    color: var(--text-50);
    gap: 0.75rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }

  /* 响应式 */
  @media (max-width: 640px) {
    .guestbook-wrapper {
      padding: 1rem 0.5rem;
    }

    .form-row {
      flex-wrap: wrap;
    }

    .form-input {
      min-width: 100%;
    }
  }
</style>
