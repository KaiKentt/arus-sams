import React from "react";

export default function SchoolsTable({ schools, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
      <div className="p-5 bg-slate-50 border-b border-slate-200">
        <h3 className="text-xl font-bold text-slate-800">
          🏢 Registered Schools Network
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                School Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                GPS Coordinates
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                Contact
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {schools.map((school) => (
              <tr key={school.school_id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-teal-700">
                  {school.school_code || "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                  {school.school_name}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {school.address_line ? (
                    <>
                      {school.address_line}
                      <br />
                      {school.postcode} {school.city}, {school.state}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-500">
                  {school.latitude && school.longitude
                    ? `${school.latitude}, ${school.longitude}`
                    : "Not mapped"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {school.contact_no || "—"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                  <button
                    onClick={() => onEdit(school)}
                    className="text-xl hover:scale-110 transition-transform"
                    title="Edit School"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() =>
                      onDelete(school.school_id, school.school_name)
                    }
                    className="text-xl hover:scale-110 transition-transform"
                    title="Delete School"
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
