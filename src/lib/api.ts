import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {

      console.warn('API request failed with 401 - token may be expired');
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: async (username: string, password: string) => {
    const response = await api.post('/users/register', { username, password });
    return response.data;
  },
  login: async (username: string, password: string) => {
    const response = await api.post('/users/login', { username, password });
    return response.data;
  },
  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },
  getUserProfile: async (username: string) => {
    const response = await api.get(`/users/profile/${username}`);
    return response.data;
  },
  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/users/avatar/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  updateProfile: async (data: { email?: string; full_name?: string; bio?: string }) => {
    const response = await api.put('/users/profile', data);
    return response.data;
  },
};

export const videoAPI = {
  upload: async (formData: FormData) => {
    const response = await api.post('/videos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  getVideo: async (videoId: string) => {
    const response = await api.get(`/videos/${videoId}`);
    return response.data;
  },
  getProcessingStatus: async (videoId: string) => {
    const response = await api.get(`/videos/${videoId}/status`);
    return response.data;
  },
  deleteVideo: async (videoId: string) => {
    const response = await api.delete(`/videos/${videoId}`);
    return response.data;
  },
};

export const interactionAPI = {
  like: async (videoId: string) => {
    const response = await api.post(`/interactions/videos/${videoId}/like`);
    return response.data;
  },
  dislike: async (videoId: string) => {
    const response = await api.post(`/interactions/videos/${videoId}/dislike`);
    return response.data;
  },
  save: async (videoId: string) => {
    const response = await api.post(`/interactions/videos/${videoId}/save`);
    return response.data;
  },
  report: async (videoId: string, reason: string, details?: string) => {
    const response = await api.post(`/interactions/videos/${videoId}/report`, {
      reason,
      details,
    });
    return response.data;
  },
};

export const feedAPI = {
  getTrending: async (page = 1, pageSize = 20) => {
    try {
      const response = await api.get(`/feeds/trending?page=${page}&page_size=${pageSize}`);
      return response.data;
    } catch (error: any) {
      return { status: 'success', data: { videos: [] }, message: 'No videos available' };
    }
  },
  getRecent: async (page = 1, pageSize = 20) => {
    try {
      const response = await api.get(`/feeds/recent?page=${page}&page_size=${pageSize}`);
      return response.data;
    } catch (error: any) {
      return { status: 'success', data: { videos: [] }, message: 'No videos available' };
    }
  },
  getSaved: async (page = 1, pageSize = 20) => {
    const response = await api.get(`/feeds/saved?page=${page}&page_size=${pageSize}`);
    return response.data;
  },
  getUserVideos: async (username: string, page = 1, pageSize = 20) => {
    try {
      const response = await api.get(`/feeds/user/${username}?page=${page}&page_size=${pageSize}`);
      return response.data;
    } catch (error: any) {
      return { status: 'success', data: { videos: [] }, message: 'No videos available' };
    }
  },
};

export const commentAPI = {
  getVideoComments: async (videoId: string, page = 1, pageSize = 20) => {
    const response = await api.get(`/comments/videos/${videoId}?page=${page}&page_size=${pageSize}`);
    return response.data;
  },
  createComment: async (videoId: string, text: string) => {
    const response = await api.post(`/comments/videos/${videoId}`, { text });
    return response.data;
  },
  replyToComment: async (videoId: string, commentId: string, text: string) => {
    const response = await api.post(`/comments/${commentId}/reply`, { text });
    return response.data;
  },
  likeComment: async (commentId: string) => {
    const response = await api.post(`/comments/${commentId}/like`);
    return response.data;
  },
  deleteComment: async (commentId: string) => {
    const response = await api.delete(`/comments/${commentId}`);
    return response.data;
  },
  reportComment: async (commentId: string, reason: string, details?: string) => {
    const response = await api.post(`/comments/${commentId}/report`, { reason, details });
    return response.data;
  },
};

export default api;

