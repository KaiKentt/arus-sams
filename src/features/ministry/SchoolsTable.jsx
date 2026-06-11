import { useState } from "react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { 
  MagnifyingGlassIcon, 
  PencilSquareIcon, 
  TrashIcon, 
  MapPinIcon,
  BuildingLibraryIcon,
  HashtagIcon
} from "@heroicons/react/24/outline";

export default function SchoolsTable({ schools, onEdit, onDelete }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSchools = schools.filter(school => 
    school.school_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.ptj_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="fade-in">
      {/* TABLE HEADER & SEARCH */}
      <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-50 rounded-lg border border-teal-100">
            <BuildingLibraryIcon className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Schools Database</h3>
            <p className="text-sm text-slate-500">Manage all registered facilities</p>
          </div>
        </div>
        
        <div className="relative w-full md:w-72">
          <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or PTJ code..."
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
              <th className="p-4 pl-6">School Details</th>
              <th className="p-4">PTJ Code</th>
              <th className="p-4">Coordinates</th>
              <th className="p-4">Contact</th>
              <th className="p-4 text-right pr-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSchools.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-500">
                  No schools found matching your search.
                </td>
              </tr>
            ) : (
              filteredSchools.map((school) => (
                <tr key={school.school_id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-4 pl-6">
                    <p className="font-bold text-slate-800">{school.school_name}</p>
                  </td>
                  <td className="p-4">
                    <Badge variant="neutral" icon={HashtagIcon}>
                      {school.ptj_code || "N/A"}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1 text-sm text-slate-600 font-mono">
                      <MapPinIcon className="w-4 h-4 text-slate-400" />
                      {school.latitude}, {school.longitude}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-600">
                    {school.contact_no || "N/A"}
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <div className="flex justify-end items-center gap-1">
                      <button
                        onClick={() => onEdit(school)}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit School"
                      >
                        <PencilSquareIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => onDelete(school.school_id, school.school_name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete School"
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