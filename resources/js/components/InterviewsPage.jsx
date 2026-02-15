import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    Link as LinkIcon,
    Mail,
    FileText,
    Trash2,
    ExternalLink,
    XCircle,
    CheckCircle2,
    Clock,
    Search,
    Edit3,
    AlertCircle,
    Plus,
    RefreshCw,
    ArrowUpDown,
    ArrowUp,
    ArrowDown
} from 'lucide-react';

const StatusBadge = ({ status }) => {
    switch (status) {
        case 'Completed':
            return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full flex items-center gap-1.5"><CheckCircle2 size={12} /> Completed</span>;
        case 'Waiting':
            return <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full flex items-center gap-1.5"><Clock size={12} /> Waiting for Response</span>;
        case 'Processing':
            return <span className="px-3 py-1 bg-violet-100 text-violet-700 text-xs font-bold rounded-full flex items-center gap-1.5"><RefreshCw size={12} className="animate-spin-slow" /> Processing</span>;
        case 'Cancelled':
            return <span className="px-3 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-full flex items-center gap-1.5"><XCircle size={12} /> Cancelled</span>;
        case 'Rejected':
            return <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full flex items-center gap-1.5"><AlertCircle size={12} /> Post-Interview Rejection</span>;
        case 'Offer Rejected':
            return <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full flex items-center gap-1.5"><XCircle size={12} /> Offer Rejected</span>;
        default:
            return <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full flex items-center gap-1.5"><Clock size={12} /> Scheduled</span>;
    }
};

const renderWithLinks = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) => {
        if (part.match(urlRegex)) {
            return (
                <a
                    key={i}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                    onClick={(e) => e.stopPropagation()}
                >
                    {part}
                </a>
            );
        }
        return part;
    });
};

const InterviewsPage = () => {
    const [interviews, setInterviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedInterview, setSelectedInterview] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'scheduled_at', direction: 'desc' });
    const [activeFilter, setActiveFilter] = useState('All');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newInterview, setNewInterview] = useState({
        company_name: '',
        position: '',
        interview_link: '',
        mail_content: '',
        notes: '',
        scheduled_at: '',
        status: 'Scheduled'
    });

    useEffect(() => {
        fetchInterviews();
    }, []);

    const fetchInterviews = async () => {
        try {
            const response = await axios.get('/api/interviews');
            setInterviews(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching interviews:', error);
            setLoading(false);
        }
    };

    const updateInterview = async (id, data) => {
        try {
            const response = await axios.put(`/api/interviews/${id}`, data);
            setInterviews(interviews.map(i => i.id === id ? response.data : i));
            if (selectedInterview?.id === id) {
                setSelectedInterview(response.data);
            }
        } catch (error) {
            console.error('Error updating interview:', error);
        }
    };

    const handleAddInterview = async (e) => {
        e.preventDefault();
        try {
            const dataToSend = { ...newInterview };
            // Convert empty strings to null for backend validation
            Object.keys(dataToSend).forEach(key => {
                if (dataToSend[key] === '') dataToSend[key] = null;
            });

            const response = await axios.post('/api/interviews', dataToSend);
            setInterviews([response.data, ...interviews]);
            setIsAddModalOpen(false);
            setNewInterview({
                company_name: '',
                position: '',
                interview_link: '',
                mail_content: '',
                notes: '',
                scheduled_at: '',
                status: 'Scheduled'
            });
            setSelectedInterview(response.data);
        } catch (error) {
            console.error('Error adding interview:', error);
            if (error.response?.status === 409) {
                alert(error.response.data.message);
            } else if (error.response?.status === 422) {
                const errors = error.response.data.errors;
                const firstError = Object.values(errors)[0][0];
                alert(`Validation Error: ${firstError}`);
            } else {
                alert('Something went wrong. Please try again.');
            }
        }
    };

    const deleteInterview = async (id, e) => {
        if (e) e.stopPropagation();
        if (confirm('Are you sure you want to remove this interview record?')) {
            try {
                await axios.delete(`/api/interviews/${id}`);
                setInterviews(interviews.filter(i => i.id !== id));
                if (selectedInterview?.id === id) setSelectedInterview(null);
            } catch (error) {
                console.error('Error deleting interview:', error);
            }
        }
    };

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={14} className="opacity-30" />;
        return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600" /> : <ArrowDown size={14} className="text-blue-600" />;
    };

    const stats = React.useMemo(() => {
        return {
            All: interviews.length,
            Scheduled: interviews.filter(i => i.status === 'Scheduled').length,
            Waiting: interviews.filter(i => i.status === 'Waiting').length,
            Rejected: interviews.filter(i => i.status === 'Rejected').length,
        };
    }, [interviews]);

    const sortedInterviews = React.useMemo(() => {
        let sortable = [...interviews.filter(i =>
            (i.company_name.toLowerCase().includes(search.toLowerCase()) ||
                i.position.toLowerCase().includes(search.toLowerCase())) &&
            (activeFilter === 'All' || i.status === activeFilter)
        )];

        if (sortConfig.key !== null) {
            sortable.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                if (sortConfig.key === 'status') {
                    const statusMap = { 'Completed': 7, 'Waiting': 6, 'Processing': 5, 'Scheduled': 4, 'Cancelled': 3, 'Rejected': 2, 'Offer Rejected': 1 };
                    aValue = statusMap[aValue] || 0;
                    bValue = statusMap[bValue] || 0;
                }

                if (!aValue) return 1;
                if (!bValue) return -1;

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortable;
    }, [interviews, search, sortConfig, activeFilter]);

    return (
        <div className="max-w-7xl mx-auto px-6 py-12">
            <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 mb-2">Interviews</h1>
                    <p className="text-slate-500 font-medium">Track your upcoming calls, technical rounds, and feedback.</p>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => { setLoading(true); fetchInterviews(); }}
                        className="p-3.5 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                    >
                        <Plus size={20} />
                        Add Interview
                    </button>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search company..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl w-full md:w-80 shadow-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all font-medium text-sm"
                        />
                    </div>
                </div>
            </header>

            <div className="flex flex-wrap items-center gap-3 mb-10">
                {[
                    { key: 'All', label: 'All Interviews', color: 'slate', count: stats.All },
                    { key: 'Scheduled', label: 'Scheduled', color: 'blue', count: stats.Scheduled },
                    { key: 'Waiting', label: 'Waiting for Response', color: 'indigo', count: stats.Waiting },
                    { key: 'Rejected', label: 'Rejected', color: 'orange', count: stats.Rejected },
                ].map((btn) => (
                    <button
                        key={btn.key}
                        onClick={() => setActiveFilter(btn.key)}
                        className={`px-5 py-2.5 rounded-2xl flex items-center gap-3 transition-all font-bold text-sm ${activeFilter === btn.key
                            ? `bg-${btn.color}-600 text-white shadow-lg shadow-${btn.color}-200 scale-105`
                            : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                    >
                        {btn.label}
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] ${activeFilter === btn.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                            }`}>
                            {btn.count}
                        </span>
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3">
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Company & Position</th>
                                    <th
                                        className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 cursor-pointer hover:text-blue-600 transition-colors"
                                        onClick={() => requestSort('scheduled_at')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Date & Time
                                            {getSortIcon('scheduled_at')}
                                        </div>
                                    </th>
                                    <th
                                        className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 cursor-pointer hover:text-blue-600 transition-colors"
                                        onClick={() => requestSort('status')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Status
                                            {getSortIcon('status')}
                                        </div>
                                    </th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {sortedInterviews.length > 0 ? sortedInterviews.map((interview) => (
                                    <motion.tr
                                        layout
                                        key={interview.id}
                                        onClick={() => {
                                            setSelectedInterview(interview);
                                            setIsEditMode(false);
                                        }}
                                        className={`group cursor-pointer transition-all ${selectedInterview?.id === interview.id ? 'bg-blue-50/30' : 'hover:bg-slate-50/80'}`}
                                    >
                                        <td className="px-8 py-6">
                                            <div className="font-bold text-slate-900 text-lg">{interview.company_name}</div>
                                            <div className="text-sm font-medium text-slate-400">{interview.position || 'No position specified'}</div>
                                        </td>
                                        <td className="px-8 py-6">
                                            {interview.scheduled_at ? (
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-700">
                                                        {new Date(interview.scheduled_at).toLocaleDateString(undefined, {
                                                            month: 'short', day: 'numeric', year: 'numeric'
                                                        })}
                                                    </span>
                                                    <span className="text-[10px] font-black uppercase text-slate-400">
                                                        {new Date(interview.scheduled_at).toLocaleTimeString(undefined, {
                                                            hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-xs font-bold text-slate-300 italic uppercase">Pending Sync</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-6" onClick={(e) => e.stopPropagation()}>
                                            <select
                                                value={interview.status}
                                                onChange={(e) => updateInterview(interview.id, { status: e.target.value })}
                                                className={`px-3 py-1.5 rounded-full text-xs font-bold outline-none border cursor-pointer transition-all appearance-none text-center min-w-[140px] ${interview.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200' :
                                                    interview.status === 'Waiting' ? 'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200' :
                                                        interview.status === 'Processing' ? 'bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-200' :
                                                            interview.status === 'Cancelled' ? 'bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200' :
                                                                interview.status === 'Rejected' ? 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200' :
                                                                    interview.status === 'Offer Rejected' ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200' :
                                                                        'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200'
                                                    }`}
                                            >
                                                <option value="Scheduled">Scheduled</option>
                                                <option value="Completed">Completed</option>
                                                <option value="Waiting">Waiting for Response</option>
                                                <option value="Processing">Processing</option>
                                                <option value="Cancelled">Cancelled</option>
                                                <option value="Rejected">Post-Interview Rejection</option>
                                                <option value="Offer Rejected">Offer Rejected</option>
                                            </select>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button
                                                onClick={(e) => deleteInterview(interview.id, e)}
                                                className="p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </motion.tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Calendar size={48} className="text-slate-200" />
                                                <p className="text-slate-400 font-medium">No interviews match your search.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="lg:col-span-1">
                    <AnimatePresence mode="wait">
                        {selectedInterview ? (
                            <motion.div
                                key={selectedInterview.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl p-8 sticky top-28"
                            >
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-2xl font-black text-slate-900">Details</h2>
                                    <button
                                        onClick={() => setIsEditMode(!isEditMode)}
                                        className={`p-2 rounded-xl transition-all ${isEditMode ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400 hover:text-blue-600'}`}
                                    >
                                        <Edit3 size={18} />
                                    </button>
                                </div>

                                {isEditMode ? (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Company Name</label>
                                                <input
                                                    type="text"
                                                    value={selectedInterview.company_name || ''}
                                                    onChange={(e) => setSelectedInterview({ ...selectedInterview, company_name: e.target.value })}
                                                    onBlur={(e) => updateInterview(selectedInterview.id, { company_name: e.target.value })}
                                                    placeholder="Company..."
                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Position Name</label>
                                                <input
                                                    type="text"
                                                    value={selectedInterview.position || ''}
                                                    onChange={(e) => setSelectedInterview({ ...selectedInterview, position: e.target.value })}
                                                    onBlur={(e) => updateInterview(selectedInterview.id, { position: e.target.value })}
                                                    placeholder="Position..."
                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Interview Link</label>
                                            <input
                                                type="text"
                                                value={selectedInterview.interview_link || ''}
                                                onChange={(e) => setSelectedInterview({ ...selectedInterview, interview_link: e.target.value })}
                                                onBlur={(e) => updateInterview(selectedInterview.id, { interview_link: e.target.value })}
                                                placeholder="Meeting URL..."
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Scheduled Time</label>
                                            <input
                                                type="datetime-local"
                                                value={selectedInterview.scheduled_at ? new Date(new Date(selectedInterview.scheduled_at).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                                                onChange={(e) => {
                                                    const date = e.target.value;
                                                    setSelectedInterview({ ...selectedInterview, scheduled_at: date });
                                                    updateInterview(selectedInterview.id, { scheduled_at: date });
                                                }}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Mail Content</label>
                                            <textarea
                                                rows="6"
                                                value={selectedInterview.mail_content || ''}
                                                onChange={(e) => setSelectedInterview({ ...selectedInterview, mail_content: e.target.value })}
                                                onBlur={(e) => updateInterview(selectedInterview.id, { mail_content: e.target.value })}
                                                placeholder="Paste email invitation here..."
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Personal Notes</label>
                                            <textarea
                                                rows="4"
                                                value={selectedInterview.notes || ''}
                                                onChange={(e) => setSelectedInterview({ ...selectedInterview, notes: e.target.value })}
                                                onBlur={(e) => updateInterview(selectedInterview.id, { notes: e.target.value })}
                                                placeholder="Preparation tips, questions to ask..."
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Interview Status</label>
                                            <select
                                                value={selectedInterview.status}
                                                onChange={(e) => {
                                                    const newStatus = e.target.value;
                                                    setSelectedInterview({ ...selectedInterview, status: newStatus });
                                                    updateInterview(selectedInterview.id, { status: newStatus });
                                                }}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                            >
                                                <option value="Scheduled">Scheduled</option>
                                                <option value="Completed">Completed</option>
                                                <option value="Waiting">Waiting for Response</option>
                                                <option value="Processing">Processing</option>
                                                <option value="Cancelled">Cancelled</option>
                                                <option value="Rejected">Post-Interview Rejection</option>
                                                <option value="Offer Rejected">Offer Rejected</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setIsEditMode(false)}
                                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm"
                                            >
                                                Done Editing
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        <div>
                                            <div className="text-[10px] font-black uppercase text-slate-400 mb-3 ml-1">Quick Join</div>
                                            {selectedInterview.interview_link ? (
                                                <a
                                                    href={selectedInterview.interview_link}
                                                    target="_blank"
                                                    className="flex items-center justify-between p-4 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100 hover:bg-blue-600 hover:text-white transition-all group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <LinkIcon size={18} />
                                                        <span className="font-bold text-sm">Meeting Room</span>
                                                    </div>
                                                    <ExternalLink size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                                </a>
                                            ) : (
                                                <div className="p-4 bg-slate-50 text-slate-400 rounded-2xl border border-slate-100 text-sm italic">No link provided</div>
                                            )}
                                        </div>

                                        {selectedInterview.mail_content && (
                                            <div>
                                                <div className="text-[10px] font-black uppercase text-slate-400 mb-3 ml-1">Email Context</div>
                                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-mono">
                                                    {renderWithLinks(selectedInterview.mail_content)}
                                                </div>
                                            </div>
                                        )}

                                        {selectedInterview.notes && (
                                            <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-100 relative overflow-hidden">
                                                <AlertCircle size={40} className="absolute -bottom-2 -right-2 text-amber-200/50" />
                                                <div className="text-[10px] font-black uppercase text-amber-600 mb-3">Pre-Call Notes</div>
                                                <p className="text-sm text-amber-900 font-medium leading-relaxed relative z-10">{renderWithLinks(selectedInterview.notes)}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-[3rem] p-12 text-center text-slate-400 h-96 flex flex-col items-center justify-center">
                                <FileText size={32} className="mb-4 opacity-30" />
                                <p className="text-sm font-medium">Select an interview to view details, meeting links, and preparation notes.</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
            {/* Add Interview Modal */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsAddModalOpen(false)}
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl z-[70] p-10 overflow-hidden"
                        >
                            <h2 className="text-2xl font-black text-slate-900 mb-8">Schedule Interview</h2>
                            <form onSubmit={handleAddInterview} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Company</label>
                                    <input
                                        type="text"
                                        value={newInterview.company_name}
                                        onChange={(e) => setNewInterview({ ...newInterview, company_name: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Company Name"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Position</label>
                                        <input
                                            type="text"
                                            value={newInterview.position}
                                            onChange={(e) => setNewInterview({ ...newInterview, position: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="e.g. Frontend Dev"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Date & Time</label>
                                        <input
                                            type="datetime-local"
                                            value={newInterview.scheduled_at}
                                            onChange={(e) => setNewInterview({ ...newInterview, scheduled_at: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Meeting Link</label>
                                    <input
                                        type="text"
                                        value={newInterview.interview_link}
                                        onChange={(e) => setNewInterview({ ...newInterview, interview_link: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Zoom, Teams, etc."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email Content</label>
                                    <textarea
                                        rows="4"
                                        value={newInterview.mail_content}
                                        onChange={(e) => setNewInterview({ ...newInterview, mail_content: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-xs"
                                        placeholder="Paste invitation email here..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Status</label>
                                    <select
                                        value={newInterview.status || 'Scheduled'}
                                        onChange={(e) => setNewInterview({ ...newInterview, status: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                    >
                                        <option value="Scheduled">Scheduled</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Waiting">Waiting for Response</option>
                                        <option value="Processing">Processing</option>
                                        <option value="Cancelled">Cancelled</option>
                                        <option value="Rejected">Post-Interview Rejection</option>
                                        <option value="Offer Rejected">Offer Rejected</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-100"
                                    >
                                        Save Call
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default InterviewsPage;
