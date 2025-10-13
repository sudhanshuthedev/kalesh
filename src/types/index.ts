export interface User {
  id: string;
  username: string;
  created_at: string;
}

export interface UserInteraction {
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
  is_liked?: boolean;
  is_disliked?: boolean;
  is_saved?: boolean;
  user_interaction?: UserInteraction | null;
}

export interface APIResponse<T = any> {
  status: string;
  message: string;
  data?: T;
}

