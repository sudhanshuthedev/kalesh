export interface User {
  id: string;
  username: string;
  email?: string | null;
  full_name?: string | null;
  bio?: string | null;
  profile_image_url?: string | null;
  created_at: string;
}

export interface UserLogin {
  username: string;
  password: string;
}

export interface UserRegister {
  username: string;
  password: string;
}

export interface UserInteraction {
  liked?: boolean;
  disliked?: boolean;
  saved?: boolean;
  is_liked?: boolean;
  is_disliked?: boolean;
  is_saved?: boolean;
}

export interface Video {
  id: string;
  title: string;
  description?: string;
  playlist_url: string;
  video_url?: string;
  thumbnail_url?: string;
  uploader_id: string;
  uploader_username: string;
  duration?: number;
  views: number;
  likes: number;
  dislikes?: number;
  saved_count?: number;
  created_at: string;
  tags?: string[];
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
  is_liked?: boolean;
  is_disliked?: boolean;
  is_saved?: boolean;
  user_interaction?: UserInteraction | null;
}

export interface Comment {
  id: string;
  video_id: string;
  user_id: string;
  username: string;
  text: string;
  parent_comment_id?: string | null;
  parent_id?: string | null;
  likes: number;
  is_liked?: boolean;
  user_liked?: boolean;
  created_at: string;
  replies?: Comment[];
  replies_count?: number;
  reply_count?: number;
}

export interface CommentCreate {
  text: string;
}

export interface ReportCreate {
  reason: string;
  details?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface FeedResponse {
  videos: Video[];
  total?: number;
  page?: number;
  page_size?: number;
  has_more?: boolean;
}

export interface APIResponse<T = any> {
  status: string;
  message: string;
  data?: T;
}

