/**
 * 管理员后台仪表盘
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
  image?: string;
  draft: boolean;
}

export default function Dashboard() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState('');

  useEffect(() => {
    // 检查登录状态
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const res = await fetch('/api/admin/articles');
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles || []);
      } else {
        setError('获取文章列表失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    router.push('/admin/login');
  };

  const handleDelete = async (slug: string) => {
    if (!confirm(`确定要删除文章"${slug}"吗？此操作不可恢复。`)) {
      return;
    }

    const token = localStorage.getItem('admin_token');
    try {
      const res = await fetch(`/api/admin/articles/${encodeURIComponent(slug)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setArticles(articles.filter(a => a.slug !== slug));
        alert('文章已删除');
      } else {
        const data = await res.json();
        alert(`删除失败：${data.error}`);
      }
    } catch (err) {
      alert('删除失败：网络错误');
    }
  };

  const handleTogglePublish = async (article: Article) => {
    const token = localStorage.getItem('admin_token');
    try {
      const res = await fetch(`/api/admin/articles/${encodeURIComponent(article.slug)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          published: !article.published,
          draft: article.published,
        }),
      });

      if (res.ok) {
        setArticles(articles.map(a =>
          a.slug === article.slug
            ? { ...a, published: !a.published, draft: article.published }
            : a
        ));
        alert(article.published ? '文章已设为草稿' : '文章已发布');
      } else {
        const data = await res.json();
        alert(`操作失败：${data.error}`);
      }
    } catch (err) {
      alert('操作失败：网络错误');
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
        setUploadedUrl(data.url || `/uploads/images/${data.filename}`);
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
          📝 Mizuki 文章管理
        </h1>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <a
            href="/admin/articles/new"
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '500',
            }}
          >
            ➕ 新建文章
          </a>
          <button
            onClick={handleLogout}
            style={{
              padding: '10px 20px',
              background: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#666',
            }}
          >
            退出登录
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
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

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '30px',
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#667eea' }}>
              {articles.length}
            </div>
            <div style={{ color: '#888', marginTop: '5px' }}>总文章数</div>
          </div>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#22c55e' }}>
              {articles.filter(a => a.published).length}
            </div>
            <div style={{ color: '#888', marginTop: '5px' }}>已发布</div>
          </div>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b' }}>
              {articles.filter(a => !a.published).length}
            </div>
            <div style={{ color: '#888', marginTop: '5px' }}>草稿</div>
          </div>
        </div>

        {/* Article List */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h2 style={{ fontSize: '18px', margin: 0, color: '#333' }}>文章列表</h2>
            <label style={{
              padding: '8px 16px',
              background: '#f5f5f5',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
            }}>
              📎 上传图片
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {uploadedUrl && (
            <div style={{
              padding: '10px 20px',
              background: '#e8f5e9',
              color: '#2e7d32',
              fontSize: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span>上传成功：{uploadedUrl}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(uploadedUrl);
                  alert('已复制到剪贴板');
                }}
                style={{
                  padding: '4px 12px',
                  background: '#2e7d32',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                复制
              </button>
            </div>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9f9f9', textAlign: 'left' }}>
                <th style={{ padding: '15px 20px', fontWeight: '600', color: '#555', borderBottom: '2px solid #eee' }}>
                  标题
                </th>
                <th style={{ padding: '15px 20px', fontWeight: '600', color: '#555', borderBottom: '2px solid #eee' }}>
                  状态
                </th>
                <th style={{ padding: '15px 20px', fontWeight: '600', color: '#555', borderBottom: '2px solid #eee' }}>
                  分类
                </th>
                <th style={{ padding: '15px 20px', fontWeight: '600', color: '#555', borderBottom: '2px solid #eee' }}>
                  标签
                </th>
                <th style={{ padding: '15px 20px', fontWeight: '600', color: '#555', borderBottom: '2px solid #eee' }}>
                  发布日期
                </th>
                <th style={{ padding: '15px 20px', fontWeight: '600', color: '#555', borderBottom: '2px solid #eee' }}>
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {articles.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                    暂无文章，点击"新建文章"开始创作
                  </td>
                </tr>
              ) : (
                articles.map((article) => (
                  <tr key={article.slug} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '15px 20px' }}>
                      <div style={{ fontWeight: '500', color: '#333', marginBottom: '4px' }}>
                        {article.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#888' }}>
                        /{article.slug}
                      </div>
                    </td>
                    <td style={{ padding: '15px 20px' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: article.published ? '#e8f5e9' : '#fff3e0',
                        color: article.published ? '#2e7d32' : '#ef6c00',
                      }}>
                        {article.published ? '已发布' : '草稿'}
                      </span>
                    </td>
                    <td style={{ padding: '15px 20px', color: '#666' }}>
                      {article.category || '-'}
                    </td>
                    <td style={{ padding: '15px 20px' }}>
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {article.tags?.slice(0, 3).map((tag, i) => (
                          <span key={i} style={{
                            padding: '2px 8px',
                            background: '#f0f0f0',
                            borderRadius: '4px',
                            fontSize: '12px',
                            color: '#666',
                          }}>
                            {tag}
                          </span>
                        ))}
                        {article.tags?.length > 3 && (
                          <span style={{ fontSize: '12px', color: '#888' }}>
                            +{article.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '15px 20px', color: '#666' }}>
                      {article.publishedAt || '-'}
                    </td>
                    <td style={{ padding: '15px 20px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <a
                          href={`/admin/articles/${encodeURIComponent(article.slug)}/edit`}
                          style={{
                            padding: '6px 12px',
                            background: '#667eea',
                            color: 'white',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            fontSize: '13px',
                          }}
                        >
                          编辑
                        </a>
                        <button
                          onClick={() => handleTogglePublish(article)}
                          style={{
                            padding: '6px 12px',
                            background: article.published ? '#f59e0b' : '#22c55e',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                          }}
                        >
                          {article.published ? '下架' : '发布'}
                        </button>
                        <button
                          onClick={() => handleDelete(article.slug)}
                          style={{
                            padding: '6px 12px',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                          }}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
