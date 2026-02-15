import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Briefcase, LogOut, User as UserIcon, Settings } from 'lucide-react';
import axios from 'axios';
import './bootstrap';
import '../css/app.css';
import Dashboard from './components/Dashboard';
import ApplicationsPage from './components/ApplicationsPage';
import ProfileModal from './components/ProfileModal';
import Login from './components/Login';
import Register from './components/Register';
import InterviewsPage from './components/InterviewsPage';

// Protected Route Component
const ProtectedRoute = ({ user, loading, children }) => {
    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
    );
    if (!user) return <Navigate to="/login" />;
    return children;
};

const Navbar = ({ user, setUser }) => {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await axios.post('/api/logout');
        } catch (error) {
            console.error('Logout failed', error);
        } finally {
            localStorage.removeItem('auth_token');
            delete axios.defaults.headers.common['Authorization'];
            setUser(null);
            navigate('/login');
        }
    };

    if (!user) return null;

    return (
        <nav className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 shadow-sm shadow-slate-200/20">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                        <Briefcase size={22} strokeWidth={2.5} />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-slate-900">JobAssistant<span className="text-blue-600">.</span></span>
                </Link>
                <div className="flex items-center gap-8">
                    <Link
                        to="/"
                        className={`text-sm font-bold transition-colors ${location.pathname === '/' ? 'text-blue-600' : 'text-slate-500 hover:text-blue-600'}`}
                    >
                        Dashboard
                    </Link>
                    <Link
                        to="/applications"
                        className={`text-sm font-bold transition-colors ${location.pathname === '/applications' ? 'text-blue-600' : 'text-slate-500 hover:text-blue-600'}`}
                    >
                        Applications
                    </Link>
                    <Link
                        to="/interviews"
                        className={`text-sm font-bold transition-colors ${location.pathname === '/interviews' ? 'text-blue-600' : 'text-slate-500 hover:text-blue-600'}`}
                    >
                        Interviews
                    </Link>
                    <span
                        onClick={() => setIsProfileOpen(true)}
                        className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors cursor-pointer flex items-center gap-2"
                    >
                        <UserIcon size={16} />
                        Profile
                    </span>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-full hover:bg-slate-800 transition-all active:scale-[0.98] shadow-md shadow-slate-200"
                    >
                        <LogOut size={16} />
                        Logout
                    </button>
                </div>
            </div>

            <ProfileModal
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                onSave={() => window.location.reload()}
            />
        </nav>
    );
};

const App = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            axios.get('/api/me')
                .then(response => {
                    setUser(response.data);
                })
                .catch(() => {
                    localStorage.removeItem('auth_token');
                    delete axios.defaults.headers.common['Authorization'];
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    return (
        <BrowserRouter>
            <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
                <Navbar user={user} setUser={setUser} />
                <Routes>
                    <Route path="/login" element={user ? <Navigate to="/" /> : <Login setUser={setUser} />} />
                    <Route path="/register" element={user ? <Navigate to="/" /> : <Register setUser={setUser} />} />

                    <Route path="/" element={
                        <ProtectedRoute user={user} loading={loading}>
                            <Dashboard />
                        </ProtectedRoute>
                    } />
                    <Route path="/applications" element={
                        <ProtectedRoute user={user} loading={loading}>
                            <ApplicationsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/interviews" element={
                        <ProtectedRoute user={user} loading={loading}>
                            <InterviewsPage />
                        </ProtectedRoute>
                    } />
                </Routes>
            </div>
        </BrowserRouter>
    );
};

const container = document.getElementById('app');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}

export default App;
