'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import VideoPlayer from '@/components/VideoPlayer';
import { feedAPI } from '@/lib/api';
import { Video } from '@/types';
import { motion } from 'framer-motion';

export default function SavedPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadVideos();
    }
  }, [isAuthenticated]);

  const loadVideos = async (pageNum = 1) => {
    try {
      setIsLoading(true);
      // Load fewer videos initially for faster page load
      const pageSize = pageNum === 1 ? 5 : 10;
      const response = await feedAPI.getSaved(pageNum, pageSize);
      if (response.status === 'success' && response.data?.videos) {
        if (pageNum === 1) {
          setVideos(response.data.videos);
        } else {
          setVideos((prev) => [...prev, ...response.data.videos]);
        }
        setHasMore(response.data.videos.length === pageSize);
      }
    } catch (error) {
      console.error('Failed to load saved videos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    const newIndex = Math.round(scrollTop / clientHeight);
    if (newIndex !== activeVideoIndex && newIndex < videos.length) {
      setActiveVideoIndex(newIndex);
    }

    // Load more videos when user is 2 videos away from the end
    if (scrollHeight - scrollTop - clientHeight < clientHeight * 2 && !isLoading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadVideos(nextPage);
    }
  };

  if (authLoading || (isLoading && videos.length === 0)) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-white border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-black px-4">
        <p className="text-white font-poppins text-lg text-center">
          No saved videos yet
        </p>
        <p className="text-gray-400 font-poppins text-sm text-center mt-2">
          Save videos to watch them later
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="snap-container bg-black"
    >
      {videos.map((video, index) => (
        <VideoPlayer
          key={video.id}
          video={video}
          isActive={index === activeVideoIndex}
          onInteraction={() => loadVideos(1)}
        />
      ))}
    </div>
  );
}

