import React from 'react';
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { PhotoIcon, TrashIcon } from "@heroicons/react/24/outline";

export default function AssetImageUpload({ imagePreview, setImagePreview, setImageFile, isReadOnly }) {
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Image too large. Max 5MB.');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <Card className="p-6 lg:col-span-1">
      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Asset Image</h3>
      
      {imagePreview ? (
        <div className="relative group">
          <img 
            src={imagePreview} 
            alt="Preview" 
            className="w-full h-64 object-cover rounded-xl border-2 border-slate-200 shadow-sm" 
          />
          {!isReadOnly && (
            <button 
              onClick={removeImage}
              className="absolute top-3 right-3 p-2 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-colors"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 transition-colors hover:bg-slate-100/50">
          <PhotoIcon className="w-12 h-12 text-slate-300 mb-3" />
          <p className="text-xs text-slate-400 text-center px-6 leading-relaxed">
            Upload a clear photo of the asset. JPG or PNG, max 5MB.
          </p>
          {!isReadOnly && (
            <label className="mt-4">
              <span className="px-5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 cursor-pointer hover:bg-slate-50 shadow-sm transition-all inline-block">
                Select Photo
              </span>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                className="hidden" 
              />
            </label>
          )}
        </div>
      )}
    </Card>
  );
}
