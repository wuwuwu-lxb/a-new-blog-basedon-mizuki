/**
 * 编辑文章页面
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

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
}

export default function EditArticle() {
  const router = useRouter();
  const { slug } = router.query;

  const [title, setTitle] = useState('');
  const [articleSlug, setArticleSlug] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('');
  const [image, setImage] = useState('');
  const [published, setPublished] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchArticle(slug as string);
    }
  }, [slug]);

  const fetchArticle = async (articleSlug: string) => {
    try {
      const res = await fetch(`/api/admin/articles/${encodeURIComponent(articleSlug)}`);
      if (res.ok) {
        const data = await res.json();
        const article = data.article;
        setTitle(article.title);
        setArticleSlug(article.slug);
        setDescription(article.description);
        setContent(article.content);
        setTags(article.tags?.join(', ') || '');
        setCategory(article.category || '');
        setImage(article.image || '');
        setPublished(article.published);
      } else {
        setError('获取文章失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const url = data.url || `/uploads/images/${data.filename}`;
        setImage(url);
        alert('图片上传成功');
      } else {
        const data = await res.json();
        alert(`上传失败：${data.error}`);
      }
    } catch (err) {
      alert('上传失败：网络错误');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('请输入文章标题');
      return;
    }

    setSaving(true);
    const token = localStorage.getItem('admin_token');

    try {
      const res = await fetch(`/api/admin/articles/${encodeURIComponent(articleSlug)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          content,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          category,
          image,
          published,
          draft: !published,
        }),
      });

      if (res.ok) {
        alert('文章更新成功');
        router.push('/admin/dashboard');
      } else {
        const data = await res.json();
        setError(`更新失败：${data.error}`);
      }
    } catch (err) {
      setError('更新失败：网络错误');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`确定要删除文章"${title}"吗？此操作不可恢复。`)) {
      return;
    }

    const token = localStorage.getItem('admin_token');
    try {
      const res = await fetch(`/api/admin/articles/${encodeURIComponent(articleSlug)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        alert('文章已删除');
        router.push('/admin/dashboard');
      } else {
        const data = await res.json();
        alert(`删除失败：${data.error}`);
      }
    } catch (err) {
      alert('删除失败：网络错误');
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
      }}>
        <div style={{ fontSize: '18px', color: '#666' }}>加载中...</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f5',
    }}>
      {/* Header */}
      <header style={{
        background: 'white',
        borderBottom: '1px solid #eee',
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h1 style={{ fontSize: '24px', color: '#333', margin: 0 }}>
          ✏️ 编辑文章
        </h1>
        <a
          href="/admin/dashboard"
          style={{
            padding: '10px 20px',
            background: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: '8px',
            textDecoration: 'none',
            color: '#666',
          }}
        >
          ← 返回列表
        </a>
      </header>

      {/* Main Content */}
      <main style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
        <form onSubmit={handleSubmit} style={{
          background: 'white',
          padding: '30px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}>
          {error && (
            <div style={{
              background: '#fee',
              color: '#c00',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
            }}>
              {error}
            </div>
          )}

          {/* Title */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#555',
              fontWeight: '500',
            }}>
              标题 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #eee',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box',
              }}
              placeholder="输入文章标题"
              required
            />
          </div>

          {/* Slug (Read-only) */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#555',
              fontWeight: '500',
            }}>
              Slug
            </label>
            <input
              type="text"
              value={articleSlug}
              disabled
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #eee',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box',
                background: '#f9f9f9',
                color: '#888',
              }}
            />
            <p style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
              Slug 不可修改，如需修改请删除后重新创建
            </p>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#555',
              fontWeight: '500',
            }}>
              描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #eee',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box',
                minHeight: '80px',
                resize: 'vertical',
              }}
              placeholder="文章简短描述"
            />
          </div>

          {/* Category & Tags */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#555',
                fontWeight: '500',
              }}>
                分类
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #eee',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
                placeholder="随笔 / 教程 / 生活 ..."
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#555',
                fontWeight: '500',
              }}>
                标签
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #eee',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
                placeholder="标签 1, 标签 2, 标签 3"
              />
              <p style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
                用逗号分隔多个标签
              </p>
            </div>
          </div>

          {/* Image Upload */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#555',
              fontWeight: '500',
            }}>
              封面图
            </label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="text"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '2px solid #eee',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
                placeholder="/uploads/images/xxx.png"
              />
              <label style={{
                padding: '12px 20px',
                background: '#667eea',
                color: 'white',
                borderRadius: '8px',
                cursor: uploading ? 'not-allowed' : 'pointer',
                opacity: uploading ? 0.7 : 1,
              }}>
                {uploading ? '上传中...' : '上传图片'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            {image && (
              <div style={{ marginTop: '10px' }}>
                <img src={image} alt="封面预览" style={{ maxWidth: '300px', borderRadius: '8px' }} />
              </div>
            )}
          </div>

          {/* Content */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#555',
              fontWeight: '500',
            }}>
              内容 *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #eee',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box',
                minHeight: '400px',
                resize: 'vertical',
                fontFamily: 'monospace',
              }}
              placeholder="# 文章标题&#10;&#10;这里是文章内容，支持 Markdown 格式..."
              required
            />
            <p style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
              支持 Markdown 格式，图片使用相对路径如 ./image.png
            </p>
          </div>

          {/* Publish Status */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                style={{ width: '18px', height: '18px' }}
              />
              <span style={{ color: '#555' }}>
                {published ? '已发布' : '草稿状态'}
              </span>
            </label>
          </div>

          {/* Submit Buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1,
                padding: '14px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? '保存中...' : '保存更改'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              style={{
                padding: '14px 30px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              删除文章
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              style={{
                padding: '14px 30px',
                background: '#f5f5f5',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
                color: '#666',
              }}
            >
              取消
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
