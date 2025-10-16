'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  const loadingRef = useRef(false);
  const pageRef = useRef(1);
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadVideos(1);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    document.title = 'Saved Videos - Kalesh';

    const metaDescription = document.querySelector('meta[name="description"]');
    const descriptionText = 'Your saved videos on Kalesh';
    if (metaDescription) {
      metaDescription.setAttribute('content', descriptionText);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = descriptionText;
      document.head.appendChild(meta);
    }

    return () => {
      document.title = 'Kalesh - Watch Kaleshi Videos';
    };
  }, []);

  useEffect(() => {
    if (videos.length > 0 && videos[activeVideoIndex] && hasScrolledRef.current) {
      const activeVideo = videos[activeVideoIndex];
      document.title = `${activeVideo.title} | Saved Videos | Kalesh`;

      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', `/kalesh/${activeVideo.id}`);
      }
    } else if (!hasScrolledRef.current) {
      document.title = 'Saved Videos - Kalesh';
    }
  }, [activeVideoIndex, videos]);

  const loadVideos = useCallback(async (pageNum: number) => {
    if (loadingRef.current) return;

    try {
      loadingRef.current = true;
      setIsLoading(true);

      const pageSize = pageNum === 1 ? 5 : 10;
      const response = await feedAPI.getSaved(pageNum, pageSize);
      if (response.status === 'success' && response.data?.videos) {
        const newVideos = response.data.videos;

        if (pageNum === 1) {
          setVideos(newVideos);
        } else {
          setVideos((prev) => [...prev, ...newVideos]);
        }

        setHasMore(newVideos.length === pageSize);
        pageRef.current = pageNum;
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Failed to load saved videos:', error);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const clientHeight = container.clientHeight;

    if (!hasScrolledRef.current) {
      hasScrolledRef.current = true;
    }

    const newIndex = Math.round(scrollTop / clientHeight);
    if (newIndex !== activeVideoIndex && newIndex < videos.length) {
      setActiveVideoIndex(newIndex);

      if (newIndex >= videos.length - 3 && !loadingRef.current && hasMore) {
        const nextPage = pageRef.current + 1;
        loadVideos(nextPage);
      }
    }
  }, [activeVideoIndex, videos.length, hasMore, loadVideos]);

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
          key={`video-${video.id}`}
          video={video}
          isActive={index === activeVideoIndex}
          shouldPreload={index === activeVideoIndex + 1 || index === activeVideoIndex + 2}
        />
      ))}
      {isLoading && videos.length > 0 && (
        <div className="h-screen flex items-center justify-center bg-black snap-start">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-4 border-white border-t-transparent rounded-full"
          />
        </div>
      )}
    </div>
  );
}

