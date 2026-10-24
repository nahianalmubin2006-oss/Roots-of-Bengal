import React, { useState } from 'react';
import { Shield, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { bootstrapOwnerAdmin, DESIGNATED_OWNER_EMAIL } from '../../lib/firebaseAuth';
import { User } from 'firebase/auth';

interface AdminLoginPageProps {
  user: User | null;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onExit: () => void;
  onRefreshAdminStatus: () => Promise<void>;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  user,
  onSignIn,
  onSignOut,
  onExit,
  onRefreshAdminStatus,
}) => {
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(false);

  const handleSignInClick = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await onSignIn();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Sign-in cancelled.');
    }
  };

  const handleClaimInitialRole = async () => {
    if (!user) return;
    setIsBootstrapping(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await bootstrapOwnerAdmin(user);
      setSuccessMsg(res.message);
      await onRefreshAdminStatus();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to claim admin role.');
    } finally {
      setIsBootstrapping(false);
    }
  };

  const isOwnerEmail = user?.email === DESIGNATED_OWNER_EMAIL;

  return (
    <div className="min-h-screen paper-grain flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-[#f6ecd4] border-2 border-[#8a4b2a] shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-[#e4d3ad] border border-[#8a4b2a]">
            <Shield className="w-8 h-8 text-[#b5502d]" />
          </div>
          <h1 className="font-editorial text-3xl text-[#3b2a1a]">
            Roots of Bengal
          </h1>
          <p className="text-xs uppercase tracking-widest text-[#8a4b2a] font-bold">
            Administrative Operations Portal
          </p>
        </div>

        <div className="p-3.5 bg-[#e4d3ad] border border-[#8a4b2a]/40 text-xs text-[#3b2a1a] leading-relaxed">
          <strong className="block font-bold mb-1">Restricted Area:</strong>
          Access is limited to authorized personnel with server-verified administrative credentials. All access attempts are recorded.
        </div>

        {errorMsg && (
          <div className="p-3 bg-[#b5502d] text-[#fff3dc] text-xs font-bold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-[#5d7a4a] text-[#fff3dc] text-xs font-bold flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {!user ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleSignInClick}
              className="craft-btn w-full py-3 px-4 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Authenticate with Google Admin Account</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-[#efe2c6] border border-[#8a4b2a]">
              <span className="block text-[#3b2a1a]/75">Currently Authenticated:</span>
              <strong className="text-sm text-[#3b2a1a]">{user.email}</strong>
              <span className="block text-[11px] text-[#3b2a1a]/60">UID: {user.uid}</span>
            </div>

            {isOwnerEmail && (
              <div className="p-3 bg-[#e4d3ad] border border-[#5d7a4a] space-y-2">
                <span className="font-bold text-[#5d7a4a] block">
                  Project Owner Detected ({DESIGNATED_OWNER_EMAIL})
                </span>
                <p className="text-[#3b2a1a]/80">
                  If this is your first time setting up the platform, initialize your server-verified Super Admin credentials:
                </p>
                <button
                  type="button"
                  disabled={isBootstrapping}
                  onClick={handleClaimInitialRole}
                  className="craft-btn w-full py-2 px-3 text-xs cursor-pointer"
                >
                  {isBootstrapping ? 'Provisioning...' : 'Provision Owner Super Admin Role'}
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onSignOut}
                className="craft-btn-outline flex-1 py-2 text-xs cursor-pointer"
              >
                Sign In with Different Account
              </button>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-dashed border-[#8a4b2a]/40 text-center">
          <button
            type="button"
            onClick={onExit}
            className="text-xs text-[#8a4b2a] hover:underline cursor-pointer"
          >
            ← Return to Public Website
          </button>
        </div>
      </div>
    </div>
  );
};
