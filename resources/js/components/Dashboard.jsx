import React, { useState, useEffect } from 'react';
import { Briefcase, Plus, Search, Trash2, ExternalLink, Loader2, Sparkles, FileText, ChevronRight, XCircle, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import ProfileModal from './ProfileModal';

const Dashboard = () => {
    const [jobs, setJobs] = useState([]);
    const [profile, setProfile] = useState(null);
    const [newJobLink, setNewJobLink] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedJob, setSelectedJob] = useState(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ company_name: '', position: '' });

    useEffect(() => {
        fetchJobs();
        fetchProfile();
    }, []);

    const fetchJobs = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/jobs');
            setJobs(response.data);
        } catch (error) {
            console.error('Error fetching jobs:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProfile = async () => {
        try {
            const response = await axios.get('/api/profile');
            setProfile(response.data);
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    };

    const handleAddJob = async (e) => {
        e.preventDefault();
        const trimmedLink = newJobLink.trim();
        if (!trimmedLink || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const response = await axios.post('/api/jobs', { apply_link: trimmedLink });
            setJobs([response.data, ...jobs]);
            setNewJobLink('');
        } catch (error) {
            console.error('Error adding job:', error);
            if (error.response?.status === 409) {
                alert(error.response.data.message);
            } else if (error.response?.data?.errors?.apply_link) {
                const errorMessage = error.response.data.errors.apply_link[0];
                if (errorMessage.includes('already been taken')) {
                    alert('This job link has already been added.');
                } else {
                    alert('Invalid URL: ' + errorMessage);
                }
            } else {
                alert('Analysis failed. Please check your internet connection or try again later.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteJob = async (id, e) => {
        e.stopPropagation();
        try {
            await axios.delete(`/api/jobs/${id}`);
            setJobs(jobs.filter(job => job.id !== id));
            if (selectedJob?.id === id) setSelectedJob(null);
        } catch (error) {
            console.error('Error deleting job:', error);
        }
    };

    const handleStatusChange = async (id, status, e) => {
        e.stopPropagation();
        try {
            const response = await axios.patch(`/api/jobs/${id}`, { status });
            setJobs(jobs.map(job => job.id === id ? response.data : job));

            if (status === 'Interview') {
                const job = response.data;
                const confirmAdd = confirm(`Application updated to "Interview"! Would you like to add meeting details (link, time, notes) for ${job.company_name} now?`);
                if (confirmAdd) {
                    // Logic to create a placeholder interview or redirect
                    try {
                        await axios.post('/api/interviews', {
                            job_application_id: job.id,
                            company_name: job.company_name,
                            position: job.position,
                            status: 'Scheduled'
                        });
                        alert('Placeholder interview record created in the Interviews tab. Go there to add your meeting link and notes!');
                    } catch (err) {
                        if (err.response?.status === 409) {
                            alert(err.response.data.message);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error updating status:', error);
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

    const handleGenerateDocs = async (id) => {
        setLoading(true);
        try {
            const response = await axios.post(`/api/jobs/${id}/generate-docs`);
            setJobs(jobs.map(job => job.id === id ? response.data : job));
            setSelectedJob(response.data);
        } catch (error) {
            console.error('Error generating docs:', error);
        } finally {
            setLoading(false);
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

    return (
        <main className="max-w-7xl mx-auto px-6 py-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                {/* Left: Action Panel */}
                <div className="lg:col-span-4 space-y-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/40 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full blur-3xl -mr-10 -mt-10"></div>

                        <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                            <Plus size={24} className="text-blue-600" />
                            Add New Opportunity
                        </h2>

                        <form onSubmit={handleAddJob} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Job Link</label>
                                <textarea
                                    value={newJobLink}
                                    onChange={(e) => setNewJobLink(e.target.value)}
                                    className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all h-36 border-dashed text-sm placeholder:text-slate-400"
                                    placeholder="Paste LinkedIn, Indeed, or any job portal link..."
                                ></textarea>
                            </div>
                            <button
                                disabled={isSubmitting || !newJobLink}
                                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                                {isSubmitting ? 'Analyzing Fit...' : 'Analyze My Fit'}
                            </button>
                        </form>
                    </motion.div>

                    <div className="bg-slate-900 p-8 rounded-[2rem] text-white overflow-hidden relative group">
                        <Sparkles className="absolute top-4 right-4 text-blue-400 opacity-50 group-hover:scale-110 transition-transform" />
                        <h3 className="text-lg font-bold mb-2">Automated tailoring</h3>
                        <p className="text-slate-400 text-sm leading-relaxed mb-6">Our AI will reorder your skills and rewrite your summary to match each specific job description perfectly.</p>
                        <button
                            onClick={() => setIsProfileOpen(true)}
                            className="text-blue-400 text-sm font-bold flex items-center gap-2 group-hover:gap-3 transition-all"
                        >
                            Update User Profile <ChevronRight size={16} />
                        </button>
                    </div>
                </div>

                {/* Right: List Panel */}
                <div className="lg:col-span-8">
                    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden min-h-[600px] flex flex-col">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-end">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 mb-1">Recent Searches</h2>
                                <p className="text-sm text-slate-500">Quickly check your match scores</p>
                            </div>
                            <div className="flex gap-2">
                                <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold text-slate-600">
                                    Total: {jobs.length}
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {loading && jobs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                                    <Loader2 className="animate-spin" size={40} />
                                    <p className="font-medium">Fetching your applications...</p>
                                </div>
                            ) : jobs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 p-12 text-center">
                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                                        <Briefcase size={32} />
                                    </div>
                                    <h3 className="text-slate-900 font-bold mb-1">No applications yet</h3>
                                    <p className="text-sm max-w-xs">Start by pasting a job link in the left panel to see the magic happen.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Position & Company</th>
                                            <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">AI Fit</th>
                                            <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status</th>
                                            <th className="px-8 py-4"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {jobs.map((job) => (
                                            <motion.tr
                                                layout
                                                key={job.id}
                                                onClick={() => setSelectedJob(job)}
                                                className={`group cursor-pointer transition-all ${selectedJob?.id === job.id ? 'bg-blue-50/30' : 'hover:bg-slate-50/80'}`}
                                            >
                                                <td className="px-8 py-7">
                                                    <div className="font-bold text-slate-900 text-lg group-hover:text-blue-600 transition-colors">{job.position}</div>
                                                    <div className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                                                        {job.company_name}
                                                        <a href={job.apply_link} target="_blank" onClick={(e) => e.stopPropagation()} className="p-1 hover:text-blue-500 transition-colors">
                                                            <ExternalLink size={12} />
                                                        </a>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-7">
                                                    <span className={`inline-flex items-center px-4 py-1.5 rounded-full border text-xs font-bold ${getMatchColor(job.match_score)}`}>
                                                        {job.match_score} Match
                                                    </span>
                                                </td>
                                                <td className="px-8 py-7">
                                                    <select
                                                        value={job.status}
                                                        onChange={(e) => handleStatusChange(job.id, e.target.value, e)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="bg-white border border-slate-200 rounded-xl py-2 px-4 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-blue-50 outline-none transition-all cursor-pointer appearance-none shadow-sm"
                                                    >
                                                        <option>Pending</option>
                                                        <option>Interview</option>
                                                        <option>Selected</option>
                                                        <option>Rejected</option>
                                                    </select>
                                                </td>
                                                <td className="px-8 py-7 text-right">
                                                    <button
                                                        onClick={(e) => handleDeleteJob(job.id, e)}
                                                        className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
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
                                            <p className="text-slate-500 font-medium">Full Analysis & Generation</p>
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
                                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col justify-between">
                                            <div>
                                                <div className="text-[10px] font-black text-slate-400 uppercase mb-2">Semantic Match</div>
                                                <div className="text-2xl font-black text-slate-900">
                                                    {(selectedJob.semantic_score !== undefined && selectedJob.semantic_score !== null) ? Math.round(selectedJob.semantic_score * 100) : '--'}%
                                                </div>
                                            </div>
                                            <div className="text-[10px] text-slate-400 italic">Conceptual similarity</div>
                                        </div>
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
                                            <div className="flex gap-4">
                                                {selectedJob.tailored_cv_url && (
                                                    <a href={selectedJob.tailored_cv_url} download className="flex-1 py-4 border-2 border-slate-900 text-slate-900 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
                                                        Download CV
                                                    </a>
                                                )}
                                                {selectedJob.tailored_cover_letter_url && (
                                                    <a href={selectedJob.tailored_cover_letter_url} download className="flex-1 py-4 border-2 border-slate-900 text-slate-900 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
                                                        Download Letter
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </section>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Profile Modal */}
            <ProfileModal
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                onSave={(updatedProfile) => setProfile(updatedProfile)}
            />
        </main>
    );
};

export default Dashboard;
