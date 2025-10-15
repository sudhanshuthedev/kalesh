'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import VideoPlayer from '@/components/VideoPlayer';
import { feedAPI } from '@/lib/api';
import { Video } from '@/types';
import { motion } from 'framer-motion';

export default function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const pageRef = useRef(1);

  useEffect(() => {
    loadVideos(1);
  }, []);

  useEffect(() => {
    if (videos.length > 0 && videos[activeVideoIndex]) {
      const activeVideo = videos[activeVideoIndex];
      document.title = `${activeVideo.title} | Kalesh`;
    }

    return () => {
      document.title = 'Kalesh - Watch Kaleshi Videos';
    };
  }, [activeVideoIndex, videos]);

  const loadVideos = useCallback(async (pageNum: number) => {
    if (loadingRef.current) return;

    try {
      loadingRef.current = true;
      setIsLoading(true);

      const pageSize = pageNum === 1 ? 5 : 10;
      const response = await feedAPI.getTrending(pageNum, pageSize);
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
      console.error('Failed to load videos:', error);
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

  return videos.length === 0 ? (
    <div className="h-screen flex items-center justify-center bg-black" />
  ) : (
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

