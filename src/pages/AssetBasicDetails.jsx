
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";

export default function AssetBasicDetails({ 
  form, 
  errors, 
  handleInputChange,
  categories,
  subcategories,
  handleCategoryChange,
  handleSubCategoryChange,
  rooms,
  locationPaths,
  isReadOnly
}) {
  return (
    <Card className="p-6">
      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b pb-4 mb-6">Basic Identification</h3>
      
      <div className="space-y-6">
        <Input 
          label="Asset Name / Description"
          value={form.assetDescription}
          onChange={handleInputChange('assetDescription')}
          disabled={isReadOnly}
          placeholder="e.g. Dell Latitude 3420 Laptop"
          error={errors.assetDescription}
        />
        {errors.assetDescription && <p className="-mt-4 text-xs text-red-500 font-medium">{errors.assetDescription}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select 
            label="Category"
            value={form.categoryCode} 
            onChange={(e) => handleCategoryChange(e.target.value)}
            disabled={isReadOnly}
          >
            <option value="">Select Category</option>
            {categories.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </Select>

          <Select 
            label="Sub Category"
            value={form.subCategoryCode} 
            onChange={(e) => handleSubCategoryChange(e.target.value)}
            disabled={isReadOnly || !form.categoryCode}
          >
            <option value="">Select Sub Category</option>
            {subcategories.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select 
            label="Location / Room"
            value={form.locationId} 
            onChange={handleInputChange('locationId')}
            disabled={isReadOnly}
          >
            <option value="">Select Location</option>
            {rooms.map(r => (
              <option key={r.location_id} value={r.location_id}>
                {locationPaths[r.location_id] || r.location_name}
              </option>
            ))}
          </Select>

          <Select 
            label="Current Condition"
            value={form.status} 
            onChange={handleInputChange('status')}
            disabled={isReadOnly}
          >
            <option value="Active">Operational</option>
            <option value="Under Maintenance">Maintenance</option>
            <option value="Disposal Requested">Request for Disposal</option>
            <option value="Audit Requested">Request for Audit</option>
            <option value="Broken">Broken</option>
            <option value="Lost">Lost</option>
            <option value="Disposed">Disposed</option>
          </Select>
        </div>
      </div>
    </Card>
  );
}
