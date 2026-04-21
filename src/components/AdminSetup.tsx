import React, { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { setDoc, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { ShieldCheck, CheckCircle2, AlertCircle, Loader2, KeyRound, Mail, Eye, EyeOff } from 'lucide-react';

const ADMIN_EMAIL = 'admin@uapl.com';
const ADMIN_PASSWORD = 'UAPL@Admin2026!';
const ADMIN_NAME = 'UAPL Admin';

export default function AdminSetup() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'exists'>('idle');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSetup = async () => {
    setStatus('loading');
    setMessage('');

    try {
      // Create the Firebase Auth account
      const cred = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
      await updateProfile(cred.user, { displayName: ADMIN_NAME });

      // Write Firestore profile
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        email: ADMIN_EMAIL,
        displayName: ADMIN_NAME,
        role: 'Admin',
        isActive: true,
      });

      setStatus('success');
      setMessage('Admin account created successfully!');
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setStatus('exists');
        setMessage('Admin account already exists in Firebase Auth. Firestore profile will be synced on next login.');
      } else {
        setStatus('error');
        setMessage(error.message || 'Unknown error occurred.');
      }
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
            <h1 className="text-xl font-bold text-white">Admin Account Setup</h1>
            <p className="text-sm text-slate-400">One-time initialization</p>
          </div>
        </div>

        {/* Credentials Preview */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Credentials to Create</p>

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
              <p className="text-xs text-slate-500">Password</p>
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
                You can now login at the main page with <span className="font-mono">{ADMIN_EMAIL}</span>
              </p>
            </div>
          </div>
        )}

        {status === 'exists' && (
          <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-300">{message}</p>
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
                Creating Admin Account…
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                Create Admin Account
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
          This page is only accessible via <code className="text-slate-500">#admin-setup</code>. Remove the hash to return to normal login.
        </p>
      </div>
    </div>
  );
}
