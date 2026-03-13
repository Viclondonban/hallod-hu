"use client";

import { submitSuggestion } from "./admin/actions"; 

export default function Footer() {
  const handleSuggest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // 1. Capture the form reference immediately
    const form = e.currentTarget;
    const formData = new FormData(form);
    const honeypot = formData.get("bot-catcher");

    // 🍯 Bot Trap: If hidden field is filled, it's a bot
    if (honeypot) {
      form.reset();
      return;
    }

    // 🚀 THE WIRING: Send data to the server action (Supabase)
    const result = await submitSuggestion(formData);

    if (result?.error) {
      alert(result.error);
    } else {
      alert("Köszi az ajánlást! Hamarosan csekkolom és hozzáadom a rendszerhez. 🙌");
      
      // 2. Use the captured reference to reset the form safely
      form.reset();
    }
  };

  return (
    <footer className="bg-white border-t border-gray-100 mt-12 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          
          {/* Left Side: Submission Form */}
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 tracking-tight">
              Podcast csatornát ajánlanál? Fúdejóvagy!
            </h3>
            <form onSubmit={handleSuggest} className="flex gap-2 max-w-md">
              
              {/* 🍯 INVISIBLE BOT TRAP */}
              <input 
                type="text" 
                name="bot-catcher" 
                className="hidden" 
                tabIndex={-1} 
                autoComplete="off" 
              />

              {/* REAL INPUT: Accepts text titles or links */}
              <input 
                type="text" 
                name="suggestion"
                placeholder="Podcast címe vagy linkje..." 
                required 
                className="flex-grow px-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm text-gray-700 placeholder-gray-400"
              />
              <button 
                type="submit" 
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              >
                Küldés
              </button>
            </form>
          </div>

          {/* Right Side: Disclaimer & Credits */}
          <div className="space-y-3 md:text-right text-sm">
            <p className="text-gray-500 leading-relaxed">
              Az oldal még nagyon friss, szóval tessék türelmesnek lenni és nem bunkózni. Ha valami javaslat lenne, email-ben jöhet, kedvesen: <a href="mailto:viclondonban@gmail.com" className="text-blue-500 font-medium hover:text-blue-600 transition-colors">viclondonban@gmail.com</a>
            </p>
            <p className="font-medium text-gray-400 text-xs">
              Építette és üzemelteti: a csodálatos Nyics Viktor :-)
            </p>
          </div>

        </div>
      </div>
    </footer>
  );
}