'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { IoHomeSharp, IoHome, IoBookmarkSharp, IoBookmark, IoAddCircle, IoPersonSharp, IoPersonOutline } from 'react-icons/io5';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from './AuthModal';

const MobileNav = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleUploadClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      setShowAuthModal(true);
    }
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      setShowAuthModal(true);
    }
  };

  const handleSavedClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      setShowAuthModal(true);
    }
  };

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 flex items-center justify-around z-[100]" style={{ background: 'transparent' }}>
        <Link
          href="/"
          className={`flex flex-col items-center justify-center gap-0.5 ${
            pathname === '/' ? 'text-white' : 'text-gray-500'
          }`}
        >
          {pathname === '/' ? <IoHomeSharp size={26} /> : <IoHome size={26} />}
          <span className="text-[10px] font-poppins">Home</span>
        </Link>

        <Link
          href="/saved"
          onClick={handleSavedClick}
          className={`flex flex-col items-center justify-center gap-0.5 ${
            pathname === '/saved' ? 'text-white' : 'text-gray-500'
          }`}
        >
          {pathname === '/saved' ? <IoBookmarkSharp size={26} /> : <IoBookmark size={26} />}
          <span className="text-[10px] font-poppins">Saved</span>
        </Link>

        <Link
          href="/upload"
          onClick={handleUploadClick}
          className="flex flex-col items-center justify-center text-white -mt-2"
        >
          <IoAddCircle size={40} />
        </Link>

        <Link
          href={isAuthenticated && user?.username ? `/profile/${user.username}` : '#'}
          onClick={handleProfileClick}
          className={`flex flex-col items-center justify-center gap-0.5 ${
            pathname.startsWith('/profile') ? 'text-white' : 'text-gray-500'
          }`}
        >
          {pathname.startsWith('/profile') ? <IoPersonSharp size={26} /> : <IoPersonOutline size={26} />}
          <span className="text-[10px] font-poppins">Profile</span>
        </Link>
      </nav>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </>
  );
};

export default MobileNav;

