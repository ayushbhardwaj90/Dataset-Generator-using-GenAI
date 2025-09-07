import { List } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export const HistoryView = ({ onSelectHistoryEntry }) => {
  const { token, API_BASE_URL } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
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

  if (loading) return <p className="text-center py-8 text-gray-600 dark:text-gray-400">Loading history...</p>;
  if (error) return <p className="text-center py-8 text-red-500">{error}</p>;
  if (history.length === 0) return <p className="text-center py-8 text-gray-600 dark:text-gray-400">No generation history yet.</p>;

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Generation History</h2>
      <ul className="space-y-4">
        {history.map(entry => (
          <li key={entry.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{entry.domain} ({entry.rows_generated} rows)</h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">{new Date(entry.created_at).toLocaleString()}</span>
            </div>
            {entry.custom_prompt && (
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                <span className="font-medium">Prompt/Constraints:</span> {entry.custom_prompt.length > 100 ? entry.custom_prompt.substring(0, 100) + '...' : entry.custom_prompt}
              </p>
            )}
            {entry.preview && entry.preview.length > 0 && (
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Preview:</span>
                <pre className="bg-gray-200 dark:bg-gray-600 p-2 rounded-md mt-1 overflow-x-auto text-gray-800 dark:text-gray-200">
                  {JSON.stringify(entry.preview[0], null, 2)}
                </pre>
              </div>
            )}
            <button
              onClick={() => onSelectHistoryEntry(entry)}
              className="mt-3 bg-blue-500 hover:bg-blue-600 text-white text-sm py-1 px-3 rounded-md flex items-center"
            >
              <List size={16} className="mr-1" /> View Details
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};