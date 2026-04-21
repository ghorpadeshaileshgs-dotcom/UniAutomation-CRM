import React, { useState } from 'react';
import { 
  signInWithPopup,
  GoogleAuthProvider,
  EmailAuthProvider,
  linkWithCredential
} from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { ShieldCheck, CheckCircle2, AlertCircle, Loader2, KeyRound, Mail, Eye, EyeOff } from 'lucide-react';

const ADMIN_EMAIL = 'ghorpadeshaileshgs@gmail.com';
const ADMIN_PASSWORD = 'Admin@UAPL1208';
const ADMIN_NAME = 'Shailesh Ghorpade';

export default function AdminSetup() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSetup = async () => {
    setStatus('loading');
    setMessage('');

    try {
      // Step 1: Sign in with Google popup (this will use the existing Google account)
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ login_hint: ADMIN_EMAIL, prompt: 'select_account' });
      const googleResult = await signInWithPopup(auth, provider);
      const user = googleResult.user;

      // Step 2: Link email/password credential to the Google account
      const emailCred = EmailAuthProvider.credential(ADMIN_EMAIL, ADMIN_PASSWORD);
      try {
        await linkWithCredential(user, emailCred);
      } catch (linkErr: any) {
        // If already linked, that's fine — proceed
        if (linkErr.code !== 'auth/provider-already-linked' && linkErr.code !== 'auth/email-already-in-use') {
          throw linkErr;
        }
      }

      // Step 3: Write/update Firestore Admin profile
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: ADMIN_EMAIL,
        displayName: ADMIN_NAME,
        role: 'Admin',
        isActive: true,
      }, { merge: true });

      setStatus('success');
      setMessage('Email/password login linked to your Google account successfully!');
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Unknown error occurred.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl backdrop-blur-lg p-8 shadow-2xl space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/20 p-3 rounded-xl">
            <ShieldCheck className="h-7 w-7 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Admin Setup</h1>
            <p className="text-sm text-slate-400">Link email/password to Google account</p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3">
          <p className="text-xs text-indigo-300 leading-relaxed">
            Click the button below. A Google sign-in popup will appear — sign in as <span className="font-mono font-semibold">{ADMIN_EMAIL}</span>. This will link your password so you can also login without Google.
          </p>
        </div>

        {/* Credentials Preview */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Your Admin Credentials</p>

          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-slate-400 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Email</p>
              <p className="text-sm font-mono text-white">{ADMIN_EMAIL}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <KeyRound className="h-4 w-4 text-slate-400 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-slate-500">Password (being set)</p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-mono text-white">
                  {showPassword ? ADMIN_PASSWORD : '••••••••••••••'}
                </p>
                <button
                  onClick={() => setShowPassword(v => !v)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ShieldCheck className="h-4 w-4 text-indigo-400 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Role</p>
              <p className="text-sm font-mono text-indigo-300">Admin</p>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {status === 'success' && (
          <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-emerald-300">{message}</p>
              <p className="text-xs text-emerald-400/70 mt-1">
                You can now login with email <span className="font-mono">{ADMIN_EMAIL}</span> + password at the login page.
              </p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{message}</p>
          </div>
        )}

        {/* Action Button */}
        {status !== 'success' && (
          <button
            onClick={handleSetup}
            disabled={status === 'loading'}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg shadow-indigo-900/40"
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Setting up…
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                Sign in with Google &amp; Set Password
              </>
            )}
          </button>
        )}

        {status === 'success' && (
          <a
            href="/"
            className="block w-full text-center bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-xl transition-all"
          >
            ← Go to Login
          </a>
        )}

        <p className="text-xs text-center text-slate-600">
          Accessible via <code className="text-slate-500">#admin-setup</code>
        </p>
      </div>
    </div>
  );
}
