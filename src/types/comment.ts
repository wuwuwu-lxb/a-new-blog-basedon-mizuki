// 用户类型
export interface User {
  id: number;
  email: string;
  name: string | null;
  role: 'USER' | 'ADMIN';
  avatar: string | null;
  bio: string | null;
}

// 评论类型
export interface Comment {
  id: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    name: string | null;
    avatar: string | null;
  } | null;
  guestName: string | null;
  guestEmail: string | null;
  guestUrl: string | null;
  replies: Comment[];
}
