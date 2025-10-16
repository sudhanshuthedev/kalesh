'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { authAPI, feedAPI } from '@/lib/api';
import { Video } from '@/types';
import { motion } from 'framer-motion';
import { IoPersonCircleOutline, IoPlaySharp, IoSettingsOutline, IoTrashOutline } from 'react-icons/io5';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import DeleteVideoModal from '@/components/DeleteVideoModal';

interface UserProfile {
  id: string;
  username: string;
  email: string | null;
  full_name: string | null;
  bio: string | null;
  profile_image_url: string | null;
  created_at: string;
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const username = params.username as string;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteModalVideo, setDeleteModalVideo] = useState<Video | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalVideos, setTotalVideos] = useState(0);
  const loadingRef = useRef(false);
  const pageRef = useRef(1);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const isOwnProfile = currentUser?.username === username;

  useEffect(() => {
    loadProfile();
    setVideos([]);
    setPage(1);
    pageRef.current = 1;
    setHasMore(true);
    loadUserVideos(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  useEffect(() => {
    if (profile) {
      const displayName = profile.full_name || `@${profile.username}`;
      document.title = `${displayName} - Kalesh`;

      const metaDescription = document.querySelector('meta[name="description"]');
      const descriptionText = profile.bio || `Watch videos by ${displayName} on Kalesh`;
      if (metaDescription) {
        metaDescription.setAttribute('content', descriptionText);
      } else {
        const meta = document.createElement('meta');
        meta.name = 'description';
        meta.content = descriptionText;
        document.head.appendChild(meta);
      }
    }

    return () => {
      document.title = 'Kalesh - Watch Kaleshi Videos';
    };
  }, [profile]);

  const loadProfile = async () => {
    try {
      const response = await authAPI.getUserProfile(username);
      if (response.status === 'success' && response.data?.profile) {
        setProfile(response.data.profile);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const loadUserVideos = useCallback(async (pageNum: number) => {
    if (loadingRef.current) return;

    try {
      loadingRef.current = true;
      setIsLoading(true);

      const pageSize = pageNum === 1 ? 20 : 20;
      const response = await feedAPI.getUserVideos(username, pageNum, pageSize);
      if (response.status === 'success' && response.data?.videos) {
        const newVideos = response.data.videos;

        if (response.data.total !== undefined) {
          setTotalVideos(response.data.total);
        }

        if (pageNum === 1) {
          setVideos(newVideos);
        } else {
          setVideos((prev) => {
            const existingIds = new Set(prev.map((v: Video) => v.id));
            const uniqueNewVideos = newVideos.filter((v: Video) => !existingIds.has(v.id));
            return [...prev, ...uniqueNewVideos];
          });
        }

        setHasMore(newVideos.length === pageSize);
        pageRef.current = pageNum;
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Failed to load user videos:', error);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [username]);

  const handleDeleteVideo = () => {
    setVideos([]);
    setPage(1);
    pageRef.current = 1;
    setHasMore(true);
    loadUserVideos(1);
  };

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    if (scrollHeight - scrollTop - clientHeight < 500 && !loadingRef.current && hasMore) {
      const nextPage = pageRef.current + 1;
      loadUserVideos(nextPage);
    }
  }, [hasMore, loadUserVideos]);

  if (isLoading && videos.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-white border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div ref={pageContainerRef} onScroll={handleScroll} className="min-h-screen bg-black text-white pt-16 pb-20 md:pb-4 overflow-y-auto h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {}
        <div className="flex flex-col items-center mb-8">
          {profile?.profile_image_url ? (
            <img
              src={profile.profile_image_url}
              alt={profile.username}
              className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover mb-4 border-4 border-white/20"
            />
          ) : (
            <IoPersonCircleOutline size={100} className="text-white mb-4" />
          )}
          {profile?.full_name && (
            <h1 className="text-2xl md:text-3xl font-poppins font-bold mb-1">
              {profile.full_name}
            </h1>
          )}
          <h2 className={`${profile?.full_name ? 'text-lg md:text-xl' : 'text-2xl md:text-3xl font-bold'} font-poppins text-gray-300 mb-2`}>
            @{profile?.username}
          </h2>
          {profile?.bio && (
            <p className="text-white font-poppins text-sm md:text-base text-center max-w-2xl mb-3 px-4">
              {profile.bio}
            </p>
          )}
          <p className="text-gray-500 font-poppins text-xs md:text-sm mb-3">
            Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }) : 'Unknown'}
          </p>
          {isOwnProfile && (
            <Link
              href="/profile/edit"
              className="text-gray-400 hover:text-white font-poppins text-sm transition-colors"
            >
              Edit Profile
            </Link>
          )}
        </div>

        {}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-poppins font-semibold">Videos</h2>
            <span className="text-gray-400 font-poppins text-sm">{totalVideos} videos</span>
          </div>
          {videos.length === 0 && !isLoading ? (
            <div className="text-center py-12">
              <IoPlaySharp size={64} className="text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 font-poppins">No videos yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 pb-4">
              {videos.map((video) => (
                <motion.div
                  key={video.id}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative aspect-[9/16] bg-app-gray cursor-pointer overflow-hidden rounded-lg shadow-lg hover:shadow-2xl transition-shadow group"
                  onClick={() => router.push(`/kalesh/${video.id}`)}
                >
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                      <IoPlaySharp size={48} className="text-white opacity-50" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <IoPlaySharp size={56} className="text-white" />
                  </div>

                  {}
                  {isOwnProfile && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      whileHover={{ scale: 1.1 }}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteModalVideo(video);
                      }}
                    >
                      <IoTrashOutline size={20} />
                    </motion.button>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3">
                    <p className="text-white text-xs md:text-sm font-poppins font-medium line-clamp-2 mb-1">
                      {video.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] md:text-xs text-gray-300 font-poppins">
                        {video.views.toLocaleString()} views
                      </span>
                      <span className="text-[10px] md:text-xs text-gray-300 font-poppins">
                        {video.likes.toLocaleString()} likes
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
              {isLoading && videos.length > 0 && (
                <div className="col-span-2 md:col-span-3 lg:col-span-4 flex justify-center py-8">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-8 h-8 border-4 border-white border-t-transparent rounded-full"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {}
      {deleteModalVideo && (
        <DeleteVideoModal
          videoId={deleteModalVideo.id}
          videoTitle={deleteModalVideo.title}
          onClose={() => setDeleteModalVideo(null)}
          onDelete={handleDeleteVideo}
        />
      )}
    </div>
  );
}

