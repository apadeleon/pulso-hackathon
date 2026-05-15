import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@functionspace/react';
import { validateUsername, PASSWORD_REQUIRED } from '@functionspace/core';
import type { UserProfile } from '@functionspace/core';
import '../styles/base.css';

export interface PasswordlessAuthWidgetProps {
  requireAccessCode?: boolean;
  onLogin?: (user: UserProfile, action: 'login' | 'signup') => void;
  onSignup?: (user: UserProfile) => void;
  onLogout?: () => void;
}

export function PasswordlessAuthWidget({
  requireAccessCode = false,
  onLogin,
  onSignup,
  onLogout,
}: PasswordlessAuthWidgetProps) {
  const {
    user,
    isAuthenticated,
    passwordlessLogin,
    login,
    signup,
    logout,
    loading,
    showAdminLogin,
    pendingAdminUsername,
    clearAdminLogin,
  } = useAuth();

  const [view, setView] = useState<'idle' | 'passwordless' | 'admin' | 'admin-signup'>('idle');
  const [modalOpen, setModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setAccessCode('');
    setFormError(null);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setView('idle');
    resetForm();
  }, [resetForm]);

  // Escape key closes modal
  useEffect(() => {
    if (!modalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen, closeModal]);

  // Auto re-auth sync: when showAdminLogin becomes true, open admin view
  useEffect(() => {
    if (showAdminLogin) {
      setModalOpen(true);
      setView('admin');
      if (pendingAdminUsername) {
        setUsername(pendingAdminUsername);
      }
    }
  }, [showAdminLogin, pendingAdminUsername]);

  const handlePasswordlessSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const validation = validateUsername(username);
    if (!validation.valid) {
      setFormError(validation.error ?? 'Invalid username');
      return;
    }

    try {
      const result = await passwordlessLogin(username.trim());
      onLogin?.(result.user, result.action);
      closeModal();
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err && (err as Error & { code: string }).code === PASSWORD_REQUIRED) {
        setFormError('This account requires a password. Use Admin Access below.');
      } else {
        setFormError(err instanceof Error ? err.message : 'Could not sign in');
      }
    }
  }, [username, passwordlessLogin, onLogin, closeModal]);

  const handleAdminLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!username.trim() || !password) {
      setFormError('Username and password are required');
      return;
    }

    try {
      const loggedInUser = await login(username.trim(), password);
      onLogin?.(loggedInUser, 'login');
      clearAdminLogin();
      closeModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not sign in');
    }
  }, [username, password, login, onLogin, clearAdminLogin, closeModal]);

  const handleAdminSignup = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const validation = validateUsername(username);
    if (!validation.valid) {
      setFormError(validation.error ?? 'Invalid username');
      return;
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    try {
      const options = requireAccessCode && accessCode ? { accessCode } : undefined;
      const signedUpUser = await signup(username.trim(), password, options);
      onSignup?.(signedUpUser);
      closeModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create account');
    }
  }, [username, password, confirmPassword, accessCode, requireAccessCode, signup, onSignup, closeModal]);

  const handleLogout = useCallback(() => {
    logout();
    resetForm();
    setView('idle');
    onLogout?.();
  }, [logout, resetForm, onLogout]);

  // -- Authenticated View (no modal) --
  if (isAuthenticated && user) {
    return (
      <div className="fs-passwordless-auth">
        <div className="fs-auth-user-bar">
          <span className="fs-auth-wallet">
            ${user.walletValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="fs-auth-username">
            {user.username}
          </span>
          <button className="fs-auth-signout-btn" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // -- Idle View (unauthenticated, no modal) --
  const idleContent = (
    <div className="fs-passwordless-auth">
      <div className="fs-auth-actions" style={{ alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ color: 'var(--fs-text-secondary)', fontSize: '0.875rem' }}>Sign in to participate</span>
        <button
          className="fs-auth-btn fs-auth-btn-primary"
          onClick={() => {
            resetForm();
            setModalOpen(true);
            setView('passwordless');
          }}
        >
          Sign in / Create account
        </button>
      </div>
    </div>
  );

  // -- Modal Content --
  let modalContent: React.ReactNode = null;

  if (view === 'passwordless') {
    modalContent = (
      <form className="fs-auth-form" onSubmit={handlePasswordlessSubmit}>
        <h4 className="fs-auth-form-title">Sign in / Create account</h4>
        <span className="fs-auth-label-hint">Enter or create an account with any username you like</span>

        <div className="fs-auth-input-group">
          <label className="fs-auth-label">Username</label>
          <input
            className="fs-auth-input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            disabled={loading}
            autoComplete="username"
          />
        </div>

        {formError && <div className="fs-auth-error">{formError}</div>}

        <div className="fs-auth-form-footer">
          <button type="submit" className="fs-auth-btn fs-auth-btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in / Create account'}
          </button>
          <button type="button" className="fs-auth-btn fs-auth-btn-secondary" onClick={closeModal} disabled={loading}>
            Cancel
          </button>
        </div>

        <button
          type="button"
          className="fs-auth-mode-link"
          onClick={() => { resetForm(); setView('admin'); }}
        >
          Admin Access
        </button>
      </form>
    );
  }

  if (view === 'admin') {
    modalContent = (
      <form className="fs-auth-form" onSubmit={handleAdminLogin}>
        <h4 className="fs-auth-form-title">Admin Access</h4>

        <div className="fs-auth-input-group">
          <label className="fs-auth-label">Username</label>
          <input
            className="fs-auth-input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            disabled={loading}
            autoComplete="username"
          />
        </div>

        <div className="fs-auth-input-group">
          <label className="fs-auth-label">Password</label>
          <input
            className="fs-auth-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            disabled={loading}
            autoComplete="current-password"
          />
        </div>

        {formError && <div className="fs-auth-error">{formError}</div>}

        <div className="fs-auth-form-footer">
          <button type="submit" className="fs-auth-btn fs-auth-btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
          <button type="button" className="fs-auth-btn fs-auth-btn-secondary" onClick={closeModal} disabled={loading}>
            Cancel
          </button>
        </div>

        <button
          type="button"
          className="fs-auth-mode-link"
          onClick={() => { resetForm(); setView('passwordless'); }}
        >
          Back to sign in / create account
        </button>

        <button
          type="button"
          className="fs-auth-mode-link"
          onClick={() => { resetForm(); setView('admin-signup'); }}
        >
          Create admin account
        </button>
      </form>
    );
  }

  if (view === 'admin-signup') {
    modalContent = (
      <form className="fs-auth-form" onSubmit={handleAdminSignup}>
        <h4 className="fs-auth-form-title">Create admin account</h4>

        <div className="fs-auth-input-group">
          <label className="fs-auth-label">Username</label>
          <input
            className="fs-auth-input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose a username"
            disabled={loading}
            autoComplete="username"
          />
        </div>

        <div className="fs-auth-input-group">
          <label className="fs-auth-label">Password</label>
          <input
            className="fs-auth-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 6 characters"
            disabled={loading}
            autoComplete="new-password"
          />
        </div>

        <div className="fs-auth-input-group">
          <label className="fs-auth-label">Confirm password</label>
          <input
            className="fs-auth-input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            disabled={loading}
            autoComplete="new-password"
          />
        </div>

        {requireAccessCode && (
          <div className="fs-auth-input-group">
            <label className="fs-auth-label">Access code</label>
            <input
              className="fs-auth-input"
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Enter the code"
              disabled={loading}
            />
          </div>
        )}

        {formError && <div className="fs-auth-error">{formError}</div>}

        <div className="fs-auth-form-footer">
          <button type="submit" className="fs-auth-btn fs-auth-btn-primary" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
          <button type="button" className="fs-auth-btn fs-auth-btn-secondary" onClick={closeModal} disabled={loading}>
            Cancel
          </button>
        </div>

        <button
          type="button"
          className="fs-auth-mode-link"
          onClick={() => { resetForm(); setView('admin'); }}
        >
          Back to admin access
        </button>
      </form>
    );
  }

  return (
    <>
      {idleContent}
      {modalOpen && createPortal(
        <div className="fs-auth-modal-backdrop" onClick={closeModal}>
          <div className="fs-auth-modal fs-passwordless-auth" onClick={(e) => e.stopPropagation()}>
            {modalContent}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
