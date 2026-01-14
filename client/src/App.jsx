import React, { useState, useEffect } from 'react';
import { Plus, Trash2, PauseCircle, PlayCircle, AlertCircle, X } from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/clerk-react";
import { getSubs, addSub, toggleSub, deleteSub } from './api'; 

const TEMPLATES = [
  { name: 'Netflix', cost: 15.49, category: 'Entertainment' },
  { name: 'Spotify', cost: 11.99, category: 'Music' },
  { name: 'ChatGPT Plus', cost: 20.00, category: 'Productivity' },
  { name: 'Amazon Prime', cost: 14.99, category: 'Shopping' },
  { name: 'YouTube Premium', cost: 13.99, category: 'Entertainment' },
];

const App = () => {
  const { user } = useUser(); // GET REAL USER INFO
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', cost: '', date: '', category: 'General' });

  // Load data ONLY when user is logged in
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Pass the REAL Clerk ID to the API
      const data = await getSubs(user.id);
      setSubs(data);
    } catch (err) {
      console.error("Backend Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.cost) return;

    // Optimistic Update
    const tempId = Date.now();
    const optimisticSub = { ...formData, id: tempId, cost: Number(formData.cost), active: true };
    setSubs([...subs, optimisticSub]); 
    setIsFormOpen(false);

    try {
      // PASS REAL ID AND EMAIL
      await addSub(formData, user.id, user.primaryEmailAddress.emailAddress);
      fetchData(); 
      setFormData({ name: '', cost: '', date: '', category: 'General' });
    } catch (err) {
      alert("Failed to save.");
      fetchData();
    }
  };

  // Toggle/Delete/Template/TestEmail handlers remain the same...
  const handleToggle = async (id) => {
    setSubs(subs.map(s => s.id === id ? { ...s, active: !s.active } : s));
    await toggleSub(id);
  };

  const handleDelete = async (id) => {
    setSubs(subs.filter(s => s.id !== id));
    await deleteSub(id);
  };

  const applyTemplate = (t) => {
    setFormData({ ...formData, name: t.name, cost: t.cost, category: t.category });
  };

  const handleTestEmail = async () => {
    try {
      alert(`Sending to ${user.primaryEmailAddress.emailAddress}...`);
      await sendTestEmail(user.primaryEmailAddress.emailAddress);
    } catch (err) {
      alert("Error sending email.");
    }
  };

  // Calculations
  const totalMonthly = subs.filter(s => s.active).reduce((acc, curr) => acc + Number(curr.cost), 0);
  const potentialSavings = subs.filter(s => !s.active).reduce((acc, curr) => acc + Number(curr.cost), 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-['Plus_Jakarta_Sans'] p-6 pb-32">
      
      {/* 1. LOGIN PAGE (Shown if user is NOT logged in) */}
      <SignedOut>
        <div className="flex flex-col items-center justify-center h-[80vh] text-center">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Audit.</h1>
          <p className="text-slate-500 mb-8 max-w-xs">Stop losing money to forgotten subscriptions. Track, Pause, and Save.</p>
          <SignInButton mode="modal">
             <button className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:scale-105 transition-transform">
               Get Started (Free)
             </button>
          </SignInButton>
        </div>
      </SignedOut>

      {/* 2. DASHBOARD (Shown if user IS logged in) */}
      <SignedIn>
        <header className="max-w-md mx-auto mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Audit.</h1>
            <p className="text-slate-500 font-medium text-sm">Welcome back, {user?.firstName}</p>
          </div>
          {/* Clerk's Profile Button */}
          <UserButton afterSignOutUrl="/" />
        </header>

        {/* ... (THE REST OF YOUR DASHBOARD JSX GOES HERE - CARDS, LISTS, ETC) ... */}
        {/* Paste your Dashboard Card, List, and FAB code here exactly as it was before */}
        
        {/* DASHBOARD CARD */}
        <div className="max-w-md mx-auto bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl shadow-xl shadow-indigo-200 p-8 text-white mb-8 relative overflow-hidden">
           <div className="relative z-10">
             <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-indigo-100 font-medium text-xs uppercase tracking-wider">Monthly Burn</span>
                </div>
                <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold">{subs.filter(s => s.active).length} Active</span>
             </div>
             <div className="text-5xl font-extrabold tracking-tight mb-2">${totalMonthly.toFixed(2)}</div>
             {potentialSavings > 0 ? (
               <div className="inline-flex items-center gap-2 bg-rose-500/20 border border-rose-400/30 rounded-lg px-3 py-2 text-sm text-rose-100">
                 <AlertCircle size={14} /> <span>Paused: <strong>${potentialSavings.toFixed(2)}</strong>/mo</span>
               </div>
             ) : <div className="text-indigo-200 text-xs font-medium opacity-80">All systems go.</div>}
           </div>
        </div>

        {/* LIST */}
        <div className="max-w-md mx-auto space-y-3">
           {subs.map((sub) => (
             <div key={sub.id} className={`flex items-center justify-between p-5 rounded-2xl border ${sub.active ? 'bg-white shadow-sm' : 'bg-slate-100 opacity-60'}`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-500">{sub.name.charAt(0)}</div>
                  <div><h3 className="font-bold">{sub.name}</h3><p className="text-xs text-slate-500">{sub.renewalDate}</p></div>
                </div>
                <div className="text-right">
                  <div className="font-bold">${sub.cost}</div>
                  <div className="flex justify-end gap-2 mt-1">
                    <button onClick={() => handleToggle(sub.id)} className="text-slate-400 hover:text-indigo-600">{sub.active ? <PauseCircle size={18}/> : <PlayCircle size={18}/>}</button>
                    <button onClick={() => handleDelete(sub.id)} className="text-slate-400 hover:text-rose-500"><Trash2 size={18}/></button>
                  </div>
                </div>
             </div>
           ))}
        </div>

        {/* FAB */}
        <button onClick={() => setIsFormOpen(true)} className="fixed bottom-24 right-6 bg-slate-900 text-white p-4 rounded-2xl shadow-xl z-30"><Plus size={24}/></button>

        {/* MODAL (Keep your existing Modal code here) */}
        {isFormOpen && (
             <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
                <div className="bg-white w-full max-w-md rounded-3xl p-6">
                    <div className="flex justify-between mb-4"><h2 className="font-bold">Add Sub</h2><button onClick={()=>setIsFormOpen(false)}><X/></button></div>
                    <div className="flex gap-2 mb-4 overflow-x-auto">{TEMPLATES.map(t => <button key={t.name} onClick={()=>applyTemplate(t)} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">{t.name}</button>)}</div>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <input placeholder="Name" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl border" required />
                        <div className="flex gap-2">
                             <input type="number" step="0.01" placeholder="Cost" value={formData.cost} onChange={e=>setFormData({...formData, cost: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl border" required />
                             <input type="date" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl border" required />
                        </div>
                        <button className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold">Save</button>
                    </form>
                </div>
             </div>
        )}
      </SignedIn>
    </div>
  );
};

export default App;