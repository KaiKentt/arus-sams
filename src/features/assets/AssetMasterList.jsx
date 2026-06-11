import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import Card from '../../components/ui/Card';
import AssetFilters from './AssetFilters';
import AssetTable from './AssetTable';
import AssetPagination from './AssetPagination';
import AddAssetModal from './AddAssetModal';
import EditAssetModal from './EditAssetModal';

const ASSETS_PER_PAGE = 15;

const AssetMasterList = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);

  const fetchAssets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('assets')
      .select(`
        *,
        location:locations(name),
        assigned_to:profiles(full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching assets:', error);
      setError(error.message);
    } else {
      setAssets(data);
      setError(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleAssetAdded = () => {
    fetchAssets();
    setAddModalOpen(false);
  };

  const handleAssetUpdated = () => {
    fetchAssets();
    setEditModalOpen(false);
    setSelectedAsset(null);
  };

  const handleDelete = async (assetId) => {
    if (window.confirm('Are you sure you want to delete this asset?')) {
      const { error } = await supabase.from('assets').delete().eq('id', assetId);
      if (error) {
        console.error('Error deleting asset:', error);
      } else {
        fetchAssets();
      }
    }
  };

  const openEditModal = (asset) => {
    setSelectedAsset(asset);
    setEditModalOpen(true);
  };
  
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const name = asset.name || '';
      const model = asset.model || '';
      const serial = asset.serial_number || '';
      const category = asset.category || '';
      const condition = asset.condition || '';
      
      const matchesSearch = searchTerm === '' ||
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        serial.toLowerCase().includes(searchTerm.toLowerCase());
        
      const matchesCategory = selectedCategory === 'all' || category === selectedCategory;
      const matchesCondition = selectedCondition === 'all' || condition === selectedCondition;
      
      return matchesSearch && matchesCategory && matchesCondition;
    });
  }, [assets, searchTerm, selectedCategory, selectedCondition]);

  const totalPages = Math.ceil(filteredAssets.length / ASSETS_PER_PAGE);
  
  const currentAssets = useMemo(() => {
    const startIndex = (currentPage - 1) * ASSETS_PER_PAGE;
    return filteredAssets.slice(startIndex, startIndex + ASSETS_PER_PAGE);
  }, [filteredAssets, currentPage]);

  const assetCategories = useMemo(() => [...new Set(assets.map(a => a.category).filter(Boolean))], [assets]);
  const assetConditions = useMemo(() => [...new Set(assets.map(a => a.condition).filter(Boolean))], [assets]);

  return (
    <>
      <Card>
        <AssetFilters
          searchTerm={searchTerm}
          onSearchChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          selectedCategory={selectedCategory}
          onCategoryChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
          categories={assetCategories}
          selectedCondition={selectedCondition}
          onConditionChange={(e) => { setSelectedCondition(e.target.value); setCurrentPage(1); }}
          conditions={assetConditions}
          onAddAsset={() => setAddModalOpen(true)}
          onExport={() => alert('Export function not yet implemented.')}
        />
        
        <AssetTable
          assets={currentAssets}
          loading={loading}
          error={error}
          onEdit={openEditModal}
          onDelete={handleDelete}
        />
        
        <AssetPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </Card>

      {isAddModalOpen && (
        <AddAssetModal
          isOpen={isAddModalOpen}
          onClose={() => setAddModalOpen(false)}
          onAssetAdded={handleAssetAdded}
        />
      )}

      {isEditModalOpen && selectedAsset && (
        <EditAssetModal
          isOpen={isEditModalOpen}
          onClose={() => setEditModalOpen(false)}
          asset={selectedAsset}
          onAssetUpdated={handleAssetUpdated}
        />
      )}
    </>
  );
};

export default AssetMasterList;
