// C:\Synthetic dataset generator\Frontend\src\components\views\HistoryView.js

import { formatDistanceToNow } from 'date-fns';
import { Copy, Eye, Loader2, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api'; // CORRECTED PATH
import { Notification } from '../Notification';

export const HistoryView = ({ onSelectHistoryEntry, onStartAugmentation }) => {
  const { token, API_BASE_URL } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await api.getHistory(token, API_BASE_URL);
        setHistory(data.history);
      } catch (err) {
        setError(err.message || 'Failed to fetch history');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [token, API_BASE_URL]);

  const handleCopyPrompt = (prompt) => {
    navigator.clipboard.writeText(prompt)
      .then(() => setNotification({ message: 'Prompt copied to clipboard!', type: 'success' }))
      .catch(() => setNotification({ message: 'Failed to copy prompt.', type: 'error' }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500">
        <p>Error: {error}</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400">
        <p>Your generation history is empty.</p>
        <p>Start by generating a dataset on the "Generate" tab!</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Generation History</h2>
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      <div className="space-y-4">
        {history.map(entry => (
          <div key={entry.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
            <div className="flex-1 space-y-1">
              <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">{entry.domain}</span>
              <p className="text-gray-800 dark:text-white font-medium">{entry.rows_generated} records generated</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {entry.custom_prompt?.length > 100
                  ? entry.custom_prompt.substring(0, 100) + '...'
                  : entry.custom_prompt || 'No custom prompt provided.'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Generated {formatDistanceToNow(new Date(entry.created_at))} ago
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onSelectHistoryEntry(entry)}
                className="bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-300 dark:hover:bg-purple-800 font-bold py-2 px-3 rounded-md transition-colors flex items-center text-sm"
              >
                <Eye size={16} className="mr-2" /> View
              </button>
              <button
                onClick={() => handleCopyPrompt(entry.custom_prompt)}
                className="bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 font-bold py-2 px-3 rounded-md transition-colors flex items-center text-sm"
              >
                <Copy size={16} className="mr-2" /> Copy Prompt
              </button>
              <button
                onClick={() => onStartAugmentation(entry.id, JSON.parse(entry.data_json))}
                className="bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800 font-bold py-2 px-3 rounded-md transition-colors flex items-center text-sm"
              >
                <Sparkles size={16} className="mr-2" /> Augment
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};