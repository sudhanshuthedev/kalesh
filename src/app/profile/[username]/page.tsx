'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { authAPI, feedAPI } from '@/lib/api';
import { Video } from '@/types';
import { motion } from 'framer-motion';
import { IoPersonCircleOutline, IoPlaySharp } from 'react-icons/io5';

interface UserProfile {
  id: string;
  username: string;
  created_at: string;
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfile();
    loadUserVideos();
  }, [username]);

  const loadProfile = async () => {
    try {
      const response = await authAPI.getUserProfile(username);
      if (response.status === 'success' && response.data) {
        setProfile(response.data);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const loadUserVideos = async () => {
    try {
      setIsLoading(true);
      const response = await feedAPI.getUserVideos(username, 1, 50);
      if (response.status === 'success' && response.data?.videos) {
        setVideos(response.data.videos);
      }
    } catch (error) {
      console.error('Failed to load user videos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
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
    <div className="min-h-screen bg-black text-white pt-16 pb-20 md:pb-4 overflow-y-auto h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {}
        <div className="flex flex-col items-center mb-8">
          <IoPersonCircleOutline size={100} className="text-white mb-4" />
          <h1 className="text-2xl md:text-3xl font-poppins font-bold mb-2">
            @{profile?.username}
          </h1>
          <p className="text-gray-400 font-poppins text-sm">
            Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
          </p>
        </div>

        {}
        <div className="mt-8">
          <h2 className="text-xl font-poppins font-semibold mb-4">Videos</h2>
          {videos.length === 0 ? (
            <p className="text-gray-400 text-center font-poppins">No videos yet</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
              {videos.map((video) => (
                <motion.div
                  key={video.id}
                  whileHover={{ scale: 1.02 }}
                  className="relative aspect-[9/16] bg-app-gray cursor-pointer overflow-hidden"
                  onClick={() => router.push(`/?video=${video.id}`)}
                >
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <IoPlaySharp size={48} className="text-white opacity-50" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                    <p className="text-white text-sm font-poppins line-clamp-2">
                      {video.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-300 font-poppins">
                        {video.views} views
                      </span>
                      <span className="text-xs text-gray-300 font-poppins">
                        {video.likes} likes
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

