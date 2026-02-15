import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Briefcase,
    ExternalLink,
    Download,
    Trash2,
    ChevronRight,
    FileText,
    CheckCircle2,
    XCircle,
    Clock,
    Search,
    Filter,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Sparkles,
    RotateCw,
    RefreshCcw,
    Edit3
} from 'lucide-react';

const StatusBadge = ({ status }) => {
    switch (status) {
        case 'Selected':
            return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full flex items-center gap-1.5"><CheckCircle2 size={12} /> Selected</span>;
        case 'Rejected':
            return <span className="px-3 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-full flex items-center gap-1.5"><XCircle size={12} /> Rejected</span>;
        case 'Interview':
            return <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full flex items-center gap-1.5"><Clock size={12} /> Interview</span>;
        case 'Applied':
            return <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full flex items-center gap-1.5"><FileText size={12} /> Applied</span>;
        default:
            return <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full flex items-center gap-1.5"><Clock size={12} /> Pending</span>;
    }
};

const MatchBadge = ({ score }) => {
    switch (score) {
        case 'High':
            return <span className="text-emerald-600 font-black text-xs uppercase tracking-tight">High Fit</span>;
        case 'Medium':
            return <span className="text-amber-600 font-black text-xs uppercase tracking-tight">Medium Fit</span>;
        default:
            return <span className="text-slate-400 font-black text-xs uppercase tracking-tight">Low Fit</span>;
    }
};

const ApplicationsPage = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [selectedJob, setSelectedJob] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [reanalyzingId, setReanalyzingId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ company_name: '', position: '' });
    const [activeFilter, setActiveFilter] = useState('All');

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            const response = await axios.get('/api/jobs');
            setJobs(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching jobs:', error);
            setLoading(false);
        }
    };

    const updateStatus = async (id, status) => {
        try {
            const response = await axios.patch(`/api/jobs/${id}`, { status });
            fetchJobs();

            if (status === 'Interview') {
                const job = response.data;
                const confirmAdd = confirm(`Application updated to "Interview"! Would you like to add meeting details for ${job.company_name} in the Interviews tab?`);
                if (confirmAdd) {
                    try {
                        await axios.post('/api/interviews', {
                            job_application_id: job.id,
                            company_name: job.company_name,
                            position: job.position,
                            status: 'Scheduled'
                        });
                        alert('Interview record created. You can find it in the new "Interviews" tab!');
                    } catch (err) {
                        if (err.response?.status === 409) alert(err.response.data.message);
                    }
                }
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const deleteJob = async (id, e) => {
        if (e) e.stopPropagation();
        if (confirm('Are you sure you want to remove this application?')) {
            try {
                await axios.delete(`/api/jobs/${id}`);
                setJobs(jobs.filter(job => job.id !== id));
                setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
                if (selectedJob?.id === id) setSelectedJob(null);
            } catch (error) {
                console.error('Error deleting job:', error);
            }
        }
    };

    const handleBulkDelete = async () => {
        if (confirm(`Are you sure you want to delete ${selectedIds.length} selected applications?`)) {
            try {
                await axios.delete('/api/jobs/bulk-delete', { data: { ids: selectedIds } });
                setJobs(jobs.filter(job => !selectedIds.includes(job.id)));
                setSelectedIds([]);
                if (selectedIds.includes(selectedJob?.id)) setSelectedJob(null);
            } catch (error) {
                console.error('Error in bulk delete:', error);
            }
        }
    };

    const toggleSelect = (id, e) => {
        if (e) e.stopPropagation();
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === sortedJobs.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(sortedJobs.map(job => job.id));
        }
    };

    const handleGenerateDocs = async (id) => {
        try {
            const response = await axios.post(`/api/jobs/${id}/generate-docs`);
            setJobs(jobs.map(job => job.id === id ? response.data : job));
            setSelectedJob(response.data);
        } catch (error) {
            console.error('Error generating docs:', error);
        }
    };

    const handleReanalyze = async (id) => {
        setReanalyzingId(id);
        try {
            const response = await axios.post(`/api/jobs/${id}/reanalyze`);
            const updatedJob = response.data;
            setJobs(jobs.map(j => j.id === id ? updatedJob : j));
            setSelectedJob(updatedJob);
        } catch (error) {
            console.error('Error re-analyzing:', error);
        } finally {
            setReanalyzingId(null);
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.patch(`/api/jobs/${selectedJob.id}`, editForm);
            const updatedJob = response.data;
            setJobs(jobs.map(j => j.id === updatedJob.id ? updatedJob : j));
            setSelectedJob(updatedJob);
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating job:', error);
            alert('Failed to update job details');
        }
    };

    const getMatchColor = (score) => {
        switch (score) {
            case 'High': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'Medium': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'Low': return 'bg-rose-50 text-rose-700 border-rose-100';
            default: return 'bg-slate-50 text-slate-700 border-slate-100';
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
            All: jobs.length,
            Pending: jobs.filter(j => j.status === 'Pending' || !j.status).length,
            Applied: jobs.filter(j => j.status === 'Applied').length,
            Interview: jobs.filter(j => j.status === 'Interview').length,
            Selected: jobs.filter(j => j.status === 'Selected').length,
            Rejected: jobs.filter(j => j.status === 'Rejected').length,
        };
    }, [jobs]);

    const sortedJobs = React.useMemo(() => {
        let sortableJobs = [...jobs.filter(job =>
            (job.company_name.toLowerCase().includes(search.toLowerCase()) ||
                job.position.toLowerCase().includes(search.toLowerCase())) &&
            (activeFilter === 'All' || (activeFilter === 'Pending' ? (!job.status || job.status === 'Pending') : job.status === activeFilter))
        )];

        if (sortConfig.key !== null) {
            sortableJobs.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Special handling for AI Fit
                if (sortConfig.key === 'match_score') {
                    const scoreMap = { 'High': 3, 'Medium': 2, 'Low': 1 };
                    aValue = scoreMap[aValue] || 0;
                    bValue = scoreMap[bValue] || 0;
                }

                // Special handling for Status
                if (sortConfig.key === 'status') {
                    const statusMap = { 'Selected': 5, 'Interview': 4, 'Applied': 3, 'Pending': 2, 'Rejected': 1 };
                    aValue = statusMap[aValue] || 0;
                    bValue = statusMap[bValue] || 0;
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }

                // Secondary sort: if positions are same, sort by company_name
                if (sortConfig.key === 'position') {
                    const aComp = a.company_name.toLowerCase();
                    const bComp = b.company_name.toLowerCase();
                    if (aComp < bComp) return -1;
                    if (aComp > bComp) return 1;
                }

                return 0;
            });
        }
        return sortableJobs;
    }, [jobs, search, sortConfig, activeFilter]);

    return (
        <div className="max-w-7xl mx-auto px-6 py-12">
            <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 mb-2">My Applications</h1>
                    <p className="text-slate-500 font-medium">Manage and track your interview progress across all platforms.</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex px-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm text-xs font-bold text-slate-600 items-center gap-2">
                        <span className="w-2 h-10 bg-blue-500 rounded-full"></span>
                        Total: {jobs.length}
                    </div>
                    <AnimatePresence>
                        {selectedIds.length > 0 && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                onClick={handleBulkDelete}
                                className="flex px-4 py-3 bg-rose-50 border border-rose-100 rounded-2xl shadow-sm text-xs font-bold text-rose-600 items-center gap-2 hover:bg-rose-600 hover:text-white transition-all outline-none"
                            >
                                <Trash2 size={16} />
                                Delete Selected ({selectedIds.length})
                            </motion.button>
                        )}
                    </AnimatePresence>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search applications..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl w-full md:w-80 shadow-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all font-medium text-sm"
                        />
                    </div>
                </div>
            </header>

            <div className="flex flex-wrap items-center gap-3 mb-10">
                {[
                    { key: 'All', label: 'All Apps', color: 'slate', count: stats.All },
                    { key: 'Pending', label: 'Pending', color: 'slate', count: stats.Pending },
                    { key: 'Applied', label: 'Applied', color: 'blue', count: stats.Applied },
                    { key: 'Interview', label: 'Interview', color: 'amber', count: stats.Interview },
                    { key: 'Selected', label: 'Selected', color: 'emerald', count: stats.Selected },
                    { key: 'Rejected', label: 'Rejected', color: 'rose', count: stats.Rejected },
                ].map((btn) => (
                    <button
                        key={btn.key}
                        onClick={() => setActiveFilter(btn.key)}
                        className={`px-5 py-2.5 rounded-2xl flex items-center gap-3 transition-all font-bold text-sm ${activeFilter === btn.key
                                ? `bg-${btn.color === 'slate' ? 'slate-900' : btn.color + '-600'} text-white shadow-lg shadow-${btn.color === 'slate' ? 'slate' : btn.color}-200 scale-105`
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

            <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-8 py-6 w-10">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.length === sortedJobs.length && sortedJobs.length > 0}
                                        onChange={toggleSelectAll}
                                        className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                </th>
                                <th
                                    className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 cursor-pointer hover:text-slate-600 transition-colors"
                                    onClick={() => requestSort('position')}
                                >
                                    <div className="flex items-center gap-1.5">
                                        Position & Company {getSortIcon('position')}
                                    </div>
                                </th>
                                <th
                                    className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center cursor-pointer hover:text-slate-600 transition-colors"
                                    onClick={() => requestSort('match_score')}
                                >
                                    <div className="flex items-center justify-center gap-1.5">
                                        AI Fit {getSortIcon('match_score')}
                                    </div>
                                </th>
                                <th
                                    className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 cursor-pointer hover:text-slate-600 transition-colors"
                                    onClick={() => requestSort('status')}
                                >
                                    <div className="flex items-center gap-1.5">
                                        Application Status {getSortIcon('status')}
                                    </div>
                                </th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Tailored Assets</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Quick Apply</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {sortedJobs.map((job) => (
                                <motion.tr
                                    layout
                                    key={job.id}
                                    onClick={() => setSelectedJob(job)}
                                    className={`group cursor-pointer transition-all ${selectedJob?.id === job.id ? 'bg-blue-50/30' : 'hover:bg-slate-50/80'} ${selectedIds.includes(job.id) ? 'bg-blue-50/50' : ''}`}
                                >
                                    <td className="px-8 py-6" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(job.id)}
                                            onChange={(e) => toggleSelect(job.id, e)}
                                            className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-lg">{job.position}</div>
                                        <div className="text-sm font-medium text-slate-400 flex items-center gap-1.5">
                                            {job.company_name}
                                            <a href={job.apply_link} target="_blank" onClick={(e) => e.stopPropagation()} className="hover:text-blue-500 transition-colors"><ExternalLink size={12} /></a>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <MatchBadge score={job.match_score} />
                                    </td>
                                    <td className="px-8 py-6" onClick={(e) => e.stopPropagation()}>
                                        <select
                                            value={job.status || 'Pending'}
                                            onChange={(e) => updateStatus(job.id, e.target.value)}
                                            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider outline-none border cursor-pointer transition-all appearance-none text-center min-w-[120px] ${job.status === 'Selected' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200' :
                                                    job.status === 'Interview' ? 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200' :
                                                        job.status === 'Applied' ? 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200' :
                                                            job.status === 'Rejected' ? 'bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200' :
                                                                'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                                }`}
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="Applied">Applied</option>
                                            <option value="Interview">Interview</option>
                                            <option value="Selected">Selected</option>
                                            <option value="Rejected">Rejected</option>
                                        </select>
                                    </td>
                                    <td className="px-8 py-6" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center gap-3">
                                            {job.tailored_cv_url ? (
                                                <a
                                                    href={job.tailored_cv_url}
                                                    download
                                                    className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                                    title="Download CV"
                                                >
                                                    <Download size={16} />
                                                </a>
                                            ) : (
                                                <div className="p-2.5 bg-slate-50 text-slate-300 rounded-xl cursor-not-allowed">
                                                    <Download size={16} />
                                                </div>
                                            )}
                                            {job.tailored_cover_letter_url ? (
                                                <a
                                                    href={job.tailored_cover_letter_url}
                                                    download
                                                    className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                                                    title="Download Cover Letter"
                                                >
                                                    <FileText size={16} />
                                                </a>
                                            ) : (
                                                <div className="p-2.5 bg-slate-50 text-slate-300 rounded-xl cursor-not-allowed">
                                                    <FileText size={16} />
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <a
                                            href={job.apply_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-all shadow-md shadow-slate-200"
                                        >
                                            Apply Now <ExternalLink size={14} />
                                        </a>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button
                                            onClick={(e) => deleteJob(job.id, e)}
                                            className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                            {sortedJobs.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="7" className="px-8 py-20 text-center text-slate-400 font-medium">
                                        No applications found. Add your first job link on the dashboard!
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Sidebar Details Drawer */}
            <AnimatePresence>
                {selectedJob && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedJob(null)}
                            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 overflow-y-auto border-l border-slate-200"
                        >
                            <div className="sticky top-0 bg-white/90 backdrop-blur-md p-8 border-b border-slate-100 flex justify-between items-center z-10">
                                <div className="flex-1">
                                    {isEditing ? (
                                        <div className="space-y-3 mr-4">
                                            <input
                                                type="text"
                                                value={editForm.position}
                                                onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="Position"
                                            />
                                            <input
                                                type="text"
                                                value={editForm.company_name}
                                                onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="Company Name"
                                            />
                                            <div className="flex gap-2">
                                                <button onClick={handleEditSubmit} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all">Save</button>
                                                <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition-all">Cancel</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-3">
                                                <h2 className="text-2xl font-black text-slate-900">{selectedJob.position}</h2>
                                                <button
                                                    onClick={() => {
                                                        setEditForm({ company_name: selectedJob.company_name, position: selectedJob.position });
                                                        setIsEditing(true);
                                                    }}
                                                    className="p-1.5 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                >
                                                    <Edit3 size={16} />
                                                </button>
                                            </div>
                                            <p className="text-slate-500 font-medium">{selectedJob.company_name}</p>
                                        </>
                                    )}
                                </div>
                                <button onClick={() => { setSelectedJob(null); setIsEditing(false); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0">
                                    <XCircle size={28} className="text-slate-300 hover:text-slate-900" />
                                </button>
                            </div>

                            <div className="p-8 space-y-10">
                                {/* Match Breakdown */}
                                <section>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                                        <Sparkles size={16} className="text-blue-500" />
                                        Matching Intelligence
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                            <div className="text-[10px] font-black text-slate-400 uppercase mb-2">Technical Fit</div>
                                            <div className="text-2xl font-black text-slate-900">{selectedJob.match_score}</div>
                                        </div>
                                        <button
                                            onClick={() => handleReanalyze(selectedJob.id)}
                                            disabled={reanalyzingId === selectedJob.id}
                                            className="bg-blue-600 p-6 rounded-3xl text-white flex flex-col items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
                                        >
                                            <RotateCw size={20} className={reanalyzingId === selectedJob.id ? "animate-spin" : ""} />
                                            <span className="text-[10px] font-black uppercase">Re-Analyze</span>
                                        </button>
                                    </div>

                                    <div className="mt-6 space-y-6">
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-900 mb-3 ml-1">Key Match Highlights</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedJob.highlights?.map((h, i) => (
                                                    <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100">
                                                        {h}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-900 mb-3 ml-1 text-rose-600">Missing Skills</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedJob.missing_skills?.map((s, i) => (
                                                    <span key={i} className="px-3 py-1.5 bg-rose-50 text-rose-700 text-xs font-bold rounded-lg border border-rose-100">
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Generator Action */}
                                <section className="pt-8 border-t border-slate-100">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                                        <FileText size={16} className="text-blue-500" />
                                        Auto-Generator
                                    </h3>

                                    {!selectedJob.tailored_cv ? (
                                        <button
                                            onClick={() => handleGenerateDocs(selectedJob.id)}
                                            className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200"
                                        >
                                            <Sparkles size={24} />
                                            Generate Tailored Docs
                                        </button>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                                <h4 className="text-xs font-bold text-slate-900 mb-2 uppercase">Tailored Cover Letter</h4>
                                                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedJob.tailored_cover_letter}</p>
                                            </div>
                                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                                <h4 className="text-xs font-bold text-slate-900 mb-2 uppercase">Simplified CV Summary</h4>
                                                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedJob.tailored_cv}</p>
                                            </div>
                                        </div>
                                    )}
                                </section>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ApplicationsPage;
