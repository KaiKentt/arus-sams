import React, { useState } from "react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { 
  MagnifyingGlassIcon, 
  PencilSquareIcon, 
  TrashIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  UserIcon
} from "@heroicons/react/24/outline";

export default function StaffTable({ globalStaff, onEdit, onDelete }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredStaff = globalStaff.filter(staff => 
    staff.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.schools?.school_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderRoleBadge = (role) => {
    switch(role) {
      case "superadmin":
        return (
          <Badge variant="brand" icon={ShieldCheckIcon}>Ministry</Badge>
        );
      case "headmaster":
        return <Badge variant="brand" icon={AcademicCapIcon}>Headmaster</Badge>;
      case "asset_teacher":
        return <Badge variant="active" icon={BriefcaseIcon}>Asset Officer</Badge>;
      default:
        return <Badge variant="neutral" icon={UserIcon}>Teacher</Badge>;
    }
  };

  return (
    <Card className="fade-in">
      {/* TABLE HEADER & SEARCH */}
      <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-50 rounded-lg border border-teal-100">
            <UserGroupIcon className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Global Staff Directory</h3>
            <p className="text-sm text-slate-500">Manage user access and role assignments</p>
          </div>
        </div>
        
        <div className="relative w-full md:w-72">
          <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search name, email, or school..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-teal-600 outline-none transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
              <th className="p-4 pl-6">Personnel Info</th>
              <th className="p-4">System Role</th>
              <th className="p-4">Assigned Facility</th>
              <th className="p-4 text-right pr-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStaff.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-8 text-center text-slate-500">
                  No personnel found matching your search.
                </td>
              </tr>
            ) : (
              filteredStaff.map((staff, index) => (
                <tr key={staff.id || staff.staff_id || `staff-${index}`} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-4 pl-6">
                    <p className="font-bold text-slate-800">{staff.full_name}</p>
                    <p className="text-sm text-slate-500">{staff.email}</p>
                  </td>
                  <td className="p-4">
                    {renderRoleBadge(staff.role)}
                  </td>
                  <td className="p-4">
                    {staff.role === 'superadmin' ? (
                      <span className="text-sm text-slate-400 italic">Global Access</span>
                    ) : (
                      <span className="text-sm font-medium text-slate-700">
                        {staff.schools?.school_name || "Unassigned"}
                      </span>
                    )}
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <div className="flex justify-end items-center gap-1">
                      <button
                        onClick={() => onEdit(staff)}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit User"
                      >
                        <PencilSquareIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => onDelete(staff.id || staff.staff_id || `staff-${index}`, staff.full_name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Revoke Access"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}