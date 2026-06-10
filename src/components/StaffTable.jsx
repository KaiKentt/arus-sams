import React from "react";

export default function StaffTable({ globalStaff, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
      <div className="p-5 bg-slate-50 border-b border-slate-200">
        <h3 className="text-xl font-bold text-slate-800">
          🌍 Global Staff Directory
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                Full Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                Assigned School
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                System Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                Password
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {globalStaff.map((staff) => (
              <tr key={staff.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                  {staff.full_name || "—"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-teal-700">
                  {staff.schools?.school_name ||
                    (staff.role === "superadmin"
                      ? "Ministry (System Owner)"
                      : "Unassigned")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${
                      staff.role === "superadmin"
                        ? "bg-red-100 text-red-800"
                        : staff.role === "headmaster"
                          ? "bg-purple-100 text-purple-800"
                          : staff.role === "asset_teacher"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                    }`}
                  >
                    {staff.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {staff.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                  {staff.stored_password || "—"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                  <button
                    onClick={() => onEdit(staff)}
                    className="text-xl hover:scale-110 transition-transform"
                    title="Edit User"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => onDelete(staff.id, staff.full_name)}
                    className="text-xl hover:scale-110 transition-transform"
                    title="Delete User"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
