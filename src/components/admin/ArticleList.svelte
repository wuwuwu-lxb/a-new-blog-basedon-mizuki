<script lang="ts">
  import { onMount } from 'svelte';

  interface Article {
    slug: string;
    title: string;
    description: string;
    published: boolean;
    publishedAt: string;
    tags: string[];
    category: string;
    image?: string;
    draft: boolean;
    views?: number;
  }

  let articles: Article[] = [];
  let loading = true;
  let error = '';
  let uploading = false;
  let uploadedUrl = '';
  let syncing = false;

  onMount(async () => {
    await fetchArticles();
  });

  async function fetchArticles() {
    try {
      const res = await fetch('/api/admin/articles');

      if (res.ok) {
        const data = await res.json();
        articles = data.articles || [];
      } else {
        error = '获取文章列表失败';
      }
    } catch (err) {
      error = '网络错误，请稍后重试';
    } finally {
      loading = false;
    }
  }

  async function handleSync() {
    syncing = true;
    try {
      const res = await fetch('/api/admin/sync-content', {
        method: 'POST',
      });

      if (res.ok) {
        const data = await res.json();
        // 等待一小段时间让 Astro 检测到文件变化
        await new Promise(resolve => setTimeout(resolve, 500));
        // 同步后刷新整个页面，确保获取最新内容
        window.location.reload();
      } else {
        const data = await res.json();
        alert(`同步失败：${data.error}`);
      }
    } catch (err) {
      alert('同步失败：网络错误');
    } finally {
      syncing = false;
    }
  }

  async function handleDelete(slug: string) {
    if (!confirm(`确定要删除文章"${slug}"吗？此操作不可恢复。`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/articles/${encodeURIComponent(slug)}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        articles = articles.filter(a => a.slug !== slug);
        alert('文章已删除');
      } else {
        const data = await res.json();
        alert(`删除失败：${data.error}`);
      }
    } catch (err) {
      alert('删除失败：网络错误');
    }
  }

  async function handleTogglePublish(article: Article) {
    try {
      const res = await fetch(`/api/admin/articles/${encodeURIComponent(article.slug)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          published: !article.published,
          draft: article.published,
        }),
      });

      if (res.ok) {
        articles = articles.map(a =>
          a.slug === article.slug
            ? { ...a, published: !a.published, draft: article.published }
            : a
        );
        alert(article.published ? '文章已设为草稿' : '文章已发布');
      } else {
        const data = await res.json();
        alert(`操作失败：${data.error}`);
      }
    } catch (err) {
      alert('操作失败：网络错误');
    }
  }

  async function handleImageUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    uploading = true;
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        uploadedUrl = data.url || `/uploads/images/${data.filename}`;
        alert('图片上传成功');
      } else {
        const data = await res.json();
        alert(`上传失败：${data.error}`);
      }
    } catch (err) {
      alert('上传失败：网络错误');
    } finally {
      uploading = false;
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    alert('已复制到剪贴板');
  }
</script>

<div class="admin-container">
  <div class="admin-header">
    <h1>📝 文章管理</h1>
    <div class="header-actions">
      <button class="btn btn-sync" on:click={handleSync} disabled={syncing}>
        {syncing ? '同步中...' : '🔄 刷新内容'}
      </button>
      <a href="/admin/articles/new" class="btn btn-primary">➕ 新建文章</a>
      <a href="/admin" class="btn btn-secondary">← 返回后台</a>
    </div>
  </div>

  <!-- Stats -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-number">{articles.length}</div>
      <div class="stat-label">总文章数</div>
    </div>
    <div class="stat-card">
      <div class="stat-number green">{articles.filter(a => a.published).length}</div>
      <div class="stat-label">已发布</div>
    </div>
    <div class="stat-card">
      <div class="stat-number orange">{articles.filter(a => !a.published).length}</div>
      <div class="stat-label">草稿</div>
    </div>
  </div>

  <!-- Upload Section -->
  <div class="upload-section">
    <label class="btn btn-upload">
      📎 上传图片
      <input
        type="file"
        accept="image/*"
        on:change={handleImageUpload}
        disabled={uploading}
      />
    </label>
    {#if uploadedUrl}
      <div class="upload-success">
        <span>上传成功：{uploadedUrl}</span>
        <button class="btn btn-sm" on:click={() => copyToClipboard(uploadedUrl)}>复制</button>
      </div>
    {/if}
  </div>

  <!-- Article List -->
  <div class="article-list-container">
    {#if loading}
      <div class="loading">加载中...</div>
    {:else if error}
      <div class="error">{error}</div>
    {:else if articles.length === 0}
      <div class="empty-state">
        暂无文章，点击"新建文章"开始创作
      </div>
    {:else}
      <table class="article-table">
        <thead>
          <tr>
            <th>标题</th>
            <th>状态</th>
            <th>分类</th>
            <th>标签</th>
            <th>发布日期</th>
            <th>浏览量</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {#each articles as article}
            <tr>
              <td>
                <div class="article-title">{article.title}</div>
                <div class="article-slug">/{article.slug}</div>
              </td>
              <td>
                <span class="status-badge {article.published ? 'published' : 'draft'}">
                  {article.published ? '已发布' : '草稿'}
                </span>
              </td>
              <td>{article.category || '-'}</td>
              <td>
                <div class="tags-list">
                  {#each article.tags.slice(0, 3) as tag}
                    <span class="tag">{tag}</span>
                  {/each}
                  {#if article.tags.length > 3}
                    <span class="tag-more">+{article.tags.length - 3}</span>
                  {/if}
                </div>
              </td>
              <td>{article.publishedAt || '-'}</td>
              <td>
                <span class="views-count">{(article.views || 0).toLocaleString()}</span>
              </td>
              <td>
                <div class="action-buttons">
                  <a href="/admin/articles/{encodeURIComponent(article.slug)}/edit" class="btn btn-sm btn-edit">编辑</a>
                  <button
                    class="btn btn-sm {article.published ? 'btn-warning' : 'btn-success'}"
                    on:click={() => handleTogglePublish(article)}
                  >
                    {article.published ? '下架' : '发布'}
                  </button>
                  <button
                    class="btn btn-sm btn-danger"
                    on:click={() => handleDelete(article.slug)}
                  >
                    删除
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</div>

<style>
  .admin-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
  }

  .admin-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .admin-header h1 {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .header-actions {
    display: flex;
    gap: 0.75rem;
  }

  .btn {
    padding: 0.625rem 1.25rem;
    border-radius: 0.5rem;
    font-weight: 500;
    font-size: 0.875rem;
    text-decoration: none;
    border: none;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .btn:hover {
    opacity: 0.9;
  }

  .btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .btn-secondary {
    background: #f5f5f5;
    color: #666;
  }

  .btn-sync {
    background: #10b981;
    color: white;
  }

  .btn-sync:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .btn-upload {
    background: #f5f5f5;
    color: #666;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn-upload input {
    display: none;
  }

  .btn-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.8rem;
  }

  .btn-edit {
    background: #667eea;
    color: white;
  }

  .btn-success {
    background: #22c55e;
    color: white;
  }

  .btn-warning {
    background: #f59e0b;
    color: white;
  }

  .btn-danger {
    background: #ef4444;
    color: white;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .stat-card {
    background: var(--card-bg);
    padding: 1.25rem;
    border-radius: 0.75rem;
    text-align: center;
  }

  .stat-number {
    font-size: 2rem;
    font-weight: 700;
    color: #667eea;
  }

  .stat-number.green {
    color: #22c55e;
  }

  .stat-number.orange {
    color: #f59e0b;
  }

  .stat-label {
    color: var(--text-secondary);
    font-size: 0.875rem;
    margin-top: 0.25rem;
  }

  .upload-section {
    background: var(--card-bg);
    padding: 1rem 1.25rem;
    border-radius: 0.75rem;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .upload-success {
    flex: 1;
    background: #e8f5e9;
    color: #2e7d32;
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .upload-success .btn-sm {
    background: #2e7d32;
    color: white;
  }

  .article-list-container {
    background: var(--card-bg);
    border-radius: 0.75rem;
    overflow: hidden;
  }

  .loading, .error, .empty-state {
    padding: 3rem;
    text-align: center;
    color: var(--text-secondary);
  }

  .error {
    color: #c00;
    background: #fee;
    border-radius: 0.5rem;
    margin: 1rem;
  }

  .article-table {
    width: 100%;
    border-collapse: collapse;
  }

  .article-table th {
    padding: 1rem 1.25rem;
    text-align: left;
    font-weight: 600;
    color: var(--text-secondary);
    border-bottom: 2px solid var(--border-color);
    font-size: 0.875rem;
  }

  .article-table td {
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border-color);
  }

  .article-title {
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
  }

  .article-slug {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .status-badge.published {
    background: #e8f5e9;
    color: #2e7d32;
  }

  .status-badge.draft {
    background: #fff3e0;
    color: #ef6c00;
  }

  .tags-list {
    display: flex;
    gap: 0.375rem;
    flex-wrap: wrap;
  }

  .tag {
    padding: 0.125rem 0.5rem;
    background: #f0f0f0;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    color: #666;
  }

  .tag-more {
    font-size: 0.75rem;
    color: #888;
  }

  .action-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .views-count {
    font-size: 0.875rem;
    color: var(--text-secondary);
    font-weight: 500;
  }
</style>
