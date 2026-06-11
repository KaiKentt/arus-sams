import React from 'react';
import { MagnifyingGlassIcon, PlusIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import Button from '../../components/ui/Button';

const AssetFilters = ({
  searchTerm, onSearchChange,
  selectedCategory, onCategoryChange, categories,
  selectedCondition, onConditionChange, conditions,
  onAddAsset, onExport
}) => {
  return (
    <div className="p-4 border-b border-gray-200">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="w-full md:w-1/3 relative">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute top-1/2 left-3 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, model, serial..."
            value={searchTerm}
            onChange={onSearchChange}
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="w-full md:w-auto flex flex-col md:flex-row items-center gap-4">
          <select
            value={selectedCategory}
            onChange={onCategoryChange}
            className="w-full md:w-auto px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>

          <select
            value={selectedCondition}
            onChange={onConditionChange}
            className="w-full md:w-auto px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Conditions</option>
            {conditions.map(con => <option key={con} value={con}>{con}</option>)}
          </select>
          
          <Button variant="secondary" onClick={onExport}>
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Export
          </Button>

          <Button variant="primary" onClick={onAddAsset}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Asset
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AssetFilters;
