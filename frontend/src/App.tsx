import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ShuttleProvider } from './context/ShuttleContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { OutsiderDashboard } from './pages/OutsiderDashboard';
import { DriverDashboard } from './pages/DriverDashboard';
import { AdminDashboard } from './pages/AdminDashboard';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ShuttleProvider>
          <BrowserRouter>
            <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-200">
              <Navbar />

              <main className="flex-1 flex flex-col">
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/verify-email" element={<VerifyEmailPage />} />

                  {/* Role-Specific Dashboards */}
                  <Route
                    path="/student"
                    element={
                      <ProtectedRoute allowedRoles={['student', 'admin']}>
                        <StudentDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/outsider"
                    element={
                      <ProtectedRoute allowedRoles={['outsider', 'admin']}>
                        <OutsiderDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/driver"
                    element={
                      <ProtectedRoute allowedRoles={['driver', 'admin']}>
                        <DriverDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>

              {/* Footer */}
              <footer className="border-t border-slate-800/80 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2">
                  <p className="font-semibold text-slate-400">
                    VIT Shuttle — Smart Campus Transit System (VIT Vellore)
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Deployed on AWS Free Tier compatible architecture • ESP32 Bidirectional IR Telemetry • Mobile GPS
                  </p>
                  <p className="text-[10px] text-slate-600">
                    Independent academic student transit engineering project. Not officially affiliated with or endorsed by VIT administration.
                  </p>
                </div>
              </footer>
            </div>
          </BrowserRouter>
        </ShuttleProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
