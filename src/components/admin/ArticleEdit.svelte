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
    images?: ImageItem[];
  }

  interface ImageItem {
    id: string;
    name: string;
    base64: string;
    size: number;
    type: string;
    uploadedAt: string;
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
  let images: ImageItem[] = [];
  let loading = true;
  let saving = false;
  let uploading = false;
  let error = '';
  let showImageManager = false;
  let textareaRef: HTMLTextAreaElement | null = null;
  let imageCounter = 0; // 图片计数器，用于生成临时占位符
  let uploadedImages: Map<string, string> = new Map(); // 占位符 ID -> Base64 URL

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

        // 将已有的 Base64 图片转换为占位符格式
        let rawContent = article.rawContent || article.content || '';
        imageCounter = 0;
        uploadedImages = new Map();

        // 解析 Markdown 图片格式 ![alt](data:image/...)
        const base64ImageRegex = /!\[([^\]]*)\]\((data:image\/[^)]+)\)/g;
        rawContent = rawContent.replace(base64ImageRegex, (match, alt, dataUrl) => {
          imageCounter++;
          const placeholderId = `img_${imageCounter}`;
          uploadedImages.set(placeholderId, dataUrl);
          return `{{${placeholderId}}}`;
        });

        content = rawContent;
        tags = article.tags?.join(', ') || '';
        category = article.category || '';
        image = article.image || '';
        published = article.published;
        publishedDate = article.publishedAt || article.published || '';
        views = article.views || 0;
        images = article.images || [];
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

  // 上传封面图
  async function handleCoverUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    uploading = true;
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch(`/api/admin/upload?articleSlug=${encodeURIComponent(articleSlug)}`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        // 更新封面图
        image = data.url;
        // 刷新图片列表
        await fetchArticle(articleSlug);
        alert('封面图上传成功');
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

  // 打开文件选择器上传并插入
  function uploadAndInsert() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      uploading = true;
      const formData = new FormData();
      formData.append('image', file);

      try {
        const res = await fetch(`/api/admin/upload?articleSlug=${encodeURIComponent(articleSlug)}`, {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          insertImageToContent(data.url, data.filename || 'image');
          await fetchArticle(articleSlug);
        } else {
          const data = await res.json();
          alert(`上传失败：${data.error}`);
        }
      } catch (err) {
        alert('上传失败：网络错误');
      } finally {
        uploading = false;
      }
    };
    input.click();
  }

  // 插入图片到 Markdown 光标位置（使用占位符格式）
  function insertImageToContent(imageUrl: string, filename: string) {
    if (!textareaRef) {
      textareaRef = document.querySelector('.content-editor') as HTMLTextAreaElement;
    }
    if (!textareaRef) return;

    const start = textareaRef.selectionStart;
    const end = textareaRef.selectionEnd;

    // 生成临时占位符 ID
    imageCounter++;
    const placeholderId = `img_${imageCounter}`;
    // 存储占位符到 Base64 的映射
    uploadedImages.set(placeholderId, imageUrl);

    // 插入简短的占位符格式：{{img_1}}
    const placeholder = `{{${placeholderId}}}`;
    content = content.substring(0, start) + placeholder + content.substring(end);

    // 重新聚焦并移动光标
    setTimeout(() => {
      textareaRef!.focus();
      textareaRef!.selectionStart = textareaRef!.selectionEnd = start + placeholder.length;
    }, 0);
  }

  // 删除图片
  async function handleDeleteImage(imageId: string) {
    if (!confirm('确定要删除这张图片吗？')) return;

    try {
      const res = await fetch(`/api/admin/articles/${encodeURIComponent(articleSlug)}?imageId=${imageId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        images = images.filter(img => img.id !== imageId);
        alert('图片已删除');
      } else {
        const data = await res.json();
        alert(`删除失败：${data.error}`);
      }
    } catch (err) {
      alert('删除失败：网络错误');
    }
  }

  // 预览图片
  function previewImage(imageUrl: string) {
    const win = window.open();
    if (win) {
      win.document.write(`<img src="${imageUrl}" style="max-width:100%;height:auto;" />`);
    }
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();
    error = '';

    if (!title.trim()) {
      error = '请输入文章标题';
      return;
    }

    // 将占位符替换为完整的 Base64 URL
    let finalContent = content;
    for (const [placeholderId, imageUrl] of uploadedImages.entries()) {
      const regex = new RegExp(`\\{\\{${placeholderId}\\}\\}`, 'g');
      finalContent = finalContent.replace(regex, `![${placeholderId}](${imageUrl})`);
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
          content: finalContent,
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
            {uploading ? '上传中...' : '上传封面'}
            <input
              type="file"
              accept="image/*"
              on:change={handleCoverUpload}
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

      <!-- 图片管理器按钮 -->
      <div class="form-group">
        <button type="button" class="btn btn-image-manager" on:click={() => showImageManager = !showImageManager}>
          {showImageManager ? '📷 隐藏图片管理' : '📷 图片管理'} ({images.length})
        </button>
      </div>

      <!-- 图片管理器面板 -->
      {#if showImageManager}
        <div class="image-manager">
          {#if images.length === 0}
            <div class="empty-images">暂无图片，请先上传</div>
          {:else}
            <div class="image-grid">
              {#each images as img}
                <div class="image-card">
                  <img src={img.base64} alt={img.name} on:click={() => previewImage(img.base64)} />
                  <div class="image-info">
                    <span class="image-name">{img.name}</span>
                    <span class="image-size">{(img.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <div class="image-actions">
                    <button type="button" class="btn-sm btn-insert" on:click={() => insertImageToContent(img.base64, img.name)}>
                      插入
                    </button>
                    <button type="button" class="btn-sm btn-delete" on:click={() => handleDeleteImage(img.id)}>
                      删除
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      <div class="form-group">
        <label>内容 *</label>
        <div class="editor-toolbar">
          <button type="button" class="btn btn-insert-image" on:click={uploadAndInsert} disabled={uploading}>
            📷 插入图片
          </button>
        </div>
        <textarea
          bind:value={content}
          bind:this={textareaRef}
          placeholder="# 文章标题&#10;&#10;这里是文章内容，支持 Markdown 格式..."
          rows="20"
          class="content-editor"
          required
        ></textarea>
        <p class="form-hint">支持 Markdown 格式，图片使用 ![描述] (data:image/...) 格式</p>
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

  .editor-toolbar {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .btn-insert-image {
    background: #667eea;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: opacity 0.2s;
  }

  .btn-insert-image:hover {
    opacity: 0.9;
  }

  .btn-insert-image:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-image-manager {
    background: #f5f5f5;
    color: #666;
    width: 100%;
    margin-top: 0.5rem;
  }

  .image-manager {
    margin-top: 1rem;
    padding: 1rem;
    background: var(--bg);
    border-radius: 0.5rem;
  }

  .empty-images {
    text-align: center;
    color: var(--text-secondary);
    padding: 2rem;
  }

  .image-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
  }

  .image-card {
    background: var(--card-bg);
    border-radius: 0.5rem;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s;
  }

  .image-card:hover {
    transform: translateY(-2px);
  }

  .image-card img {
    width: 100%;
    height: 150px;
    object-fit: cover;
    cursor: pointer;
  }

  .image-info {
    padding: 0.75rem;
  }

  .image-name {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .image-size {
    display: block;
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin-top: 0.25rem;
  }

  .image-actions {
    display: flex;
    gap: 0.5rem;
    padding: 0.75rem;
    border-top: 1px solid var(--border-color);
  }

  .btn-sm {
    flex: 1;
    padding: 0.375rem 0.75rem;
    font-size: 0.8rem;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
    font-weight: 500;
  }

  .btn-insert {
    background: #667eea;
    color: white;
  }

  .btn-delete {
    background: #ef4444;
    color: white;
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
