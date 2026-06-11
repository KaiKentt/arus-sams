import { useState } from "react";
import { supabase } from "../../supabaseClient";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Button from "../../components/ui/Button";
import { 
  BuildingLibraryIcon, 
  CheckCircleIcon, 
  ArrowPathIcon,
  XMarkIcon,
  MapPinIcon
} from "@heroicons/react/24/outline";

const MALAYSIA_STATES = [
  { state: "Johor", ptj: "JPNJ" },
  { state: "Kedah", ptj: "JPNKD" },
  { state: "Kelantan", ptj: "JPNK" },
  { state: "Melaka", ptj: "JPNM" },
  { state: "Negeri Sembilan", ptj: "JPNNS" },
  { state: "Pahang", ptj: "JPNPH" },
  { state: "Perak", ptj: "JPNPK" },
  { state: "Perlis", ptj: "JPNPLS" },
  { state: "Pulau Pinang", ptj: "JPNPP" },
  { state: "Sabah", ptj: "JPNSB" },
  { state: "Sarawak", ptj: "JPNSAR" },
  { state: "Selangor", ptj: "JPNSEL" },
  { state: "Terengganu", ptj: "JPNT" },
  { state: "W.P. Kuala Lumpur", ptj: "JPNWPKL" },
  { state: "W.P. Labuan", ptj: "JPNWPL" },
  { state: "W.P. Putrajaya", ptj: "JPNWPP" },
];

export default function EditSchoolModal({ school, onClose, refreshData }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schoolCode, setSchoolCode] = useState(school.school_code || "");
  const [schoolName, setSchoolName] = useState(school.school_name || "");
  const [addressLine, setAddressLine] = useState(school.address_line || "");
  const [postcode, setPostcode] = useState(school.postcode || "");
  const [city, setCity] = useState(school.city || "");
  const [state, setState] = useState(school.state || "");
  const [ptjCode, setPtjCode] = useState(school.ptj_code || "");
  const [latitude, setLatitude] = useState(school.latitude || "");
  const [longitude, setLongitude] = useState(school.longitude || "");
  const [contactNo, setContactNo] = useState(school.contact_no || "");

  const handleStateChange = (e) => {
    const selected = e.target.value;
    setState(selected);
    const match = MALAYSIA_STATES.find((s) => s.state === selected);
    setPtjCode(match ? match.ptj : "");
  };

  const handleUpdateSchool = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await supabase
      .from("schools")
      .update({
        school_code: schoolCode,
        school_name: schoolName,
        address_line: addressLine,
        postcode: postcode,
        city: city,
        state: state,
        ptj_code: ptjCode,
        latitude: parseFloat(latitude) || null,
        longitude: parseFloat(longitude) || null,
        contact_no: contactNo,
      })
      .eq("school_id", school.school_id);

    if (error) {
      alert("Error updating school: " + error.message);
      setIsSubmitting(false);
    } else {
      // Trigger the automatic station mapping calculation since coordinates might have changed
      await supabase.rpc("assign_nearest_stations", {
        p_school_id: school.school_id,
      });

      setIsSubmitting(false);
      refreshData();
      onClose();
    }
  };

  const stateOptions = MALAYSIA_STATES.map(s => ({
    value: s.state,
    label: s.state
  }));

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl relative fade-in flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">
        {/* FIXED HEADER */}
        <div className="p-8 pb-4 border-b border-slate-100 flex justify-between items-start bg-white z-20">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-teal-50 rounded-lg border border-teal-100">
                <BuildingLibraryIcon className="w-8 h-8 text-teal-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Edit School Profile</h2>
            </div>
            <p className="text-sm text-slate-500">Update institutional details and geographic telemetry data.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-8 pt-6">
          <form id="edit-school-form" onSubmit={handleUpdateSchool} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <Input
                  label="School Name"
                  type="text"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="e.g. SK Rantau Panjang"
                />
              </div>
              <Input
                label="School Code"
                type="text"
                required
                value={schoolCode}
                onChange={(e) => setSchoolCode(e.target.value)}
                placeholder="e.g. YBA1346"
              />
              <Input
                label="Contact Number"
                type="text"
                value={contactNo}
                onChange={(e) => setContactNo(e.target.value)}
                placeholder="e.g. 082-123456"
              />
              <div className="md:col-span-2">
                <Input
                  label="Address Line"
                  type="text"
                  required
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder="e.g. 1331, Lor Stutong 13E"
                />
              </div>
              <Input
                label="Postcode"
                type="text"
                required
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                placeholder="93350"
              />
              <Input
                label="City"
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Kuching"
              />
              <Select
                label="State"
                required
                value={state}
                onChange={handleStateChange}
                options={[{ value: "", label: "— Select State —" }, ...stateOptions]}
              />
              
              <div className="flex items-center gap-3 px-4 py-3 bg-teal-50 border border-teal-100 rounded-lg h-full max-h-[64px]">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">PTJ Code Auto-Set</span>
                  <span className="font-mono font-bold text-teal-800 text-sm">{ptjCode || "---"}</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <MapPinIcon className="w-4 h-4 text-slate-400" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">School Coordinates</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <Input
                  label="Latitude"
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="e.g. 1.5333"
                  className="bg-white"
                />
                <Input
                  label="Longitude"
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="e.g. 110.3833"
                  className="bg-white"
                />
              </div>
            </div>
          </form>
        </div>

        {/* FIXED FOOTER */}
        <div className="p-8 pt-4 border-t border-slate-100 flex justify-end gap-3 bg-white z-20">
          <Button
            variant="secondary"
            type="button"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            form="edit-school-form"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-5 h-5" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
