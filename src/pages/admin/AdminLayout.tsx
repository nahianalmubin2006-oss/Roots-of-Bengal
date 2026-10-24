import React from 'react';
import { ShieldAlert, LogOut, ArrowLeft } from 'lucide-react';
import { User } from 'firebase/auth';
import { AppUserProfile, DESIGNATED_OWNER_EMAIL } from '../../lib/firebaseAuth';
import { AdminLoginPage } from './AdminLoginPage';

interface AdminLayoutProps {
  authLoading: boolean;
  user: User | null;
  userProfile: AppUserProfile | null;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onRefreshAdminStatus: () => Promise<void>;
  currentSubpath: 'dashboard' | 'products' | 'orders' | 'login';
  onNavigateSubpath: (subpath: 'dashboard' | 'products' | 'orders') => void;
  onExitAdmin: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  authLoading,
  user,
  userProfile,
  onSignIn,
  onSignOut,
  onRefreshAdminStatus,
  currentSubpath,
  onNavigateSubpath,
  onExitAdmin,
  children,
}) => {
  // 1. While auth/authorization is actively loading, render neutral secure loading state
  // NEVER render or leak sensitive dashboard data during loading state
  if (authLoading) {
    return (
      <div className="min-h-screen paper-grain flex flex-col justify-center items-center px-4">
        <div className="p-8 bg-[#f6ecd4] border-2 border-[#8a4b2a] text-center space-y-3 max-w-sm">
          <div className="w-6 h-6 border-2 border-[#b5502d] border-t-transparent animate-spin mx-auto" />
          <p className="font-editorial text-xl text-[#3b2a1a]">
            Verifying Administrative Credentials...
          </p>
          <p className="text-xs text-[#3b2a1a]/70">
            Evaluating server-side authorization and custom role claims.
          </p>
        </div>
      </div>
    );
  }

  // 2. If unauthenticated, or if the verified owner is completing one-time initial bootstrap, render AdminLoginPage
  if (
    !user ||
    (!userProfile?.isAdmin &&
      user.email === DESIGNATED_OWNER_EMAIL &&
      user.emailVerified)
  ) {
    return (
      <AdminLoginPage
        user={user}
        onSignIn={onSignIn}
        onSignOut={onSignOut}
        onExit={onExitAdmin}
        onRefreshAdminStatus={onRefreshAdminStatus}
      />
    );
  }

  // 3. If authenticated but NOT a verified admin, render generic 403 Forbidden Access Denied
  // Do NOT render any admin dashboard metrics or internal data
  if (!userProfile?.isAdmin) {
    return (
      <div className="min-h-screen paper-grain flex flex-col justify-center items-center px-4 py-12">
        <div className="w-full max-w-md bg-[#f6ecd4] border-2 border-[#b5502d] p-8 space-y-5 text-center shadow-xl">
          <div className="inline-flex p-3 bg-[#b5502d]/10 border border-[#b5502d]">
            <ShieldAlert className="w-8 h-8 text-[#b5502d]" />
          </div>

          <div className="space-y-1">
            <h1 className="font-editorial text-3xl text-[#3b2a1a]">
              403 · Access Denied
            </h1>
            <p className="text-xs uppercase tracking-wider text-[#b5502d] font-bold">
              Insufficient Privileges
            </p>
          </div>

          <p className="text-xs text-[#3b2a1a]/85 leading-relaxed">
            The authenticated account (<code>{user.email}</code>) has not been granted administrative privileges on this system. All unauthorized administrative navigation attempts are logged.
          </p>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={onSignOut}
              className="craft-btn-outline w-full py-2.5 text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign In with an Administrative Account</span>
            </button>

            <button
              type="button"
              onClick={onExitAdmin}
              className="craft-btn w-full py-2.5 text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Public Marketplace</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Authenticated & Verified Admin: Render private administrative shell
  return (
    <div className="min-h-screen paper-grain flex flex-col text-[#3b2a1a]">
      {/* Top Private Admin Banner */}
      <header className="bg-[#3b2a1a] text-[#fff3dc] border-b-2 border-[#b5502d] px-4 sm:px-8 py-3">
        <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="px-2 py-0.5 bg-[#b5502d] text-white text-[11px] font-bold uppercase tracking-widest">
              Roots of Bengal Admin
            </div>
            <span className="text-xs text-[#fff3dc]/80 hidden sm:inline">
              Secure Operations Console · {userProfile.adminRole || 'admin'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-[#fff3dc]/80 hidden md:inline truncate max-w-[200px]">
              {user.email}
            </span>
            <button
              type="button"
              onClick={onExitAdmin}
              className="px-3 py-1 bg-[#f6ecd4] text-[#3b2a1a] hover:bg-[#e4d3ad] font-medium transition-colors cursor-pointer"
            >
              Exit to Public Store
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="px-3 py-1 bg-[#b5502d] text-white hover:bg-[#8a4b2a] transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Admin Sub-navigation */}
      <div className="bg-[#e4d3ad] border-b border-[#8a4b2a]/50 px-4 sm:px-8">
        <div className="max-w-[1400px] mx-auto flex items-center gap-2 overflow-x-auto py-2 text-xs">
          <button
            type="button"
            onClick={() => onNavigateSubpath('dashboard')}
            className={`px-3.5 py-1.5 border transition-colors whitespace-nowrap cursor-pointer ${
              currentSubpath === 'dashboard'
                ? 'bg-[#8a4b2a] text-[#fff3dc] border-[#8a4b2a] font-bold'
                : 'bg-[#f6ecd4] text-[#3b2a1a] border-[#8a4b2a]/50 hover:bg-[#e4d3ad]'
            }`}
          >
            Dashboard Overview
          </button>
          <button
            type="button"
            onClick={() => onNavigateSubpath('products')}
            className={`px-3.5 py-1.5 border transition-colors whitespace-nowrap cursor-pointer ${
              currentSubpath === 'products'
                ? 'bg-[#8a4b2a] text-[#fff3dc] border-[#8a4b2a] font-bold'
                : 'bg-[#f6ecd4] text-[#3b2a1a] border-[#8a4b2a]/50 hover:bg-[#e4d3ad]'
            }`}
          >
            Catalog, Stock & Prices
          </button>
          <button
            type="button"
            onClick={() => onNavigateSubpath('orders')}
            className={`px-3.5 py-1.5 border transition-colors whitespace-nowrap cursor-pointer ${
              currentSubpath === 'orders'
                ? 'bg-[#8a4b2a] text-[#fff3dc] border-[#8a4b2a] font-bold'
                : 'bg-[#f6ecd4] text-[#3b2a1a] border-[#8a4b2a]/50 hover:bg-[#e4d3ad]'
            }`}
          >
            Orders & Cash on Delivery Verification
          </button>
        </div>
      </div>

      {/* Main Admin Content Canvas */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-8 py-8">
        {children}
      </main>
    </div>
  );
};
