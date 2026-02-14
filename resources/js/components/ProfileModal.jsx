import React, { useState, useEffect } from 'react';
import { X, Save, Linkedin, Github, FileType, Plus, Trash2, Loader2, Upload, FileCheck, ExternalLink, RefreshCw, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const ProfileModal = ({ isOpen, onClose, onSave }) => {
    const [profile, setProfile] = useState({
        skills: [],
        experience: '',
        linkedin_link: '',
        github_link: '',
    });

    // File states
    const [files, setFiles] = useState({
        cv: null,
        arbeitszeugnis: null,
        certificate: null,
        cover_letter: null,
    });

    const [newSkill, setNewSkill] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isScanning, setIsScanning] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchProfile();
        }
    }, [isOpen]);

    const fetchProfile = async () => {
        try {
            const response = await axios.get('/api/profile');
            setProfile(response.data);
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    };

    const handleFileChange = (e, type) => {
        setFiles({ ...files, [type]: e.target.files[0] });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const formData = new FormData();

            // Append basic fields
            formData.append('experience', profile.experience || '');
            formData.append('linkedin_link', profile.linkedin_link || '');
            formData.append('github_link', profile.github_link || '');
            profile.skills.forEach((skill, index) => {
                formData.append(`skills[${index}]`, skill);
            });

            // Append files
            if (files.cv) formData.append('cv', files.cv);
            if (files.arbeitszeugnis) formData.append('arbeitszeugnis', files.arbeitszeugnis);
            if (files.certificate) formData.append('certificate', files.certificate);
            if (files.cover_letter) formData.append('cover_letter', files.cover_letter);

            const response = await axios.post('/api/profile', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            onSave(response.data);
            setFiles({ cv: null, arbeitszeugnis: null, certificate: null, cover_letter: null });
            onClose();
        } catch (error) {
            console.error('Error saving profile:', error);
            alert('Error saving profile. Please ensure all links are valid and files are under 5MB.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleScan = async () => {
        setIsScanning(true);
        try {
            const response = await axios.post('/api/profile/re-evaluate');
            setProfile(response.data);
            onSave(response.data);
            alert('Profile updated with skills detected from your documents!');
        } catch (error) {
            console.error('Error scanning profile:', error);
            alert('Failed to scan documents. Please try again.');
        } finally {
            setIsScanning(false);
        }
    };

    const addSkill = () => {
        if (newSkill && !profile.skills.includes(newSkill)) {
            setProfile({ ...profile, skills: [...profile.skills, newSkill] });
            setNewSkill('');
        }
    };

    const removeSkill = (skill) => {
        setProfile({ ...profile, skills: profile.skills.filter(s => s !== skill) });
    };

    if (!isOpen) return null;

    const FileUploadRow = ({ label, type, currentUrl, icon: Icon }) => (
        <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 ml-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Icon size={14} className="text-blue-600" /> {label}</span>
                {currentUrl && (
                    <a href={currentUrl} target="_blank" className="text-blue-500 hover:underline flex items-center gap-1">
                        View Current <ExternalLink size={10} />
                    </a>
                )}
            </label>
            <div className="relative group">
                <input
                    type="file"
                    onChange={(e) => handleFileChange(e, type)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    accept=".pdf,.doc,.docx,.jpg,.png"
                />
                <div className={`w-full p-3.5 rounded-2xl border-2 border-dashed transition-all flex items-center justify-between ${files[type] ? 'border-blue-400 bg-blue-50/30' : 'border-slate-200 bg-slate-50 group-hover:border-slate-300'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${files[type] ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 border border-slate-100'}`}>
                            {files[type] ? <FileCheck size={16} /> : <Upload size={16} />}
                        </div>
                        <span className={`text-sm ${files[type] ? 'text-blue-700 font-bold' : 'text-slate-400'}`}>
                            {files[type] ? files[type].name : `Upload ${label}...`}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
                />

                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900">Career Documents</h2>
                            <p className="text-slate-500 font-medium text-sm">Upload your certificates and CV for AI context</p>
                            <button
                                onClick={handleScan}
                                disabled={isScanning}
                                className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-black hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50"
                            >
                                {isScanning ? <RefreshCw className="animate-spin" size={12} /> : <Sparkles size={12} />}
                                Scan Documents for Skills
                            </button>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-900">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="p-8 space-y-8 overflow-y-auto">
                        {/* Documents Section */}
                        <section className="space-y-6">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Essential Files</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FileUploadRow label="CV (Curriculum Vitae)" type="cv" currentUrl={profile.cv_url} icon={FileType} />
                                <FileUploadRow label="Cover Letter (Current)" type="cover_letter" currentUrl={profile.cover_letter_url} icon={FileType} />
                                <FileUploadRow label="Arbeitszeugnis" type="arbeitszeugnis" currentUrl={profile.arbeitszeugnis_url} icon={FileCheck} />
                                <FileUploadRow label="Certificates" type="certificate" currentUrl={profile.certificate_url} icon={FileCheck} />
                            </div>
                        </section>

                        {/* Online Presence */}
                        <section className="space-y-4 pt-4 border-t border-slate-50">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">Online Presence</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 ml-1 flex items-center gap-1.5"><Linkedin size={14} className="text-blue-600" /> LinkedIn</label>
                                    <input
                                        type="url"
                                        value={profile.linkedin_link || ''}
                                        onChange={(e) => setProfile({ ...profile, linkedin_link: e.target.value })}
                                        className="w-full p-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all text-sm"
                                        placeholder="https://linkedin.com/in/username"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 ml-1 flex items-center gap-1.5"><Github size={14} className="text-slate-900" /> GitHub</label>
                                    <input
                                        type="url"
                                        value={profile.github_link || ''}
                                        onChange={(e) => setProfile({ ...profile, github_link: e.target.value })}
                                        className="w-full p-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all text-sm"
                                        placeholder="https://github.com/username"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Text Details */}
                        <section className="space-y-4 pt-4 border-t border-slate-50">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Professional Summary</h3>
                            <div className="space-y-1.5">
                                <textarea
                                    value={profile.experience || ''}
                                    onChange={(e) => setProfile({ ...profile, experience: e.target.value })}
                                    className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all h-32 text-sm resize-none"
                                    placeholder="Summarize your work experience..."
                                ></textarea>
                            </div>
                            <div className="space-y-4">
                                <label className="text-xs font-bold text-slate-600 ml-1 block">Skills & Expertise</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newSkill}
                                        onChange={(e) => setNewSkill(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                                        className="flex-1 p-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all text-sm"
                                        placeholder="Add a skill (e.g. React)"
                                    />
                                    <button onClick={addSkill} className="px-5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors">
                                        <Plus size={20} />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {profile.skills?.map((skill, i) => (
                                        <motion.span key={i} layout className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200">
                                            {skill}
                                            <button onClick={() => removeSkill(skill)} className="hover:text-rose-500 transition-colors"><X size={12} /></button>
                                        </motion.span>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Footer */}
                    <div className="p-8 border-t border-slate-100 bg-white sticky bottom-0 z-10 flex gap-4">
                        <button onClick={onClose} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all">Cancel</button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            Save Career Documents
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ProfileModal;
