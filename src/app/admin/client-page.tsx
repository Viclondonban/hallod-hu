"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import PodcastManager from './podcast-manager';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types
type PodcastOption = { id: string; title: string; category: string | null };
type DbCategory = { id: string; name: string; sortOrder: number };
type Props = { podcasts: PodcastOption[]; dbCategories: DbCategory[] };
type BulkRow = { rssUrl: string; category: string; status?: string; isError?: boolean };

export default function AdminClientPage({ podcasts, dbCategories }: Props) {
  const categoryNames = dbCategories.map(c => c.name);
  const defaultCategory = categoryNames.length > 0 ? categoryNames[0] : 'Egyéb';

  // --- STATES ---
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([{ rssUrl: '', category: defaultCategory }]);
  const [isBulkIngesting, setIsBulkIngesting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  
  const [editPodcastId, setEditPodcastId] = useState(podcasts.length > 0 ? podcasts[0].id : '');
  const [editCategory, setEditCategory] = useState(defaultCategory);
  const [editStatus, setEditStatus] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });
  const [isEditing, setIsEditing] = useState(false);
  
  const [selectedPodcastId, setSelectedPodcastId] = useState(podcasts.length > 0 ? podcasts[0].id : '');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerStatus, setBannerStatus] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });
  const [isUpdatingBanner, setIsUpdatingBanner] = useState(false);
  
  const [orderedCategories, setOrderedCategories] = useState<DbCategory[]>(dbCategories);
  const [orderStatus, setOrderStatus] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillStatus, setBackfillStatus] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });

  // --- EFFECTS ---
  useEffect(() => {
    if (podcasts.length > 0) {
        if (!selectedPodcastId) setSelectedPodcastId(podcasts[0].id);
        if (!editPodcastId) setEditPodcastId(podcasts[0].id);
    }
  }, [podcasts, selectedPodcastId, editPodcastId]);

  useEffect(() => {
    const selected = podcasts.find(p => p.id === editPodcastId);
    if (selected) setEditCategory(selected.category || defaultCategory);
  }, [editPodcastId, podcasts, defaultCategory]);

  useEffect(() => { 
    setOrderedCategories(dbCategories); 
  }, [dbCategories]);

  // --- HANDLERS ---
  const addRow = () => setBulkRows([...bulkRows, { rssUrl: '', category: defaultCategory }]);
  
  const updateRowState = (index: number, updates: Partial<BulkRow>) => {
    setBulkRows(prev => {
      const newRows = [...prev];
      newRows[index] = { ...newRows[index], ...updates };
      return newRows;
    });
  };

  async function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault(); 
    const rows = bulkRows.filter(r => r.rssUrl && r.rssUrl.startsWith('http'));
    if (rows.length === 0) { alert("Add a valid RSS URL."); return; }
    
    setIsBulkIngesting(true); 
    setBulkProgress({ current: 0, total: rows.length });
    
    for (let i = 0; i < rows.length; i++) {
        const idx = bulkRows.findIndex(r => r === rows[i]); 
        updateRowState(idx, { status: 'Processing...', isError: false });
        setBulkProgress({ current: i + 1, total: rows.length });
        
        try { 
            const res = await fetch('/api/ingest', { 
              method: 'POST', 
              headers: { 'Content-Type': 'application/json' }, 
              body: JSON.stringify({ url: rows[i].rssUrl, category: rows[i].category }) 
            });
            const data = await res.json();
            
            if (res.ok) { 
              updateRowState(idx, { status: `✅ Success: ${data.podcast?.title}`, isError: false });
            } else { 
              updateRowState(idx, { status: `❌ Error: ${data.error}`, isError: true });
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            updateRowState(idx, { status: `❌ Error: ${msg}`, isError: true });
        }
    } 
    setIsBulkIngesting(false);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault(); 
    setEditStatus({ message: '', type: '' }); 
    setIsEditing(true);
    try { 
        const res = await fetch('/api/update-category', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ podcastId: editPodcastId, newCategory: editCategory }) 
        });
        const data = await res.json(); 
        if (res.ok) setEditStatus({ message: data.message, type: 'success' }); 
        else setEditStatus({ message: `Error: ${data.error}`, type: 'error' });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setEditStatus({ message: `Error: ${msg}`, type: 'error' });
    } finally {
        setIsEditing(false);
    }
  }

  async function handleBannerSubmit(e: React.FormEvent) {
    e.preventDefault(); 
    setBannerStatus({ message: '', type: '' }); 
    setIsUpdatingBanner(true);
    try { 
      const fileExt = bannerFile!.name.split('.').pop(); 
      const filePath = `${Date.now()}.${fileExt}`;
      const { error: upErr } = await supabase.storage.from('banners').upload(filePath, bannerFile!); 
      if (upErr) throw new Error(upErr.message);
      
      const { data: { publicUrl } } = supabase.storage.from('banners').getPublicUrl(filePath);
      const res = await fetch('/api/update-banner', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ podcastId: selectedPodcastId, bannerUrl: publicUrl }) 
      });
      const data = await res.json(); 
      
      if (res.ok) { 
        setBannerStatus({ message: 'Success!', type: 'success' }); 
        setBannerFile(null); 
        (document.getElementById('bannerFile') as HTMLInputElement).value = ''; 
      } else {
        setBannerStatus({ message: data.error, type: 'error' });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setBannerStatus({ message: msg, type: 'error' });
    } finally {
      setIsUpdatingBanner(false);
    }
  }

  // --- Category Handlers ---
  const handleAddCategory = () => {
    const newName = window.prompt("Új kategória neve (New category name):");
    if (newName && newName.trim() !== "") {
      const newCat: DbCategory = {
        id: `temp_${Date.now()}`, // Temp ID until saved to DB
        name: newName.trim(),
        sortOrder: orderedCategories.length * 10
      };
      setOrderedCategories([...orderedCategories, newCat]);
      setOrderStatus({ message: 'Új kategória hozzáadva! Ne felejts el menteni (Save All).', type: 'success' });
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newList = [...orderedCategories];
    [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
    setOrderedCategories(newList); 
    setOrderStatus({message: 'Order changed. Don\'t forget to save!', type: ''});
  };
  
  const moveDown = (index: number) => {
    if (index === orderedCategories.length - 1) return;
    const newList = [...orderedCategories];
    [newList[index + 1], newList[index]] = [newList[index], newList[index + 1]];
    setOrderedCategories(newList); 
    setOrderStatus({message: 'Order changed. Don\'t forget to save!', type: ''});
  };
  
  async function handleSaveOrder() {
    setIsSavingOrder(true); 
    setOrderStatus({ message: 'Saving order...', type: '' });
    const payload = orderedCategories.map((cat, index) => ({ 
      id: cat.id.startsWith('temp_') ? undefined : cat.id, // Let the backend know if it's new
      name: cat.name,
      sortOrder: index * 10 
    }));

    try {
        const res = await fetch('/api/update-category-order', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ orderedCategories: payload }) 
        });
        if (res.ok) setOrderStatus({ message: 'Category order saved successfully!', type: 'success' });
        else setOrderStatus({ message: 'Failed to save order.', type: 'error' });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setOrderStatus({ message: msg, type: 'error' });
    } finally {
        setIsSavingOrder(false);
    }
  }

  async function handleBackfillImages() {
    if (!window.confirm('This will re-fetch all RSS feeds and fill in missing episode cover art and durations. It may take a minute. Continue?')) return;
    setIsBackfilling(true);
    setBackfillStatus({ message: '', type: '' });
    try {
      const res = await fetch('/api/admin/backfill-images', { method: 'POST' });
      const data = await res.json();
      if (res.ok) setBackfillStatus({ message: data.message, type: 'success' });
      else setBackfillStatus({ message: data.error || 'Failed', type: 'error' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setBackfillStatus({ message: msg, type: 'error' });
    } finally {
      setIsBackfilling(false);
    }
  }

  // --- JSX ---
  return (
    <main className="min-h-screen p-8 bg-gray-50 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
             <h1 className="text-3xl font-bold">Admin Dashboard</h1>
             <Link href="/" className="text-blue-600 font-medium hover:text-blue-800 transition-colors">← Back to Homepage</Link>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-8">
              {/* FORM 1: BULK INGEST */}
              <div className="bg-white p-6 rounded-lg shadow-md h-fit">
                <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-200 flex justify-between items-center"> 
                  <span>1. Bulk Ingest</span> 
                  {isBulkIngesting && <span className="text-sm font-medium text-blue-600 animate-pulse">Processing {bulkProgress.current}/{bulkProgress.total}...</span>} 
                </h2>
                <form onSubmit={handleBulkSubmit} className="space-y-4">
                    <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                        {bulkRows.map((row, index) => (
                            <div key={index} className={`flex gap-3 items-center p-3 rounded-md border shadow-sm transition-colors ${row.isError ? 'border-red-200 bg-red-50' : row.status?.includes('Success') ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                                <span className="text-gray-500 font-medium text-sm w-6">{index + 1}.</span>
                                <input 
                                  type="url" 
                                  value={row.rssUrl} 
                                  onChange={(e) => updateRowState(index, { rssUrl: e.target.value, status: undefined, isError: undefined })} 
                                  placeholder="https://example.com/feed.rss" 
                                  className="flex-grow p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                                  disabled={isBulkIngesting} 
                                  required={index===0} 
                                />
                                <select 
                                  value={row.category} 
                                  onChange={(e) => updateRowState(index, { category: e.target.value, status: undefined, isError: undefined })} 
                                  className="w-48 p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer" 
                                  disabled={isBulkIngesting}
                                > 
                                  {categoryNames.map(c=><option key={c} value={c}>{c}</option>)} 
                                </select>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-4 pt-2">
                      <button type="button" onClick={addRow} disabled={isBulkIngesting} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                        + Add Row
                      </button>
                      <button type="submit" disabled={isBulkIngesting} className="flex-grow px-4 py-2 bg-blue-600 text-white font-medium rounded-md shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {isBulkIngesting ? 'Ingesting...' : 'Ingest All Feeds'}
                      </button>
                    </div>
                </form>
              </div>

              {/* FORM 3: EDIT CATEGORY */}
              <div className="bg-white p-6 rounded-lg shadow-md h-fit">
                <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-200">3. Edit Category</h2>
                <form onSubmit={handleEditSubmit} className="space-y-4">
                   <div className="grid sm:grid-cols-2 gap-4">
                     <select value={editPodcastId} onChange={(e)=>setEditPodcastId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer" disabled={isEditing}>
                       {podcasts.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}
                     </select>
                     <select value={editCategory} onChange={(e)=>setEditCategory(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer" disabled={isEditing}>
                       {categoryNames.map(c=><option key={c} value={c}>{c}</option>)}
                     </select>
                   </div>
                  <button type="submit" disabled={isEditing} className="w-full py-2 bg-blue-600 text-white font-medium rounded-md shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {isEditing ? 'Updating...' : 'Update Category'}
                  </button>
                </form>
                 {editStatus.message && (
                   <div className={`mt-4 p-3 rounded-md text-sm font-medium ${editStatus.type==='error'?'bg-red-50 text-red-700':'bg-green-50 text-green-700'}`}>
                     {editStatus.message}
                   </div>
                 )}
              </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-1 space-y-8">
              {/* FORM 2: BANNER */}
              <div className="bg-white p-6 rounded-lg shadow-md h-fit">
                <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-200">2. Manage Banner</h2>
                <form onSubmit={handleBannerSubmit} className="space-y-4">
                   <select value={selectedPodcastId} onChange={(e)=>setSelectedPodcastId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer" disabled={isUpdatingBanner}>
                     {podcasts.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}
                   </select>
                   <input type="file" id="bannerFile" accept="image/png, image/jpeg" onChange={(e)=>setBannerFile(e.target.files?e.target.files[0]:null)} className="w-full p-2 border border-gray-300 rounded-md text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" disabled={isUpdatingBanner} />
                   <button type="submit" disabled={isUpdatingBanner||!bannerFile} className="w-full py-2 bg-blue-600 text-white font-medium rounded-md shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                     {isUpdatingBanner ? 'Uploading...' : 'Save Banner'}
                   </button>
                </form>
                 {bannerStatus.message && (
                   <div className={`mt-4 p-3 rounded-md text-sm font-medium ${bannerStatus.type==='error'?'bg-red-50 text-red-700':'bg-green-50 text-green-700'}`}>
                     {bannerStatus.message}
                   </div>
                 )}
              </div>

              {/* FORM 4: MANAGE CATEGORY ORDER */}
              <div className="bg-white p-6 rounded-lg shadow-md h-fit">
                <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-200 flex justify-between items-center">
                    <span>4. Categories</span>
                    <div className="flex gap-2">
                      <button type="button" onClick={handleAddCategory} className="px-3 py-1.5 text-xs font-semibold bg-green-600 text-white rounded-md shadow-sm hover:bg-green-700 transition-colors">
                        + Add
                      </button>
                      <button onClick={handleSaveOrder} disabled={isSavingOrder} className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50">
                        {isSavingOrder ? 'Saving...' : 'Save All'}
                      </button>
                    </div>
                </h2>
                <p className="text-gray-500 mb-4 text-sm">Add, rename, delete, or use arrows to reorder.</p>
                
                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                    {orderedCategories.map((cat, index) => (
                        <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200 shadow-sm">
                            <span className="font-medium text-gray-700 text-sm">{cat.name}</span>
                            <div className="flex gap-1.5">
                                <button type="button" onClick={()=>moveUp(index)} disabled={index===0 || isSavingOrder} className="p-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-gray-600">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                                </button>
                                <button type="button" onClick={()=>moveDown(index)} disabled={index===orderedCategories.length-1 || isSavingOrder} className="p-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-gray-600">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                {orderStatus.message && (
                  <div className={`mt-4 p-3 rounded-md text-sm font-medium ${orderStatus.type==='error'?'bg-red-50 text-red-700':orderStatus.type==='success'?'bg-green-50 text-green-700':'bg-blue-50 text-blue-700'}`}>
                    {orderStatus.message}
                  </div>
                )}
              </div>

              {/* BACKFILL IMAGES */}
              <div className="bg-white p-6 rounded-lg shadow-md h-fit">
                <h2 className="text-xl font-semibold mb-2 pb-2 border-b border-gray-200">5. Backfill Cover Art</h2>
                <p className="text-gray-500 text-sm mb-4">Re-fetches all RSS feeds to fill in missing episode cover art and durations for existing episodes.</p>
                <button
                  onClick={handleBackfillImages}
                  disabled={isBackfilling}
                  className="w-full py-2 bg-purple-600 text-white font-medium rounded-md shadow-sm hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBackfilling ? 'Backfilling... (may take a minute)' : 'Run Backfill'}
                </button>
                {backfillStatus.message && (
                  <div className={`mt-4 p-3 rounded-md text-sm font-medium ${backfillStatus.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    {backfillStatus.message}
                  </div>
                )}
              </div>

          </div>
        </div>

        {/* ==================================================== */}
        {/* NEW FEATURE: PODCAST MANAGER (HIDE/UNHIDE)           */}
        {/* ==================================================== */}
        <div className="mt-8">
          <PodcastManager />
        </div>

      </div>
    </main>
  );
}