import { Plus, Trash2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { DataTable } from './DataTable';

export const AugmentationForm = ({ onAugmentationSuccess, historyId, onBack, historicalData }) => {
  const { token, API_BASE_URL } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rules, setRules] = useState([]);
  const [newRule, setNewRule] = useState({
    field: '',
    strategy: 'target_percentage',
    value: '',
    target_percentage: 0,
    target_count: 0
  });

  useEffect(() => {
    if (historicalData) {
      setData(historicalData);
    }
  }, [historicalData]);

  const handleAddRule = () => {
    if (!newRule.field) {
      setError('Field name is required.');
      return;
    }
    if (newRule.strategy === 'target_percentage' && (newRule.value === '' || newRule.target_percentage === 0)) {
      setError('Value and target percentage are required for this strategy.');
      return;
    }
    if (newRule.strategy === 'oversample_value' && (newRule.value === '' || newRule.target_count === 0)) {
      setError('Value and target count are required for this strategy.');
      return;
    }
    setRules([...rules, newRule]);
    setNewRule({
      field: '',
      strategy: 'target_percentage',
      value: '',
      target_percentage: 0,
      target_count: 0
    });
    setError('');
  };

  const handleRemoveRule = (index) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleAugment = async () => {
    if (rules.length === 0) {
      setError('Please add at least one augmentation rule.');
      return;
    }
    if (!data && !historyId) {
      setError('No data or history ID provided for augmentation.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload = {
        rules: rules,
        ...(historyId ? { history_id: historyId } : { data: data })
      };
      const augmentedData = await api.augmentData(payload, token, API_BASE_URL);
      onAugmentationSuccess(augmentedData.augmented_data);
    } catch (err) {
      setError(err.message || 'Data augmentation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Augment Data</h2>
        <button onClick={onBack} className="text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors">
          <XCircle size={24} />
        </button>
      </div>
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      
      <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mb-4">
        <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">Define Augmentation Rules</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Field Name"
              value={newRule.field}
              onChange={(e) => setNewRule({ ...newRule, field: e.target.value })}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:bg-gray-600 dark:text-white dark:border-gray-500"
            />
            <select
              value={newRule.strategy}
              onChange={(e) => setNewRule({ ...newRule, strategy: e.target.value })}
              className="shadow border rounded w-full py-2 px-3 text-gray-700 dark:bg-gray-600 dark:text-white dark:border-gray-500"
            >
              <option value="target_percentage">Target Percentage</option>
              <option value="oversample_value">Oversample Value</option>
              <option value="balance_categories">Balance Categories</option>
            </select>
            {newRule.strategy === 'target_percentage' && (
              <>
                <input
                  type="text"
                  placeholder="Value"
                  value={newRule.value}
                  onChange={(e) => setNewRule({ ...newRule, value: e.target.value })}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:bg-gray-600 dark:text-white dark:border-gray-500"
                />
                <input
                  type="number"
                  placeholder="Percentage (0-100)"
                  value={newRule.target_percentage}
                  onChange={(e) => setNewRule({ ...newRule, target_percentage: parseFloat(e.target.value) })}
                  min="0"
                  max="100"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:bg-gray-600 dark:text-white dark:border-gray-500"
                />
              </>
            )}
            {newRule.strategy === 'oversample_value' && (
              <>
                <input
                  type="text"
                  placeholder="Value"
                  value={newRule.value}
                  onChange={(e) => setNewRule({ ...newRule, value: e.target.value })}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:bg-gray-600 dark:text-white dark:border-gray-500"
                />
                <input
                  type="number"
                  placeholder="Target Count"
                  value={newRule.target_count}
                  onChange={(e) => setNewRule({ ...newRule, target_count: parseInt(e.target.value) })}
                  min="0"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:bg-gray-600 dark:text-white dark:border-gray-500"
                />
              </>
            )}
          </div>
          <button
            type="button"
            onClick={handleAddRule}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md flex items-center"
          >
            <Plus size={16} className="mr-2" /> Add Rule
          </button>
        </div>
      </div>

      {rules.length > 0 && (
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mb-4">
          <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">Applied Rules:</h3>
          <ul className="space-y-2">
            {rules.map((rule, index) => (
              <li key={index} className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded-md shadow-sm text-sm">
                <span>
                  <strong>{rule.field}</strong>: {rule.strategy === 'target_percentage' ? `Target ${rule.target_percentage}% of "${rule.value}"` : ''}
                  {rule.strategy === 'oversample_value' ? `Oversample "${rule.value}" to ${rule.target_count} records` : ''}
                  {rule.strategy === 'balance_categories' ? `Balance Categories` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveRule(index)}
                  className="text-red-500 hover:text-red-700 p-1 rounded-full"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <button
        onClick={handleAugment}
        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md w-full disabled:opacity-50 flex items-center justify-center"
        disabled={loading}
      >
        {loading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Augmenting...
          </>
        ) : (
          'Augment Dataset'
        )}
      </button>

      {data && (
        <div className="mt-6">
          <DataTable data={data} />
        </div>
      )}
    </div>
  );
};