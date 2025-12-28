'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { IoPersonCircleOutline, IoCamera, IoCheckmarkCircle, IoArrowBack } from 'react-icons/io5';
import Link from 'next/link';

export default function EditProfilePage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [showNsfw, setShowNsfw] = useState<'show' | 'ask_before_showing' | 'dont_show'>('ask_before_showing');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setBio(user.bio || '');
      setEmail(user.email || '');
      setProfileImage(user.profile_image_url || null);
      setShowNsfw((user as any).show_nsfw || 'ask_before_showing');
    }
  }, [user]);

  useEffect(() => {
    document.title = 'Edit Profile - Kalesh';

    const metaDescription = document.querySelector('meta[name="description"]');
    const descriptionText = 'Edit your profile on Kalesh';
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        setError('Only JPG, PNG, GIF, and WEBP images are allowed');
        return;
      }
      setImageFile(file);
      setProfileImage(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setError('');

    try {

      if (imageFile) {
        await authAPI.uploadAvatar(imageFile);
      }

      const profileData: { email?: string; full_name?: string; bio?: string; show_nsfw?: string } = {};
      if (email !== user?.email) profileData.email = email;
      if (fullName !== user?.full_name) profileData.full_name = fullName;
      if (bio !== user?.bio) profileData.bio = bio;
      if (showNsfw !== ((user as any)?.show_nsfw || 'ask_before_showing')) profileData.show_nsfw = showNsfw;

      if (Object.keys(profileData).length > 0) {
        await authAPI.updateProfile(profileData);
      }

      setUploadSuccess(true);
      setTimeout(() => {
        router.push(`/profile/${user?.username}`);
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setIsUploading(false);
    }
  };

  if (authLoading) {
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

  if (uploadSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black px-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 10 }}
        >
          <IoCheckmarkCircle size={80} className="text-green-500 mb-4" />
        </motion.div>
        <h2 className="text-white font-poppins text-2xl font-bold mb-2">Profile Updated!</h2>
        <p className="text-gray-400 font-poppins">Redirecting to your profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-16 pb-20 md:pb-4 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/profile/${user?.username}`} className="text-white hover:text-gray-300">
            <IoArrowBack size={24} />
          </Link>
          <h1 className="text-2xl md:text-3xl font-poppins font-bold">Edit Profile</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {}
          <div className="flex flex-col items-center">
            <div className="relative">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-white/20"
                />
              ) : (
                <IoPersonCircleOutline size={128} className="text-white" />
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-white text-black p-3 rounded-full hover:bg-gray-200 transition-colors"
              >
                <IoCamera size={20} />
              </button>
            </div>
            <p className="text-gray-400 font-poppins text-xs mt-2">
              JPG, PNG, GIF or WEBP. Max 5MB
            </p>
          </div>

          {}
          <div>
            <label className="block font-poppins text-sm mb-2">Username</label>
            <input
              type="text"
              value={user?.username || ''}
              className="w-full bg-gray-800 px-4 py-3 font-poppins outline-none border-0 text-gray-500 cursor-not-allowed rounded-lg"
              disabled
            />
            <p className="text-gray-500 font-poppins text-xs mt-1">Username cannot be changed</p>
          </div>

          {}
          <div>
            <label className="block font-poppins text-sm mb-2">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-app-gray px-4 py-3 font-poppins outline-none border-0 transition-all rounded-lg"
              placeholder="Enter your full name"
              maxLength={100}
            />
          </div>

          {}
          <div>
            <label className="block font-poppins text-sm mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-app-gray px-4 py-3 font-poppins outline-none border-0 transition-all rounded-lg"
              placeholder="Enter your email"
            />
          </div>

          {}
          <div>
            <label className="block font-poppins text-sm mb-2">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-app-gray px-4 py-3 font-poppins h-32 resize-none outline-none border-0 transition-all rounded-lg"
              placeholder="Tell us about yourself"
              maxLength={500}
            />
            <p className="text-gray-500 font-poppins text-xs mt-1">{bio.length}/500 characters</p>
          </div>

          {}
          <div>
            <label className="block font-poppins text-sm mb-3">NSFW Content Preference</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="nsfw-preference"
                  value="show"
                  checked={showNsfw === 'show'}
                  onChange={(e) => setShowNsfw(e.target.value as 'show')}
                  className="w-4 h-4 cursor-pointer accent-white"
                />
                <div className="flex-1">
                  <span className="font-poppins text-sm text-white">Show All Content</span>
                  <p className="font-poppins text-xs text-gray-400">Display all content without filtering</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="nsfw-preference"
                  value="ask_before_showing"
                  checked={showNsfw === 'ask_before_showing'}
                  onChange={(e) => setShowNsfw(e.target.value as 'ask_before_showing')}
                  className="w-4 h-4 cursor-pointer accent-white"
                />
                <div className="flex-1">
                  <span className="font-poppins text-sm text-white">Ask Before Showing (Default)</span>
                  <p className="font-poppins text-xs text-gray-400">Blur NSFW content, click to reveal</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="nsfw-preference"
                  value="dont_show"
                  checked={showNsfw === 'dont_show'}
                  onChange={(e) => setShowNsfw(e.target.value as 'dont_show')}
                  className="w-4 h-4 cursor-pointer accent-white"
                />
                <div className="flex-1">
                  <span className="font-poppins text-sm text-white">Don't Show NSFW</span>
                  <p className="font-poppins text-xs text-gray-400">Hide all NSFW content from feeds</p>
                </div>
              </label>
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-sm font-poppins"
            >
              {error}
            </motion.p>
          )}

          <div className="flex gap-3">
            <Link
              href={`/profile/${user?.username}`}
              className="flex-1 bg-gray-700 text-white py-3 font-poppins font-semibold hover:bg-gray-600 transition-colors text-center rounded-lg"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isUploading}
              className="flex-1 bg-white text-black py-3 font-poppins font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
            >
              {isUploading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

