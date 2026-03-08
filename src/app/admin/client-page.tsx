"use client";

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Update types
type PodcastOption = { id: string; title: string; category: string | null };
type DbCategory = { id: string; name: string; sortOrder: number };
// Make dbCategories optional with a default so it NEVER crashes
type Props = { podcasts: PodcastOption[], dbCategories?: DbCategory[] }; 
type BulkRow = { rssUrl: string; category: string; status?: string; isError?: boolean };

// Fallback categories just in case the DB is completely empty on first load
const FALLBACK_CATEGORIES = [
  "Hírek & Politika", "Technológia", "Kultúra & Művészet", "Üzlet & Karrier",
  "Sport", "Életmód & Egészség", "Humor", "Történelem", "True Crime", "Egyéb"
];

export default function AdminClientPage({ podcasts = [], dbCategories = [] }: Props) {
  // ==========================================
  // State: Category Management (Form 4)
  // ==========================================
  // Safely initialize with dbCategories, or an empty array
  const [orderedCategories, setOrderedCategories] = useState<DbCategory[]>(dbCategories || []);
  const [orderStatus, setOrderStatus] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Derive simple names array for the dropdowns in Form 1 & 3
  const categoryNames = useMemo(() => {
    return orderedCategories.length > 0 
      ? orderedCategories.map(c => c.name) 
      : FALLBACK_CATEGORIES;
  }, [orderedCategories]);

  // ==========================================
  // State: Banner Form (Right Side)
  // ==========================================
  const [selectedPodcastId, setSelectedPodcastId] = useState(podcasts.length > 0 ? podcasts[0].id : '');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerStatus, setBannerStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' | '' }>({ message: '', type: '' });
  const [isUpdatingBanner, setIsUpdatingBanner] = useState(false);

  // ==========================================
  // State: Bulk Ingest Form (Left Side - Top)
  // ==========================================
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([{ rssUrl: '', category: categoryNames[0] }]);
  const [isBulkIngesting, setIsBulkIngesting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

  // ==========================================
  // State: Edit Category Form (Left Side - Bottom)
  // ==========================================
  const [editPodcastId, setEditPodcastId] = useState(podcasts.length > 0 ? podcasts[0].id : '');
  const [editCategory, setEditCategory] = useState(podcasts.length > 0 ? (podcasts[0].category || categoryNames[0]) : categoryNames[0]);
  const [editStatus, setEditStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' | '' }>({ message: '', type: '' });
  const [isEditing, setIsEditing] = useState(false);

  // Sync state if server props change
  useEffect(() => { 
    if (dbCategories) setOrderedCategories(dbCategories); 
  }, [dbCategories]);

  // Update selected podcast IDs if the list changes
  useEffect(() => {
    if (podcasts.length > 0) {
        if (!selectedPodcastId) setSelectedPodcastId(podcasts[0].id);
        if (!editPodcastId) setEditPodcastId(podcasts[0].id);
    }
  }, [podcasts, selectedPodcastId, editPodcastId]);

  // When editPodcastId changes, update the editCategory to match
  useEffect(() => {
    const selected = podcasts.find(p => p.id === editPodcastId);
    if (selected) {
      setEditCategory(selected.category || categoryNames[0]);
    }
  }, [editPodcastId, podcasts, categoryNames]);

  // ==========================================
  // Form 4 Handlers: Categories
  // ==========================================
  const addCategory = () => {
    const newName = prompt("Enter new category name:");
    if (!newName) return;
    const newCat: DbCategory = { id: crypto.randomUUID(), name: newName, sortOrder: orderedCategories.length * 10 };
    setOrderedCategories([...orderedCategories, newCat]);
    setOrderStatus({message: 'Added locally. Save to confirm.', type: ''});
  };

  const removeCategory = (id: string) => {
    if (!confirm("Remove this category? (Podcasts will keep the label until updated)")) return;
    setOrderedCategories(orderedCategories.filter(c => c.id !== id));
    setOrderStatus({message: 'Removed locally. Save to confirm.', type: ''});
  };

  const renameCategory = (id: string) => {
    const cat = orderedCategories.find(c => c.id === id);
    const newName = prompt("Rename category:", cat?.name);
    if (!newName || newName === cat?.name) return;
    setOrderedCategories(orderedCategories.map(c => c.id === id ? { ...c, name: newName } : c));
    setOrderStatus({message: 'Renamed locally. Save to confirm.', type: ''});
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newList = [...orderedCategories];
    [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
    setOrderedCategories(newList); setOrderStatus({message: 'Order changed. Save to confirm.', type: ''});
  };

  const moveDown = (index: number) => {
    if (index === orderedCategories.length - 1) return;
    const newList = [...orderedCategories];
    [newList[index + 1], newList[index]] = [newList[index], newList[index + 1]];
    setOrderedCategories(newList); setOrderStatus({message: 'Order changed. Save to confirm.', type: ''});
  };

  async function handleSaveOrder() {
    setIsSavingOrder(true); setOrderStatus({ message: 'Saving categories...', type: '' });
    const payload = orderedCategories.map((cat, index) => ({ id: cat.id, name: cat.name, sortOrder: index * 10 }));
    try {
        const res = await fetch('/api/update-category-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderedCategories: payload }) });
        if (res.ok) setOrderStatus({ message: 'Categories saved successfully!', type: 'success' });
        else setOrderStatus({ message: 'Failed to save categories.', type: 'error' });
    } catch (err) { setOrderStatus({ message: (err as Error).message, type: 'error' }); } finally { setIsSavingOrder(false); }
  }

  // ==========================================
  // Bulk Form Helpers
  // ==========================================
  const addRow = () => setBulkRows([...bulkRows, { rssUrl: '', category: categoryNames[0] }]);
  const updateRow = (index: number, field: keyof BulkRow, value: string) => {
    const newRows = [...bulkRows];
    // @ts-ignore
    newRows[index][field] = value; newRows[index].status = undefined; newRows[index].isError = undefined;
    setBulkRows(newRows);
  };

  // ==========================================
  // Form 1 Handler: Bulk Ingest
  // ==========================================
  async function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault();
    const rowsToProcess = bulkRows.filter(row => row.rssUrl && row.rssUrl.startsWith('http'));
    if (rowsToProcess.length === 0) { alert("Please add at least one valid RSS URL."); return; }

    setIsBulkIngesting(true); setBulkProgress({ current: 0, total: rowsToProcess.length });

    for (let i = 0; i < rowsToProcess.length; i++) {
        const currentRow = rowsToProcess[i];
        const rowIndexInMainState = bulkRows.findIndex(r => r === currentRow);
        updateRow(rowIndexInMainState, 'status', 'Processing...'); setBulkProgress({ current: i + 1, total: rowsToProcess.length });
        try {
            const response = await fetch('/api/ingest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: currentRow.rssUrl, category: currentRow.category }), });
            const data = await response.json();
            if (response.ok) { updateRow(rowIndexInMainState, 'status', `✅ Success: ${data.podcast?.title}`); const newRows = [...bulkRows]; newRows[rowIndexInMainState].isError = false; setBulkRows(newRows) }
            else { updateRow(rowIndexInMainState, 'status', `❌ Error: ${data.error}`); const newRows = [...bulkRows]; newRows[rowIndexInMainState].isError = true; setBulkRows(newRows) }
        } catch (error) { updateRow(rowIndexInMainState, 'status', `❌ Network Error: ${(error as Error).message}`); const newRows = [...bulkRows]; newRows[rowIndexInMainState].isError = true; setBulkRows(newRows) }
    }
    setIsBulkIngesting(false);
  }

  // ==========================================
  // Form 3 Handler: Edit Category
  // ==========================================
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEditStatus({ message: '', type: '' });
    if (!editPodcastId) { setEditStatus({ message: 'Please select a podcast.', type: 'error' }); return; }
    
    setIsEditing(true);
    setEditStatus({ message: 'Updating category...', type: 'info' });

    try {
      const response = await fetch('/api/update-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ podcastId: editPodcastId, newCategory: editCategory }),
      });
      const data = await response.json();
      if (response.ok) {
        setEditStatus({ message: data.message, type: 'success' });
      } else {
        setEditStatus({ message: `Error: ${data.error}`, type: 'error' });
      }
    } catch (error) {
      setEditStatus({ message: `Error: ${(error as Error).message}`, type: 'error' });
    } finally {
      setIsEditing(false);
    }
  }

  // ==========================================
  // Form 2 Handler: Update Banner
  // ==========================================
  async function handleBannerSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBannerStatus({ message: '', type: '' });
    if (!bannerFile || !selectedPodcastId) { setBannerStatus({ message: 'Please select a file and a podcast.', type: 'error' }); return; }
    setIsUpdatingBanner(true); setBannerStatus({ message: 'Uploading banner image...', type: 'info' });
    try {
      const fileExt = bannerFile.name.split('.').pop(); const fileName = `${Date.now()}.${fileExt}`; const filePath = `${fileName}`;
      const { error: uploadError } = await supabase.storage.from('banners').upload(filePath, bannerFile);
      if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
      const { data: { publicUrl } } = supabase.storage.from('banners').getPublicUrl(filePath);
      
      setBannerStatus({ message: 'Updating database...', type: 'info' });
      const response = await fetch('/api/update-banner', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ podcastId: selectedPodcastId, bannerUrl: publicUrl }), });
      const data = await response.json();
      if (response.ok) { setBannerStatus({ message: `Success! Banner updated for '${data.podcast?.title}'.`, type: 'success' }); setBannerFile(null); (document.getElementById('bannerFile') as HTMLInputElement).value = ''; }
      else { setBannerStatus({ message: `Error: ${data.error}`, type: 'error' }); }
    } catch (error) { setBannerStatus({ message: `Error: ${(error as Error).message}`, type: 'error' }); } finally { setIsUpdatingBanner(false); }
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
             <h1 className="text-3xl font-bold">Admin Dashboard</h1>
             <Link href="/" className="text-blue-600 hover:underline">← Back to Homepage</Link>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* LEFT COLUMN (2/3 width) */}
          <div className="lg:col-span-2 space-y-8">
              {/* ========================== */}
              {/* FORM 1: BULK INGEST        */}
              {/* ========================== */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
                <h2 className="text-xl font-semibold mb-4 pb-2 border-b flex justify-between items-center">
                    <span>1. Bulk Ingest Podcasts</span>
                    {isBulkIngesting && ( <span className="text-sm font-normal text-blue-600 animate-pulse"> Processing {bulkProgress.current} of {bulkProgress.total}... </span> )}
                </h2>
                <p className="text-gray-500 mb-6 text-sm">Add multiple feeds at once. Processed sequentially.</p>
                <form onSubmit={handleBulkSubmit} className="space-y-4">
                    <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                        {bulkRows.map((row, index) => (
                            <div key={index} className={`flex flex-col sm:flex-row gap-3 items-start sm:items-center p-3 rounded-md border ${row.isError ? 'border-red-300 bg-red-50' : row.status?.includes('Success') ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                                <div className="sm:w-8 flex-shrink-0 flex items-center justify-center h-10"> <span className="text-gray-400 font-medium text-sm">{index + 1}.</span> </div>
                                <div className="flex-grow grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                                    <div className="sm:col-span-2"> <input type="url" value={row.rssUrl} onChange={(e) => updateRow(index, 'rssUrl', e.target.value)} placeholder="https://..." className="w-full p-2 text-sm border border-gray-300 rounded-md" disabled={isBulkIngesting || (!!row.status && row.status.includes('Success'))} required={index === 0} /> </div>
                                    <div> 
                                      {/* DROPDOWN UPDATED TO USE DYNAMIC categoryNames */}
                                      <select value={row.category} onChange={(e) => updateRow(index, 'category', e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded-md" disabled={isBulkIngesting || (!!row.status && row.status.includes('Success'))}> 
                                        {categoryNames.map((cat) => <option key={cat} value={cat}>{cat}</option>)} 
                                      </select> 
                                    </div>
                                </div>
                                {row.status && ( <div className={`text-xs sm:w-48 truncate pl-2 ${row.isError ? 'text-red-600' : row.status.includes('Success') ? 'text-green-600' : 'text-blue-600'}`}> {row.status} </div> )}
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-4 pt-4 border-t">
                        <button type="button" onClick={addRow} disabled={isBulkIngesting} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"> + Add Row </button>
                        <button type="submit" disabled={isBulkIngesting} className={`flex-grow px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50`}> {isBulkIngesting ? 'Ingesting...' : `Bulk Ingest All (${bulkRows.filter(r => r.rssUrl).length})`} </button>
                    </div>
                </form>
              </div>

              {/* ========================== */}
              {/* FORM 3: EDIT CATEGORY      */}
              {/* ========================== */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
                <h2 className="text-xl font-semibold mb-4 pb-2 border-b">3. Edit Podcast Category</h2>
                <p className="text-gray-500 mb-6 text-sm">Change the category of an existing podcast.</p>
                <form onSubmit={handleEditSubmit} className="space-y-4">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                      <label htmlFor="editPodcastSelect" className="block text-sm font-medium text-gray-700 mb-1">Select Podcast *</label>
                      <select id="editPodcastSelect" value={editPodcastId} onChange={(e) => setEditPodcastId(e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded-md" required disabled={isEditing || podcasts.length === 0}>
                        {podcasts.length === 0 && <option value="">No podcasts found</option>}
                        {podcasts.map((podcast) => <option key={podcast.id} value={podcast.id}>{podcast.title}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="editCategorySelect" className="block text-sm font-medium text-gray-700 mb-1">New Category *</label>
                      {/* DROPDOWN UPDATED TO USE DYNAMIC categoryNames */}
                      <select id="editCategorySelect" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded-md" required disabled={isEditing}>
                        {categoryNames.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                   </div>
                  <button type="submit" disabled={isEditing || !editPodcastId} className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50`}>
                    {isEditing ? 'Updating...' : 'Update Category'}
                  </button>
                </form>
                 {editStatus.message && ( <div className={`mt-4 p-3 rounded-md text-sm ${editStatus.type === 'error' ? 'bg-red-100 text-red-700' : editStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}> {editStatus.message} </div> )}
              </div>
          </div>


          {/* RIGHT COLUMN (1/3 width) - Made sticky and wrapped in space-y-8 */}
          <div className="lg:col-span-1 space-y-8 sticky top-8">
            
            {/* ========================== */}
            {/* FORM 2: MANAGE BANNER      */}
            {/* ========================== */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
                <h2 className="text-xl font-semibold mb-4 pb-2 border-b">2. Manage Banner</h2>
                <p className="text-gray-500 mb-6 text-sm">Promote a podcast on the homepage.</p>
                <form onSubmit={handleBannerSubmit} className="space-y-4">
                   <div> <label htmlFor="podcastSelect" className="block text-sm font-medium text-gray-700 mb-1">Select Podcast *</label> <select id="podcastSelect" value={selectedPodcastId} onChange={(e) => setSelectedPodcastId(e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded-md" required disabled={isUpdatingBanner || podcasts.length === 0}> {podcasts.length === 0 && <option value="">No podcasts found</option>} {podcasts.map((podcast) => <option key={podcast.id} value={podcast.id}>{podcast.title}</option>)} </select> </div>
                   <div> <label htmlFor="bannerFile" className="block text-sm font-medium text-gray-700 mb-1">Banner Image (PNG/JPG) *</label> <input type="file" id="bannerFile" accept="image/png, image/jpeg" onChange={(e) => setBannerFile(e.target.files ? e.target.files[0] : null)} className="w-full p-2 text-sm border border-gray-300 rounded-md" required disabled={isUpdatingBanner} /> <p className="mt-1 text-xs text-gray-500">Rec: 1200x400px.</p> </div>
                  <button type="submit" disabled={isUpdatingBanner || !bannerFile || !selectedPodcastId} className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50`}> {isUpdatingBanner ? 'Uploading...' : 'Save Banner Settings'} </button>
                </form>
                 {bannerStatus.message && ( <div className={`mt-4 p-3 rounded-md text-sm ${bannerStatus.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}> {bannerStatus.message} </div> )}
            </div>

            {/* ========================== */}
            {/* FORM 4: MANAGE CATEGORIES  */}
            {/* ========================== */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
              <div className="flex justify-between items-center mb-4 pb-2 border-b">
                  <h2 className="text-xl font-semibold">4. Categories</h2>
                  <div className="flex gap-2">
                    <button onClick={addCategory} className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700">+ Add</button>
                    <button onClick={handleSaveOrder} disabled={isSavingOrder} className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">Save All</button>
                  </div>
              </div>
              <p className="text-gray-500 mb-4 text-sm">Add, rename, delete, or use arrows to reorder.</p>
              
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                  {orderedCategories.map((cat, index) => (
                      <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200 group">
                          <div className="flex flex-col">
                            <span className="font-medium text-sm text-gray-800">{cat.name}</span>
                            <div className="flex gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button type="button" onClick={() => renameCategory(cat.id)} className="text-[11px] font-medium text-blue-600 hover:text-blue-800">Rename</button>
                              <button type="button" onClick={() => removeCategory(cat.id)} className="text-[11px] font-medium text-red-600 hover:text-red-800">Delete</button>
                            </div>
                          </div>
                          <div className="flex gap-1">
                              <button type="button" onClick={()=>moveUp(index)} disabled={index===0} className="p-1.5 bg-white border border-gray-300 rounded hover:bg-gray-100 text-xs disabled:opacity-30 disabled:hover:bg-white text-gray-600">▲</button>
                              <button type="button" onClick={()=>moveDown(index)} disabled={index===orderedCategories.length-1} className="p-1.5 bg-white border border-gray-300 rounded hover:bg-gray-100 text-xs disabled:opacity-30 disabled:hover:bg-white text-gray-600">▼</button>
                          </div>
                      </div>
                  ))}
                  {orderedCategories.length === 0 && (
                      <p className="text-sm text-gray-500 italic text-center py-4">No categories found.</p>
                  )}
              </div>
              {orderStatus.message && (
                <div className={`mt-4 p-3 rounded-md text-sm ${orderStatus.type === 'error' ? 'bg-red-100 text-red-700' : orderStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {orderStatus.message}
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </main>
  );
}