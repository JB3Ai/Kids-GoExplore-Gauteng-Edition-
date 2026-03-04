import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// ── George Board Access Gate ─────────────────────────────────────────────────
// This app is only accessible from an active George Board session.
// George Board writes `jb3_session` to localStorage on the same origin.
const _raw = localStorage.getItem('jb3_session');
const _session = _raw ? (() => { try { return JSON.parse(_raw); } catch { return null; } })() : null;
const _valid = _session && _session.pinVerified === true;
if (!_valid) {
  document.body.innerHTML =
    '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0A0C10;font-family:monospace">' +
    '<div style="text-align:center;color:#9AA3AD">' +
    '<div style="font-size:11px;letter-spacing:0.3em;text-transform:uppercase;margin-bottom:16px">Access via George Board</div>' +
    '<a href="/clipboard/" style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#66FF66;text-decoration:none">→ Go to George Board</a>' +
    '</div></div>';
  throw new Error('Unauthorized: no active George Board session');
}
// ─────────────────────────────────────────────────────────────────────────────

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);