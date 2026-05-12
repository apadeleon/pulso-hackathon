import React, { useState, useCallback, useEffect } from 'react';
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
      setFormError(validation.error ?? 'Usuario invalido');
      return;
    }

    try {
      const result = await passwordlessLogin(username.trim());
      onLogin?.(result.user, result.action);
      closeModal();
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err && (err as Error & { code: string }).code === PASSWORD_REQUIRED) {
        setFormError('Esta cuenta requiere contrasena. Usa Acceso Admin abajo.');
      } else {
        setFormError(err instanceof Error ? err.message : 'No se pudo iniciar sesion');
      }
    }
  }, [username, passwordlessLogin, onLogin, closeModal]);

  const handleAdminLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!username.trim() || !password) {
      setFormError('Usuario y contrasena son obligatorios');
      return;
    }

    try {
      const loggedInUser = await login(username.trim(), password);
      onLogin?.(loggedInUser, 'login');
      clearAdminLogin();
      closeModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo iniciar sesion');
    }
  }, [username, password, login, onLogin, clearAdminLogin, closeModal]);

  const handleAdminSignup = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const validation = validateUsername(username);
    if (!validation.valid) {
      setFormError(validation.error ?? 'Usuario invalido');
      return;
    }

    if (password.length < 6) {
      setFormError('La contrasena debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Las contrasenas no coinciden');
      return;
    }

    try {
      const options = requireAccessCode && accessCode ? { accessCode } : undefined;
      const signedUpUser = await signup(username.trim(), password, options);
      onSignup?.(signedUpUser);
      closeModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo crear la cuenta');
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
            ${user.walletValue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="fs-auth-username">
            {user.username}
          </span>
          <button className="fs-auth-signout-btn" onClick={handleLogout}>
            Salir
          </button>
        </div>
      </div>
    );
  }

  // -- Idle View (unauthenticated, no modal) --
  const idleContent = (
    <div className="fs-passwordless-auth">
      <div className="fs-auth-actions" style={{ alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ color: 'var(--fs-text-secondary)', fontSize: '0.875rem' }}>Inicia sesion para participar</span>
        <button
          className="fs-auth-btn fs-auth-btn-primary"
          onClick={() => {
            resetForm();
            setModalOpen(true);
            setView('passwordless');
          }}
        >
          Entrar / Crear cuenta
        </button>
      </div>
    </div>
  );

  // -- Modal Content --
  let modalContent: React.ReactNode = null;

  if (view === 'passwordless') {
    modalContent = (
      <form className="fs-auth-form" onSubmit={handlePasswordlessSubmit}>
        <h4 className="fs-auth-form-title">Entrar / Crear cuenta</h4>
        <span className="fs-auth-label-hint">Ingresa o crea una cuenta con el nombre que quieras</span>

        <div className="fs-auth-input-group">
          <label className="fs-auth-label">Usuario</label>
          <input
            className="fs-auth-input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Escribe tu usuario"
            disabled={loading}
            autoComplete="username"
          />
        </div>

        {formError && <div className="fs-auth-error">{formError}</div>}

        <div className="fs-auth-form-footer">
          <button type="submit" className="fs-auth-btn fs-auth-btn-primary" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar / Crear cuenta'}
          </button>
          <button type="button" className="fs-auth-btn fs-auth-btn-secondary" onClick={closeModal} disabled={loading}>
            Cancelar
          </button>
        </div>

        <button
          type="button"
          className="fs-auth-mode-link"
          onClick={() => { resetForm(); setView('admin'); }}
        >
          Acceso Admin
        </button>
      </form>
    );
  }

  if (view === 'admin') {
    modalContent = (
      <form className="fs-auth-form" onSubmit={handleAdminLogin}>
        <h4 className="fs-auth-form-title">Acceso Admin</h4>

        <div className="fs-auth-input-group">
          <label className="fs-auth-label">Usuario</label>
          <input
            className="fs-auth-input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Escribe tu usuario"
            disabled={loading}
            autoComplete="username"
          />
        </div>

        <div className="fs-auth-input-group">
          <label className="fs-auth-label">Contrasena</label>
          <input
            className="fs-auth-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Escribe tu contrasena"
            disabled={loading}
            autoComplete="current-password"
          />
        </div>

        {formError && <div className="fs-auth-error">{formError}</div>}

        <div className="fs-auth-form-footer">
          <button type="submit" className="fs-auth-btn fs-auth-btn-primary" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
          <button type="button" className="fs-auth-btn fs-auth-btn-secondary" onClick={closeModal} disabled={loading}>
            Cancelar
          </button>
        </div>

        <button
          type="button"
          className="fs-auth-mode-link"
          onClick={() => { resetForm(); setView('passwordless'); }}
        >
          Volver a entrar / crear cuenta
        </button>

        <button
          type="button"
          className="fs-auth-mode-link"
          onClick={() => { resetForm(); setView('admin-signup'); }}
        >
          Crear cuenta admin
        </button>
      </form>
    );
  }

  if (view === 'admin-signup') {
    modalContent = (
      <form className="fs-auth-form" onSubmit={handleAdminSignup}>
        <h4 className="fs-auth-form-title">Crear cuenta admin</h4>

        <div className="fs-auth-input-group">
          <label className="fs-auth-label">Usuario</label>
          <input
            className="fs-auth-input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Elige un usuario"
            disabled={loading}
            autoComplete="username"
          />
        </div>

        <div className="fs-auth-input-group">
          <label className="fs-auth-label">Contrasena</label>
          <input
            className="fs-auth-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimo 6 caracteres"
            disabled={loading}
            autoComplete="new-password"
          />
        </div>

        <div className="fs-auth-input-group">
          <label className="fs-auth-label">Confirmar contrasena</label>
          <input
            className="fs-auth-input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirma tu contrasena"
            disabled={loading}
            autoComplete="new-password"
          />
        </div>

        {requireAccessCode && (
          <div className="fs-auth-input-group">
            <label className="fs-auth-label">Codigo de acceso</label>
            <input
              className="fs-auth-input"
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Escribe el codigo"
              disabled={loading}
            />
          </div>
        )}

        {formError && <div className="fs-auth-error">{formError}</div>}

        <div className="fs-auth-form-footer">
          <button type="submit" className="fs-auth-btn fs-auth-btn-primary" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
          <button type="button" className="fs-auth-btn fs-auth-btn-secondary" onClick={closeModal} disabled={loading}>
            Cancelar
          </button>
        </div>

        <button
          type="button"
          className="fs-auth-mode-link"
          onClick={() => { resetForm(); setView('admin'); }}
        >
          Volver a acceso admin
        </button>
      </form>
    );
  }

  return (
    <>
      {idleContent}
      {modalOpen && (
        <div className="fs-auth-modal-backdrop" onClick={closeModal}>
          <div className="fs-auth-modal fs-passwordless-auth" onClick={(e) => e.stopPropagation()}>
            {modalContent}
          </div>
        </div>
      )}
    </>
  );
}
