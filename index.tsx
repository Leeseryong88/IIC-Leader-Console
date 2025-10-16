
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import SettingsPage from './components/SettingsPage';
import AuthGate from './components/AuthGate';
import AdminGate from './components/AdminGate';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
// 간단한 경로 분기: URL이 /setting으로 끝나면 설정 페이지 렌더
const isSettings = /\/setting\/?$/.test(window.location.pathname);
const isLogin = /\/login\/?$/.test(window.location.pathname);

root.render(
  <React.StrictMode>
    {isLogin ? (
      <AuthGate>
        {isSettings ? <SettingsPage /> : <App />}
      </AuthGate>
    ) : (
      <AdminGate>
        {isSettings ? <SettingsPage /> : <App />}
      </AdminGate>
    )}
  </React.StrictMode>
);
