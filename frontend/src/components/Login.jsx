import React, { useState } from 'react';
import { login } from '../api.js';
import { saveToken } from '../session.js';

// Pantalla de inicio de sesion. onLogin recibe el usuario autenticado.
export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { token, user } = await login(email.trim(), password);
      saveToken(token);
      onLogin(user);
    } catch (err) {
      setError(err.message);
      setPassword('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="login" onSubmit={submit} aria-label="Iniciar sesión">
      <h2>Iniciar sesión</h2>
      {error && <p role="alert" className="error">{error}</p>}
      <label>
        Correo
        <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        Contraseña
        <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <button type="submit" disabled={busy || email.trim() === '' || password === ''}>Entrar</button>
    </form>
  );
}
