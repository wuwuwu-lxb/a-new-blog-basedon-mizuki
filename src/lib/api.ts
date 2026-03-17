/**
 * API 客户端工具
 * 用于前端调用后端 API
 */

// API 基础 URL（开发环境）
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';

// 通用响应类型
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

// 用户相关类型
export interface User {
  id: number;
  email: string;
  name: string | null;
  role: 'USER' | 'ADMIN';
  avatar?: string | null;
  bio?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

// 文章相关类型
export interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string | null;
  cover?: string | null;
  published: boolean;
  views: number;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  author: Pick<User, 'id' | 'name' | 'avatar'>;
  categories: Category[];
  tags: Tag[];
  _count?: {
    comments: number;
  };
}

export interface ArticleListResponse {
  articles: Article[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 分类和标签
export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
}

// 评论相关类型
export interface Comment {
  id: number;
  content: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SPAM';
  createdAt: string;
  updatedAt: string;
  author?: Pick<User, 'id' | 'name' | 'avatar'> | null;
  guestName?: string | null;
  guestEmail?: string | null;
  guestUrl?: string | null;
  article?: Pick<Article, 'id' | 'title' | 'slug'>;
  replies?: Comment[];
}

export interface CommentListResponse {
  comments: Comment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Chat 相关类型
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  sessionId?: string;
}

export interface ChatResponse {
  content: string;
  sessionId?: string;
  messageId?: number;
}

export interface ChatSession {
  id: number;
  sessionId: string;
  title?: string | null;
  messages: {
    id: number;
    role: string;
    content: string;
    createdAt: string;
  }[];
}

/**
 * API 客户端类
 */
class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    // 从 localStorage 加载 token（浏览器环境）
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  // 设置 token
  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
  }

  // 获取 token
  getToken(): string | null {
    return this.token;
  }

  // 通用请求方法
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // 添加认证头
    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          error: data.error || '请求失败',
          message: data.message,
        };
      }

      return { data };
    } catch (error) {
      console.error('API 请求错误:', error);
      return {
        error: error instanceof Error ? error.message : '网络错误',
      };
    }
  }

  // GET 请求
  async get<T>(endpoint: string, params?: Record<string, string>) {
    const queryString = params
      ? '?' + new URLSearchParams(params).toString()
      : '';
    return this.request<T>(endpoint + queryString, { method: 'GET' });
  }

  // POST 请求
  async post<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // PUT 请求
  async put<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  // DELETE 请求
  async delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // ==================== 认证接口 ====================

  async login(body: LoginRequest) {
    const result = await this.post<ApiResponse<{ token: string; user: User }>>(
      '/auth/login',
      body
    );
    if (result.data?.token) {
      this.setToken(result.data.token);
    }
    return result;
  }

  async register(body: RegisterRequest) {
    const result = await this.post<ApiResponse<{ token: string; user: User }>>(
      '/auth/register',
      body
    );
    if (result.data?.token) {
      this.setToken(result.data.token);
    }
    return result;
  }

  async logout() {
    await this.post('/auth/logout');
    this.setToken(null);
  }

  async getCurrentUser() {
    return this.get<ApiResponse<{ user: User }>>('/auth/me');
  }

  // ==================== 文章接口 ====================

  async getArticles(params?: {
    page?: string;
    limit?: string;
    category?: string;
    tag?: string;
    search?: string;
    published?: string;
  }) {
    return this.get<ArticleListResponse>('/articles', params);
  }

  async getArticle(slug: string) {
    return this.get<ApiResponse<{ article: Article }>>(`/articles/${slug}`);
  }

  async createArticle(body: {
    title: string;
    slug: string;
    content: string;
    excerpt?: string;
    cover?: string;
    published?: boolean;
    categoryIds?: number[];
    tagIds?: number[];
  }) {
    return this.post<ApiResponse<{ article: Article }>>('/articles', body);
  }

  async updateArticle(slug: string, body: Partial<{
    title: string;
    slug: string;
    content: string;
    excerpt?: string;
    cover?: string;
    published?: boolean;
    categoryIds?: number[];
    tagIds?: number[];
  }>) {
    return this.put<ApiResponse<{ article: Article }>>(`/articles/${slug}`, body);
  }

  async deleteArticle(slug: string) {
    return this.delete<ApiResponse>(`/articles/${slug}`);
  }

  // ==================== 评论接口 ====================

  async getComments(params?: {
    articleId?: string;
    page?: string;
    limit?: string;
    status?: string;
  }) {
    return this.get<CommentListResponse>('/comments', params);
  }

  async createComment(body: {
    articleId: number;
    content: string;
    parentId?: number | null;
    guestName?: string;
    guestEmail?: string;
    guestUrl?: string;
  }) {
    return this.post<ApiResponse<{ comment: Comment }>>('/comments', body);
  }

  async updateComment(id: number, body: {
    status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SPAM';
    content?: string;
  }) {
    return this.put<ApiResponse<{ comment: Comment }>>(`/comments/${id}`, body);
  }

  async deleteComment(id: number) {
    return this.delete<ApiResponse>(`/comments/${id}`);
  }

  // ==================== Chat 接口 ====================

  async chat(body: ChatRequest) {
    return this.post<ChatResponse>('/chat', body);
  }

  async getChatSessions(params?: { page?: string; limit?: string }) {
    return this.get<ApiResponse<{
      sessions: ChatSession[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>>('/chat/sessions', params);
  }

  async getChatSession(sessionId: string) {
    return this.get<ApiResponse<{ session: ChatSession }>>(`/chat/sessions/${sessionId}`);
  }

  async deleteChatSession(sessionId: string) {
    return this.delete<ApiResponse>(`/chat/sessions/${sessionId}`);
  }
}

// 导出单例
export const api = new ApiClient();

// 导出类以便自定义配置
export { ApiClient };
