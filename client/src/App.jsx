import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useSelector } from 'react-redux';
import DashboardLayout from './components/layout/DashboardLayout.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import AdminRoute from './components/layout/AdminRoute.jsx';
import PublicRoute from './components/layout/PublicRoute.jsx';
import ErrorBoundary from './components/ui/ErrorBoundary.jsx';

// Auth pages (not lazy — small)
import LoginPage from './features/auth/LoginPage.jsx';
import RegisterPage from './features/auth/RegisterPage.jsx';

// Lazy-loaded page components
const AdminDashboard = lazy(() => import('./features/admin/AdminDashboard.jsx'));
const MatchesPage = lazy(() => import('./features/matches/MatchesPage.jsx'));
const MatchDetail = lazy(() => import('./features/matches/MatchDetail.jsx'));
const PlayersPage = lazy(() => import('./features/players/PlayersPage.jsx'));
const PlayerDetail = lazy(() => import('./features/players/PlayerDetail.jsx'));
const OpeningsPage = lazy(() => import('./features/openings/OpeningsPage.jsx'));
const AnalyticsDashboard = lazy(() => import('./features/analytics/AnalyticsDashboard.jsx'));
const SearchPage = lazy(() => import('./features/search/SearchPage.jsx'));
const UsersManagement = lazy(() => import('./features/admin/UsersManagement.jsx'));
const ProfilePage = lazy(() => import('./features/profile/ProfilePage.jsx'));
const SettingsPage = lazy(() => import('./features/profile/SettingsPage.jsx'));
const Leaderboards = lazy(() => import('./features/analytics/Leaderboards.jsx'));
const OpeningExplorer = lazy(() => import('./features/analytics/OpeningExplorer.jsx'));
const PlayerComparison = lazy(() => import('./features/analytics/PlayerComparison.jsx'));
const PersonalDashboard = lazy(() => import('./features/analytics/PersonalDashboard.jsx'));
const PlayAIPage = lazy(() => import('./features/play/PlayAIPage.jsx'));
const PlayRoomPage = lazy(() => import('./features/play/PlayRoomPage.jsx'));
const PlayRandomPage = lazy(() => import('./features/play/PlayRandomPage.jsx'));
const PuzzlesPage = lazy(() => import('./features/puzzles/PuzzlesPage.jsx'));

const PageLoader = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '60vh', fontFamily: 'var(--font-display)',
    fontSize: 'var(--font-size-xs)', textTransform: 'uppercase',
    letterSpacing: '0.15em', color: 'var(--color-muted)',
  }}>
    <span>◌ Loading…</span>
  </div>
);

const App = () => {
  const theme = useSelector((s) => s.ui.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <BrowserRouter>
      <Helmet defaultTitle="Chess Analytics" titleTemplate="%s | Chess Analytics">
        <meta name="description" content="A powerful, production-grade analytics platform for tracking and analyzing chess matches, player performance, and opening statistics." />
        <meta property="og:title" content="Chess Analytics Platform" />
        <meta property="og:description" content="Discover deep insights into your chess games with detailed metrics, giant slayer leaderboards, and opening explorers." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>

            {/* Protected routes — inside dashboard layout */}
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<AdminDashboard />} />
                <Route path="/play/ai" element={<PlayAIPage />} />
                <Route path="/play/room" element={<PlayRoomPage />} />
                <Route path="/play/random" element={<PlayRandomPage />} />
                <Route path="/puzzles" element={<PuzzlesPage />} />
                <Route path="/matches" element={<MatchesPage />} />
                <Route path="/matches/:id" element={<MatchDetail />} />
                <Route path="/players" element={<PlayersPage />} />
                <Route path="/players/:id" element={<PlayerDetail />} />
                <Route path="/openings" element={<OpeningsPage />} />
                <Route path="/analytics" element={<AnalyticsDashboard />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/leaderboards" element={<Leaderboards />} />
                <Route path="/compare" element={<PlayerComparison />} />
                <Route path="/dashboard/player/:username" element={<PersonalDashboard />} />
                <Route path="/openings/explorer" element={<OpeningExplorer />} />

                {/* Admin-only routes */}
                <Route element={<AdminRoute />}>
                  <Route path="/admin/users" element={<UsersManagement />} />
                </Route>
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default App;
