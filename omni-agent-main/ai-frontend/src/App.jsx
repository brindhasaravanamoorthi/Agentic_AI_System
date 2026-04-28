import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Bot, BarChart3 } from 'lucide-react';
import LandingPage from './pages/LandingPage';
import ChatPage from './pages/ChatPage';
import LogsPage from './pages/LogsPage';

function Navigation() {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-[#0d1324]/80 backdrop-blur-md border-b border-slate-800/50 sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <Bot className="w-8 h-8 text-[#3b82f6]" />
            <span className="text-xl font-bold text-white">OmniAgent</span>
          </Link>

          <div className="flex gap-3">
            <Link
              to="/chat"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                isLanding
                  ? 'bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium'
                  : isActive('/chat')
                    ? 'bg-[#3b82f6] text-white'
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <Bot className="w-5 h-5" />
              <span>{isLanding ? 'Try it now' : 'Agent Chat'}</span>
            </Link>
            <Link
              to="/analytics"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                isActive('/analytics')
                  ? 'bg-[#3b82f6] text-white'
                  : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span>Analytics</span>
            </Link>
            {!isLanding && (
              <Link
                to="/"
                className="px-4 py-2 rounded-lg border border-[#3b82f6]/60 hover:bg-[#3b82f6]/10 text-white font-medium transition-colors"
              >
                Home
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#0a0e1a] font-outfit text-white dark">
        <Navigation />
        <main>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/analytics" element={<LogsPage />} />
            <Route path="/logs" element={<Navigate to="/analytics" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;