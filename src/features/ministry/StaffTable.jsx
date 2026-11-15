import { useState, useMemo } from "react";
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
  UserIcon,
  BuildingLibraryIcon,
  FunnelIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";

// Helper: Convert Malaysian phone numbers (e.g. 012-3456789 -> 60123456789) for 1-click WhatsApp
const getWhatsAppUrl = (phone, staffName) => {
  if (!phone) return null;
  let cleaned = String(phone).replace(/\D/g, "");
  if (!cleaned) return null;

  if (cleaned.startsWith("0")) {
    cleaned = "60" + cleaned.slice(1);
  } else if (!cleaned.startsWith("60")) {
    cleaned = "60" + cleaned;
  }

  const message = encodeURIComponent(
    `Hello ${staffName || ""}, this is the Arus-SAMS Ministry Portal contacting you regarding school flood & asset readiness.`
  );
  return `https://wa.me/${cleaned}?text=${message}`;
};

// Helper: Sort staff inside each school so Headmaster is always at the top
const ROLE_PRIORITY = {
  superadmin: 1,
  headmaster: 2,
  asset_teacher: 3,
  standard_teacher: 4,
};

export default function StaffTable({ globalStaff = [], onEdit, onDelete }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSchool, setSelectedSchool] = useState("ALL");
  const [selectedRole, setSelectedRole] = useState("ALL");

  // Extract unique school names for the filter dropdown
  const schoolOptions = useMemo(() => {
    const names = globalStaff
      .map((s) => s.schools?.school_name)
      .filter(Boolean);
    return Array.from(new Set(names)).sort();
  }, [globalStaff]);

  // 1. Filter staff based on Search, School dropdown, and Role dropdown
  const filteredStaff = useMemo(() => {
    return globalStaff.filter((staff) => {
      const facilityName =
        staff.role === "superadmin"
          ? "Ministry (Global Access)"
          : staff.schools?.school_name || "Unassigned";

      const matchesSearch =
        !searchTerm.trim() ||
        staff.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.phone_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        facilityName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSchool =
        selectedSchool === "ALL" || facilityName === selectedSchool;

      const matchesRole =
        selectedRole === "ALL" || staff.role === selectedRole;

      return matchesSearch && matchesSchool && matchesRole;
    });
  }, [globalStaff, searchTerm, selectedSchool, selectedRole]);

  // 2. Group filtered staff by School / Facility
  const groupedStaff = useMemo(() => {
    const groups = {};

    filteredStaff.forEach((staff) => {
      const groupName =
        staff.role === "superadmin"
          ? "Ministry (Global Access)"
          : staff.schools?.school_name || "Unassigned";

      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(staff);
    });

    // Sort staff inside each group by role priority (Headmaster -> Asset Officer -> Teacher)
    Object.keys(groups).forEach((groupName) => {
      groups[groupName].sort((a, b) => {
        const priorityA = ROLE_PRIORITY[a.role] || 99;
        const priorityB = ROLE_PRIORITY[b.role] || 99;
        if (priorityA !== priorityB) return priorityA - priorityB;
        return (a.full_name || "").localeCompare(b.full_name || "");
      });
    });

    // Order groups: Schools alphabetically first, Ministry, then Unassigned last
    return Object.entries(groups).sort(([groupA], [groupB]) => {
      if (groupA === "Unassigned") return 1;
      if (groupB === "Unassigned") return -1;
      if (groupA === "Ministry (Global Access)") return -1;
      if (groupB === "Ministry (Global Access)") return 1;
      return groupA.localeCompare(groupB);
    });
  }, [filteredStaff]);

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    selectedSchool !== "ALL" ||
    selectedRole !== "ALL";

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedSchool("ALL");
    setSelectedRole("ALL");
  };

  const renderRoleBadge = (role) => {
    switch (role) {
      case "superadmin":
        return (
          <Badge variant="brand" icon={ShieldCheckIcon}>
            Ministry
          </Badge>
        );
      case "headmaster":
        return (
          <Badge variant="brand" icon={AcademicCapIcon}>
            Headmaster
          </Badge>
        );
      case "asset_teacher":
        return (
          <Badge variant="active" icon={BriefcaseIcon}>
            Asset Officer
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" icon={UserIcon}>
            Teacher
          </Badge>
        );
    }
  };

  return (
    <Card className="fade-in">
      {/* TABLE HEADER, SEARCH & FILTERS */}
      <div className="p-6 border-b border-slate-200 bg-slate-50 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-50 rounded-lg border border-teal-100">
              <UserGroupIcon className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Global Staff Directory
              </h3>
              <p className="text-sm text-slate-500">
                Grouped by school with one-click emergency flood contact
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>
              Showing <strong className="text-slate-800">{filteredStaff.length}</strong> of{" "}
              <strong className="text-slate-800">{globalStaff.length}</strong> personnel across{" "}
              <strong className="text-slate-800">{groupedStaff.length}</strong> group(s)
            </span>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-800 font-bold bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200 transition-colors"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* FILTER CONTROLS: SEARCH + SCHOOL FILTER + ROLE FILTER */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {/* 1. Search Input */}
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, email, phone, or school..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-600 focus:border-teal-600 outline-none transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* 2. School Filter Dropdown */}
          <div className="relative">
            <BuildingLibraryIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-teal-600 focus:border-teal-600 outline-none transition-colors"
            >
              <option value="ALL">All Schools & Facilities</option>
              <option value="Ministry (Global Access)">Ministry (Global Access)</option>
              {schoolOptions.map((schoolName) => (
                <option key={schoolName} value={schoolName}>
                  {schoolName}
                </option>
              ))}
              <option value="Unassigned">Unassigned</option>
            </select>
          </div>

          {/* 3. Role Filter Dropdown */}
          <div className="relative">
            <FunnelIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-teal-600 focus:border-teal-600 outline-none transition-colors"
            >
              <option value="ALL">All System Roles</option>
              <option value="superadmin">Ministry (SuperAdmin)</option>
              <option value="headmaster">Headmaster</option>
              <option value="asset_teacher">Asset Officer</option>
              <option value="standard_teacher">Teacher</option>
            </select>
          </div>
        </div>
      </div>

      {/* GROUPED DATA TABLE */}
      <div className="overflow-x-auto">
        {groupedStaff.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            No personnel found matching your search or filter criteria.
          </div>
        ) : (
          groupedStaff.map(([facilityName, staffList]) => (
            <div key={facilityName} className="border-b border-slate-200 last:border-b-0">
              {/* SCHOOL / FACILITY GROUP BANNER */}
              <div className="bg-slate-800 text-white px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {facilityName === "Ministry (Global Access)" ? (
                    <ShieldCheckIcon className="w-5 h-5 text-teal-400" />
                  ) : (
                    <BuildingLibraryIcon className="w-5 h-5 text-teal-400" />
                  )}
                  <span className="font-bold text-sm tracking-wide">
                    {facilityName}
                  </span>
                </div>
                <span className="text-xs font-semibold bg-slate-700 text-teal-300 px-2.5 py-1 rounded-full">
                  {staffList.length} {staffList.length === 1 ? "Member" : "Members"}
                </span>
              </div>

              {/* STAFF ROWS FOR THIS SCHOOL */}
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                    <th className="p-4 pl-6 w-1/3">Personnel Info</th>
                    <th className="p-4 w-1/5">System Role</th>
                    <th className="p-4 w-1/3">Emergency Contact</th>
                    <th className="p-4 text-right pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffList.map((staff, index) => {
                    const waUrl = getWhatsAppUrl(staff.phone_no, staff.full_name);

                    return (
                      <tr
                        key={staff.id || staff.staff_id || `staff-${index}`}
                        className="hover:bg-slate-50 transition-colors group"
                      >
                        {/* Personnel Info */}
                        <td className="p-4 pl-6">
                          <p className="font-bold text-slate-800">{staff.full_name}</p>
                          <p className="text-sm text-slate-500">{staff.email}</p>
                        </td>

                        {/* System Role */}
                        <td className="p-4">{renderRoleBadge(staff.role)}</td>

                        {/* One-Click Emergency Contact */}
                        <td className="p-4">
                          {staff.phone_no ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-slate-700 mr-1">
                                {staff.phone_no}
                              </span>
                              {waUrl && (
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={`WhatsApp ${staff.full_name}`}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
                                >
                                  <ChatBubbleLeftRightIcon className="w-3.5 h-3.5" />
                                  WhatsApp
                                </a>
                              )}
                              <a
                                href={`tel:${staff.phone_no}`}
                                title={`Call ${staff.full_name}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                              >
                                <PhoneIcon className="w-3.5 h-3.5" />
                                Call
                              </a>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">
                              No phone listed
                            </span>
                          )}
                        </td>

                        {/* Edit / Delete Actions */}
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
                              onClick={() =>
                                onDelete(
                                  staff.id || staff.staff_id || `staff-${index}`,
                                  staff.full_name
                                )
                              }
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Revoke Access"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}