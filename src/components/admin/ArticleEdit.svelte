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
    image: string;
    draft: boolean;
    content: string;
    views?: number;
  }

  let articleSlug = '';
  let title = '';
  let description = '';
  let content = '';
  let tags = '';
  let category = '';
  let image = '';
  let published = true;
  let publishedDate = '';
  let views = 0;
  let loading = true;
  let saving = false;
  let uploading = false;
  let error = '';

  onMount(async () => {
    const slug = window.location.pathname.split('/').filter(Boolean).slice(0, -1).pop();
    if (slug) {
      articleSlug = slug;
      await fetchArticle(slug);
    }
  });

  async function fetchArticle(slug: string) {
    try {
      const res = await fetch(`/api/admin/articles/${encodeURIComponent(slug)}`);

      if (res.ok) {
        const data = await res.json();
        const article = data.article;
        title = article.title;
        description = article.description;
        content = article.content;
        tags = article.tags?.join(', ') || '';
        category = article.category || '';
        image = article.image || '';
        published = article.published;
        publishedDate = article.publishedAt || article.published || '';
        views = article.views || 0;
      } else {
        const data = await res.json();
        error = data.error || '获取文章失败';
      }
    } catch (err) {
      error = '网络错误，请稍后重试';
    } finally {
      loading = false;
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
        image = data.url || `/uploads/images/${data.filename}`;
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

  async function handleSubmit(event: Event) {
    event.preventDefault();
    error = '';

    if (!title.trim()) {
      error = '请输入文章标题';
      return;
    }

    saving = true;

    try {
      const res = await fetch(`/api/admin/articles/${encodeURIComponent(articleSlug)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          content,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          category,
          image,
          published: publishedDate,
          draft: !published,
          views,
        }),
      });

      if (res.ok) {
        // 保存成功后，调用同步 API 刷新内容
        await fetch('/api/admin/sync-content', { method: 'POST' });
        alert('文章更新成功');
        window.location.href = '/admin/articles';
      } else {
        const data = await res.json();
        error = `更新失败：${data.error}`;
      }
    } catch (err) {
      error = '更新失败：网络错误';
    } finally {
      saving = false;
    }
  }

  async function handleDelete() {
    if (!confirm(`确定要删除文章"${title}"吗？此操作不可恢复。`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/articles/${encodeURIComponent(articleSlug)}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('文章已删除');
        window.location.href = '/admin/articles';
      } else {
        const data = await res.json();
        alert(`删除失败：${data.error}`);
      }
    } catch (err) {
      alert('删除失败：网络错误');
    }
  }
</script>

{#if loading}
  <div class="loading-container">加载中...</div>
{:else}
  <div class="editor-container">
    <div class="editor-header">
      <h1>✏️ 编辑文章</h1>
      <a href="/admin/articles" class="btn btn-secondary">← 返回列表</a>
    </div>

    <form class="editor-form" on:submit={handleSubmit}>
      {#if error}
        <div class="error-message">{error}</div>
      {/if}

      <div class="form-group">
        <label>标题 *</label>
        <input
          type="text"
          bind:value={title}
          placeholder="输入文章标题"
          required
        />
      </div>

      <div class="form-group">
        <label>Slug</label>
        <input
          type="text"
          value={articleSlug}
          disabled
          class="disabled"
        />
        <p class="form-hint">Slug 不可修改，如需修改请删除后重新创建</p>
      </div>

      <div class="form-group">
        <label>描述</label>
        <textarea
          bind:value={description}
          placeholder="文章简短描述"
          rows="3"
        ></textarea>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>分类</label>
          <input
            type="text"
            bind:value={category}
            placeholder="随笔 / 教程 / 生活 ..."
          />
        </div>
        <div class="form-group">
          <label>标签</label>
          <input
            type="text"
            bind:value={tags}
            placeholder="标签 1, 标签 2, 标签 3"
          />
          <p class="form-hint">用逗号分隔多个标签</p>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>发布日期</label>
          <input
            type="date"
            bind:value={publishedDate}
          />
        </div>
        <div class="form-group">
          <label>浏览量</label>
          <input
            type="number"
            bind:value={views}
            min="0"
            placeholder="0"
          />
        </div>
      </div>

      <div class="form-group">
        <label>封面图</label>
        <div class="image-input-wrapper">
          <input
            type="text"
            bind:value={image}
            placeholder="/uploads/images/xxx.png"
          />
          <label class="btn btn-upload" class:uploading={uploading}>
            {uploading ? '上传中...' : '上传图片'}
            <input
              type="file"
              accept="image/*"
              on:change={handleImageUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {#if image}
        <div class="image-preview">
          <img src={image} alt="封面预览" />
        </div>
      {/if}

      <div class="form-group">
        <label>内容 *</label>
        <textarea
          bind:value={content}
          placeholder="# 文章标题&#10;&#10;这里是文章内容，支持 Markdown 格式..."
          rows="20"
          class="content-editor"
          required
        ></textarea>
        <p class="form-hint">支持 Markdown 格式，图片使用相对路径如 ./image.png</p>
      </div>

      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={published} />
          <span>{published ? '已发布' : '草稿状态'}</span>
        </label>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn btn-primary" disabled={saving}>
          {saving ? '保存中...' : '保存更改'}
        </button>
        <button type="button" class="btn btn-danger" on:click={handleDelete}>
          删除文章
        </button>
        <button type="button" class="btn btn-secondary" on:click={() => history.back()}>
          取消
        </button>
      </div>
    </form>
  </div>
{/if}

<style>
  .loading-container {
    min-height: 50vh;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    font-size: 1.125rem;
  }

  .editor-container {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem;
  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .editor-header h1 {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--text-primary);
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

  .btn-primary:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: #f5f5f5;
    color: #666;
  }

  .btn-danger {
    background: #ef4444;
    color: white;
  }

  .btn-upload {
    background: #667eea;
    color: white;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    padding: 0.625rem 1.25rem;
    border-radius: 0.5rem;
  }

  .btn-upload.uploading {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .btn-upload input {
    display: none;
  }

  .editor-form {
    background: var(--card-bg);
    padding: 2rem;
    border-radius: 0.75rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .error-message {
    background: #fee;
    color: #c00;
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
    font-weight: 500;
  }

  .form-group input[type="text"],
  .form-group input[type="password"],
  .form-group input[type="email"],
  .form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid var(--border-color);
    border-radius: 0.5rem;
    font-size: 0.9375rem;
    box-sizing: border-box;
    background: var(--bg);
    color: var(--text-primary);
  }

  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #667eea;
  }

  .form-group input.disabled {
    background: #f5f5f5;
    color: #888;
    cursor: not-allowed;
  }

  .form-hint {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin-top: 0.375rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .image-input-wrapper {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .image-input-wrapper input[type="text"] {
    flex: 1;
  }

  .image-preview {
    margin-top: 0.75rem;
  }

  .image-preview img {
    max-width: 300px;
    border-radius: 0.5rem;
  }

  .content-editor {
    font-family: monospace;
    resize: vertical;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .checkbox-label input {
    width: 1.125rem;
    height: 1.125rem;
  }

  .form-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }

  .form-actions .btn-primary {
    flex: 1;
  }
</style>
