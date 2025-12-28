'use client';

import React, { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import VideoPlayer from '@/components/VideoPlayer';
import { feedAPI } from '@/lib/api';
import { Video } from '@/types';
import { motion } from 'framer-motion';

function SavedPageContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const pageRef = useRef(1);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      const videoId = searchParams.get('v');
      if (videoId) {
        router.push(`/kalesh/${videoId}`);
        return;
      }

      loadVideos(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (videos.length > 0 && videos[activeVideoIndex]) {
      const activeVideo = videos[activeVideoIndex];
      document.title = `${activeVideo.title} | Saved Videos | Kalesh`;

      if (typeof window !== 'undefined') {
        const newUrl = `/saved?v=${activeVideo.id}`;
        if (window.location.search !== `?v=${activeVideo.id}`) {
          window.history.replaceState(null, '', newUrl);
        }
      }
    } else {
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
          shouldPreload={
            index === activeVideoIndex + 1 ||
            index === activeVideoIndex + 2 ||
            index === activeVideoIndex - 1
          }
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

export default function SavedPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-black" />}>
      <SavedPageContent />
    </Suspense>
  );
}
