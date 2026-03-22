<script lang="ts">
  import { onMount } from 'svelte';

  let title = '';
  let slug = '';
  let description = '';
  let content = '';
  let tags = '';
  let category = '';
  let image = '';
  let draft = false;
  let published = new Date().toISOString().split('T')[0];
  let views = 0;
  let loading = false;
  let error = '';
  let uploading = false;
  let textareaRef: HTMLTextAreaElement | null = null;
  let imageCounter = 0; // 图片计数器，用于生成临时占位符
  let uploadedImages: Map<string, string> = new Map(); // 占位符 ID -> Base64 URL

  // 简化版扩展字段
  let pinned = false;

  onMount(async () => {
    // 设置默认发布日期为今天
    published = new Date().toISOString().split('T')[0];
  });

  function generateSlug(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function handleTitleChange(event: Event) {
    const target = event.target as HTMLInputElement;
    title = target.value;
    if (!slug) {
      slug = generateSlug(title);
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
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        image = data.url || `/uploads/images/${data.filename}`;
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

  // 上传并插入图片到光标位置
  function uploadAndInsert(event?: Event) {
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
        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          insertImageToContent(data.url, data.filename || 'image');
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

  async function handleSubmit(event: Event) {
    event.preventDefault();
    error = '';

    if (!title.trim()) {
      error = '请输入文章标题';
      return;
    }

    if (!slug.trim()) {
      error = '请输入文章 slug';
      return;
    }

    // 将占位符替换为完整的 Base64 URL
    let finalContent = content;
    for (const [placeholderId, imageUrl] of uploadedImages.entries()) {
      const regex = new RegExp(`\\{\\{${placeholderId}\\}\\}`, 'g');
      finalContent = finalContent.replace(regex, `![${placeholderId}](${imageUrl})`);
    }

    loading = true;

    try {
      const res = await fetch('/api/admin/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          slug,
          description,
          content: finalContent,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          category,
          image,
          draft,
          published,
          views,
          pinned,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        // 创建成功后，显示提示并清空表单
        alert('文章创建成功！');
        // 清空表单
        title = '';
        slug = '';
        description = '';
        content = '';
        tags = '';
        category = '';
        image = '';
        draft = false;
        published = new Date().toISOString().split('T')[0];
        views = 0;
        pinned = false;
        imageCounter = 0;
        uploadedImages = new Map();
      } else {
        const data = await res.json();
        error = `创建失败：${data.error}`;
      }
    } catch (err) {
      error = '创建失败：网络错误';
    } finally {
      loading = false;
    }
  }
</script>

<div class="editor-container">
  <div class="editor-header">
    <h1>➕ 新建文章</h1>
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
        on:input={handleTitleChange}
        placeholder="输入文章标题"
        required
      />
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Slug *</label>
        <input
          type="text"
          bind:value={slug}
          placeholder="article-slug"
          required
        />
        <p class="form-hint">文章的唯一标识</p>
      </div>
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
          bind:value={published}
        />
      </div>
      <div class="form-group">
        <label>初始浏览量</label>
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
      <label class="checkbox-label">
        <input type="checkbox" bind:checked={pinned} />
        <span>置顶文章</span>
      </label>
    </div>

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
        <input type="checkbox" bind:checked={draft} />
        <span>保存为草稿（暂不发布）</span>
      </label>
    </div>

    <div class="form-actions">
      <button type="submit" class="btn btn-primary" disabled={loading}>
        {loading ? '创建中...' : '创建文章'}
      </button>
      <button type="button" class="btn btn-secondary" on:click={() => history.back()}>
        取消
      </button>
    </div>
  </form>
</div>

<style>
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
  .form-group input[type="date"],
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
    margin-top: 0;
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
