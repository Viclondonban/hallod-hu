"use client";

import { useState } from 'react';

export default function AdminPage() {
  const [rssUrl, setRssUrl] = useState('');
  // Track more detailed status for better feedback
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' | '' }>({ message: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ message: '', type: '' });

    // Basic client-side validation
    if (!rssUrl.startsWith('http')) {
      setStatus({ message: 'Please enter a valid URL starting with http:// or https://', type: 'error' });
      return;
    }

    setIsLoading(true);
    setStatus({ message: 'Connecting to ingestion engine...', type: 'info' });

    try {
      // This is the real network request to our backend API
      const response = await fetch('/api/ingest', {
        method: 'POST', // We are sending data, so we use POST
        headers: {
          'Content-Type': 'application/json',
        },
        // Send the URL as JSON data
        body: JSON.stringify({ url: rssUrl }),
      });

      // Parse the JSON response from the server
      const data = await response.json();

      if (response.ok) {
        // Success! The server saved the podcast.
        console.log('Ingestion successful:', data);
        setStatus({ message: `Success! Podcast '${data.podcast?.title}' has been saved to the database.`, type: 'success' });
        // Clear the input field for the next one
        setRssUrl('');
      } else {
        // The server sent back an error message.
        console.error('Ingestion failed:', data.error);
        setStatus({ message: `Error: ${data.error}`, type: 'error' });
      }

    } catch (error) {
      // A network error occurred (e.g., server is down)
      console.error('Network error:', error);
      setStatus({ message: 'A network error occurred. Please try again.', type: 'error' });
    } finally {
      // Always stop the loading spinner, success or failure
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-8 bg-gray-100 text-gray-900">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

        {/* Add Podcast Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Add New Podcast</h2>
          <p className="text-gray-600 mb-4 text-sm">Enter the full RSS feed URL to ingest a podcast.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="rssUrl" className="block text-sm font-medium text-gray-700 mb-1">
                RSS Feed URL
              </label>
              <input
                type="url"
                id="rssUrl"
                value={rssUrl}
                onChange={(e) => setRssUrl(e.target.value)}
                placeholder="https://example.com/feed.rss"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                required
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !rssUrl}
              className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? 'Processing...' : 'Ingest Podcast'}
            </button>
          </form>

          {/* Status Messages */}
          {status.message && (
            <div className={`mt-4 p-3 rounded-md ${status.type === 'error' ? 'bg-red-100 text-red-700' : status.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
              {status.message}
            </div>
          )}
        </div>

        {/* Navigation Link */}
        <div className="mt-8 text-center">
          <a href="/" className="text-blue-600 hover:underline">← Back to Homepage</a>
        </div>
      </div>
    </main>
  );
}