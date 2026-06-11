
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { 
  PencilSquareIcon, 
  TrashIcon, 
  UsersIcon 
} from "@heroicons/react/24/outline";

export default function AdminStaffTable({ staffList, onEdit, onDelete }) {
  return (
    <Card className="fade-in">
      <div className="p-6 border-b border-slate-100">
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">
          Master Staff List
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Profile</th>
              <th className="p-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Staff Details</th>
              <th className="p-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Role Scope</th>
              <th className="p-4 font-bold text-slate-500 text-xs uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm bg-white">
            {staffList.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-0">
                  <div className="flex flex-col items-center justify-center p-16 bg-slate-50/50">
                    <UsersIcon className="w-16 h-16 text-slate-300 mb-4" />
                    <p className="text-slate-800 font-bold text-lg">No staff members provisioned</p>
                    <p className="text-sm text-slate-500 mt-1">New personnel accounts will appear here once registered.</p>
                  </div>
                </td>
              </tr>
            ) : (
              staffList.map((staff) => (
                <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="p-4 align-middle">
                    {staff.profile_pic ? (
                      <img 
                        src={staff.profile_pic} 
                        alt={staff.full_name} 
                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm ring-1 ring-slate-200" 
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-lg shadow-sm">
                        {staff.full_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </td>
                  <td className="p-4 align-middle">
                    <p className="font-bold text-slate-800 text-base">{staff.full_name}</p>
                    <div className="flex flex-col gap-0.5 mt-1">
                      <p className="text-slate-500 text-xs">{staff.email}</p>
                      <p className="text-slate-400 text-xs">{staff.phone_no}</p>
                    </div>
                    <p className="font-mono text-slate-400 text-[10px] mt-1.5 uppercase tracking-tighter italic">IC: {staff.ic_number}</p>
                  </td>
                  <td className="p-4 align-middle">
                    <Badge variant={
                      staff.role === "asset_teacher" ? "brand" :
                      staff.role === "headmaster" ? "active" :
                      staff.role === "superadmin" ? "danger" : "neutral"
                    }>
                      {staff.role === "asset_teacher" ? "Asset Field Ops" :
                       staff.role === "headmaster" ? "Headmaster" :
                       staff.role === "superadmin" ? "Super Admin" :
                       "Classroom Standard"}
                    </Badge>
                  </td>
                  <td className="p-4 align-middle text-right">
                    <div className="flex justify-end items-center gap-1">
                      <button 
                        onClick={() => onEdit(staff)} 
                        className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Edit Profile"
                      >
                        <PencilSquareIcon className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => onDelete(staff.id, staff.full_name)} 
                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete Profile"
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