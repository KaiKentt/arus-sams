import React from 'react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

const getConditionBadgeVariant = (condition) => {
  switch (condition) {
    case 'Active':
    case 'In Use':
      return 'success';
    case 'Maintenance':
    case 'Repair':
      return 'warning';
    case 'Disposed':
    case 'Lost':
      return 'danger';
    default:
      return 'secondary';
  }
};

const AssetTable = ({ assets, loading, error, onEdit, onDelete }) => {
  if (loading) {
    return <div className="p-4 text-center">Loading assets...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-600">Error: {error}</div>;
  }
  
  if (assets.length === 0) {
    return <div className="p-4 text-center text-gray-500">No assets match the current filters.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name / Model</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial Number</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Condition</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {assets.map((asset) => (
            <tr key={asset.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{asset.name}</div>
                <div className="text-sm text-gray-500">{asset.model}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asset.serial_number}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asset.category}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge variant={getConditionBadgeVariant(asset.condition)}>
                  {asset.condition}
                </Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {asset.location?.name || 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex gap-2 justify-end">
                    <Button variant="secondary" onClick={() => onEdit(asset)}>Edit</Button>
                    <Button variant="danger" onClick={() => onDelete(asset.id)}>Delete</Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AssetTable;
