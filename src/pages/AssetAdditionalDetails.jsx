import React from 'react';
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Textarea from "../components/ui/Textarea";

export default function AssetAdditionalDetails({ form, errors, handleInputChange, isReadOnly }) {
  return (
    <Card className="p-6">
      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b pb-4 mb-6">Financial & Technical Details</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-6">
          <Input 
            label="Brand / Manufacturer"
            value={form.brand}
            onChange={handleInputChange('brand')}
            disabled={isReadOnly}
            placeholder="e.g. HP, Cisco, IKEA"
          />

          <Input 
            label="Model Name/No."
            value={form.model}
            onChange={handleInputChange('model')}
            disabled={isReadOnly}
            placeholder="e.g. Precision 3660"
          />

          <Input 
            label="Manufacturer Serial Number"
            value={form.manufacturerSerial}
            onChange={handleInputChange('manufacturerSerial')}
            disabled={isReadOnly}
            placeholder="e.g. SN-123456789"
          />

          <Input 
            label="Official Order No. (LPO)"
            value={form.officialOrderNo}
            onChange={handleInputChange('officialOrderNo')}
            disabled={isReadOnly}
            placeholder="e.g. LPO-887766"
          />

          <Input 
            label="Supplier Name"
            value={form.supplierName}
            onChange={handleInputChange('supplierName')}
            disabled={isReadOnly}
            placeholder="e.g. Dell Malaysia Sdn Bhd"
          />
        </div>

        <div className="space-y-6">
          <Input 
            label="Acquisition Price (RM)"
            type="number"
            step="0.01"
            value={form.acquisitionPrice}
            onChange={handleInputChange('acquisitionPrice')}
            disabled={isReadOnly}
            placeholder="0.00"
          />

          <Input 
            label="Received Date"
            type="date"
            value={form.receivedDate}
            onChange={handleInputChange('receivedDate')}
            disabled={isReadOnly}
          />

          <Select 
            label="Acquisition Method"
            value={form.acquisitionMethod}
            onChange={handleInputChange('acquisitionMethod')}
            disabled={isReadOnly}
          >
            <option value="Purchase">Purchase</option>
            <option value="Donation">Donation</option>
            <option value="Transfer">Transfer</option>
            <option value="Other">Other</option>
          </Select>

          <Input 
            label="Warranty Period"
            value={form.warrantyPeriod}
            onChange={handleInputChange('warrantyPeriod')}
            disabled={isReadOnly}
            placeholder="e.g. 3 Years, 36 Months"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="CSP Height (m)"
              type="number"
              step="0.01"
              value={form.cspHeight}
              onChange={handleInputChange('cspHeight')}
              disabled={isReadOnly}
              placeholder="0.00"
            />
            <Select 
              label="Criticality"
              value={form.criticalityLevel}
              onChange={handleInputChange('criticalityLevel')}
              disabled={isReadOnly}
            >
              <option value={1}>1 - Low</option>
              <option value={2}>2 - Normal</option>
              <option value={3}>3 - High</option>
              <option value={4}>4 - Essential</option>
              <option value={5}>5 - Critical</option>
            </Select>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <Textarea 
          label="Additional Specifications / Notes"
          value={form.specifications}
          onChange={handleInputChange('specifications')}
          disabled={isReadOnly}
          rows={4}
          className="resize-none"
          placeholder="Enter technical specs or other important remarks..."
        />
      </div>
    </Card>
  );
}
