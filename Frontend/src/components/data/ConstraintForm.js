import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

export const ConstraintForm = ({ constraints, setConstraints }) => {
  const [newConstraint, setNewConstraint] = useState({
    field: '',
    strategy: 'percentage_distribution',
    value: '',
    percentage: 0,
    min_value: null,
    max_value: null,
  });

  const handleAddConstraint = () => {
    try {
      let constraintToAdd = {};
      if (newConstraint.strategy === 'percentage_distribution') {
        if (!newConstraint.field || !newConstraint.value || newConstraint.percentage === 0) {
          throw new Error("Percentage constraint requires field, value, and percentage.");
        }
        constraintToAdd = {
          field: newConstraint.field,
          value: newConstraint.value,
          percentage: parseFloat(newConstraint.percentage),
          strategy: newConstraint.strategy,
        };
      } else if (newConstraint.strategy === 'exact_value') {
        if (!newConstraint.field || newConstraint.value === '') {
          throw new Error("Exact value constraint requires field and value.");
        }
        // Attempt to infer type for exact value
        let parsedValue = newConstraint.value;
        if (!isNaN(parsedValue) && !isNaN(parseFloat(parsedValue))) {
          parsedValue = parseFloat(parsedValue);
        } else if (parsedValue.toLowerCase() === 'true') {
          parsedValue = true;
        } else if (parsedValue.toLowerCase() === 'false') {
          parsedValue = false;
        }
        constraintToAdd = {
          field: newConstraint.field,
          value: parsedValue,
          strategy: newConstraint.strategy,
        };
      } else if (newConstraint.strategy === 'range') {
        if (!newConstraint.field || (newConstraint.min_value === null && newConstraint.max_value === null)) {
          throw new Error("Range constraint requires field and at least one of min/max value.");
        }
        const minVal = newConstraint.min_value !== null ? parseFloat(newConstraint.min_value) : null;
        const maxVal = newConstraint.max_value !== null ? parseFloat(newConstraint.max_value) : null;
        if (minVal !== null && maxVal !== null && minVal > maxVal) {
          throw new Error("Min value cannot be greater than max value.");
        }
        constraintToAdd = {
          field: newConstraint.field,
          min_value: minVal,
          max_value: maxVal,
          strategy: newConstraint.strategy,
        };
      } else {
        throw new Error("Unsupported constraint strategy.");
      }

      setConstraints([...constraints, constraintToAdd]);
      setNewConstraint({ field: '', strategy: 'percentage_distribution', value: '', percentage: 0, min_value: null, max_value: null });
    } catch (error) {
      alert(`Error adding constraint: ${error.message}`);
    }
  };

  const handleRemoveConstraint = (index) => {
    setConstraints(constraints.filter((_, i) => i !== index));
  };

  const handleNewConstraintChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewConstraint(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg mb-4">
      <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">Granular Constraints</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">Field</label>
          <input
            type="text"
            name="field"
            value={newConstraint.field}
            onChange={handleNewConstraintChange}
            className="shadow border rounded w-full py-2 px-3 text-gray-700 dark:bg-gray-600 dark:text-white dark:border-gray-500"
            placeholder="e.g., department"
          />
        </div>
        <div>
          <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">Strategy</label>
          <select
            name="strategy"
            value={newConstraint.strategy}
            onChange={handleNewConstraintChange}
            className="shadow border rounded w-full py-2 px-3 text-gray-700 dark:bg-gray-600 dark:text-white dark:border-gray-500"
          >
            <option value="percentage_distribution">Percentage Distribution</option>
            <option value="exact_value">Exact Value</option>
            <option value="range">Range (Numeric)</option>
          </select>
        </div>
        {newConstraint.strategy === 'percentage_distribution' && (
          <>
            <div>
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">Value</label>
              <input
                type="text"
                name="value"
                value={newConstraint.value}
                onChange={handleNewConstraintChange}
                className="shadow border rounded w-full py-2 px-3 text-gray-700 dark:bg-gray-600 dark:text-white dark:border-gray-500"
                placeholder="e.g., Engineering"
              />
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">Percentage (%)</label>
              <input
                type="number"
                name="percentage"
                value={newConstraint.percentage}
                onChange={handleNewConstraintChange}
                className="shadow border rounded w-full py-2 px-3 text-gray-700 dark:bg-gray-600 dark:text-white dark:border-gray-500"
                min="0" max="100" step="0.1"
              />
            </div>
          </>
        )}
        {newConstraint.strategy === 'exact_value' && (
          <div>
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">Value</label>
            <input
              type="text"
              name="value"
              value={newConstraint.value}
              onChange={handleNewConstraintChange}
              className="shadow border rounded w-full py-2 px-3 text-gray-700 dark:bg-gray-600 dark:text-white dark:border-gray-500"
              placeholder="e.g., true, VIP, 100"
            />
          </div>
        )}
        {newConstraint.strategy === 'range' && (
          <>
            <div>
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">Min Value</label>
              <input
                type="number"
                name="min_value"
                value={newConstraint.min_value === null ? '' : newConstraint.min_value}
                onChange={handleNewConstraintChange}
                className="shadow border rounded w-full py-2 px-3 text-gray-700 dark:bg-gray-600 dark:text-white dark:border-gray-500"
                placeholder="e.g., 18"
              />
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">Max Value</label>
              <input
                type="number"
                name="max_value"
                value={newConstraint.max_value === null ? '' : newConstraint.max_value}
                onChange={handleNewConstraintChange}
                className="shadow border rounded w-full py-2 px-3 text-gray-700 dark:bg-gray-600 dark:text-white dark:border-gray-500"
                placeholder="e.g., 65"
              />
            </div>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={handleAddConstraint}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center"
      >
        <Plus size={16} className="mr-2" /> Add Constraint
      </button>

      {constraints.length > 0 && (
        <div className="mt-4 border-t dark:border-gray-600 pt-4">
          <h4 className="text-md font-semibold mb-2 text-gray-800 dark:text-white">Active Constraints:</h4>
          <ul className="space-y-2">
            {constraints.map((constraint, index) => (
              <li key={index} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm text-gray-800 dark:text-gray-200">
                <span>
                  <strong>{constraint.field}</strong>: {constraint.strategy === 'percentage_distribution' && `${constraint.percentage}% of '${constraint.value}'`}
                  {constraint.strategy === 'exact_value' && `Exact Value '${String(constraint.value)}'`}
                  {constraint.strategy === 'range' && `Range [${constraint.min_value ?? '-'}, ${constraint.max_value ?? '-'}]`}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveConstraint(index)}
                  className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};