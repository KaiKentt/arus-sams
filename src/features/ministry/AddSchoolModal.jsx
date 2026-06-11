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

export default function AddSchoolModal({ onClose, refreshData }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newSchoolCode, setNewSchoolCode] = useState("");
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newAddressLine, setNewAddressLine] = useState("");
  const [newPostcode, setNewPostcode] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [newPtjCode, setNewPtjCode] = useState("");
  const [newLatitude, setNewLatitude] = useState("");
  const [newLongitude, setNewLongitude] = useState("");
  const [newContact, setNewContact] = useState("");

  const handleStateChange = (e) => {
    const selected = e.target.value;
    setNewState(selected);
    const match = MALAYSIA_STATES.find((s) => s.state === selected);
    setNewPtjCode(match ? match.ptj : "");
  };

  const handleCreateSchool = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { data: newSchoolData, error } = await supabase
      .from("schools")
      .insert([
        {
          school_code: newSchoolCode,
          school_name: newSchoolName,
          address_line: newAddressLine,
          postcode: newPostcode,
          city: newCity,
          state: newState,
          ptj_code: newPtjCode,
          latitude: parseFloat(newLatitude) || null,
          longitude: parseFloat(newLongitude) || null,
          contact_no: newContact,
        },
      ])
      .select();

    if (error) {
      alert("Error creating school: " + error.message);
      setIsSubmitting(false);
    } else {
      if (newSchoolData && newSchoolData.length > 0) {
        const newSchoolId = newSchoolData[0].school_id;
        await supabase.rpc("assign_nearest_stations", {
          p_school_id: newSchoolId,
        });
      }
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
      <Card className="w-full max-w-4xl relative fade-in max-h-[90vh] overflow-y-auto shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors z-30"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        <div className="p-8">
          <div className="sticky top-0 bg-white z-20 pb-4 border-b border-slate-100 mb-6 -mt-2">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-teal-50 rounded-lg border border-teal-100">
                <BuildingLibraryIcon className="w-8 h-8 text-teal-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Onboard New School</h2>
            </div>
            <p className="text-sm text-slate-500">Register a new institutional facility into the system database.</p>
          </div>

          <form onSubmit={handleCreateSchool} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <Input
                  label="School Name"
                  type="text"
                  required
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  placeholder="e.g. SK Rantau Panjang"
                />
              </div>
              <Input
                label="School Code"
                type="text"
                required
                value={newSchoolCode}
                onChange={(e) => setNewSchoolCode(e.target.value)}
                placeholder="e.g. YBA1346"
              />
              <Input
                label="Contact Number"
                type="text"
                value={newContact}
                onChange={(e) => setNewContact(e.target.value)}
                placeholder="e.g. 082-123456"
              />
              <div className="md:col-span-2">
                <Input
                  label="Address Line"
                  type="text"
                  required
                  value={newAddressLine}
                  onChange={(e) => setNewAddressLine(e.target.value)}
                  placeholder="e.g. 1331, Lor Stutong 13E"
                />
              </div>
              <Input
                label="Postcode"
                type="text"
                required
                value={newPostcode}
                onChange={(e) => setNewPostcode(e.target.value)}
                placeholder="93350"
              />
              <Input
                label="City"
                type="text"
                required
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                placeholder="Kuching"
              />
              <Select
                label="State"
                required
                value={newState}
                onChange={handleStateChange}
                options={[{ value: "", label: "— Select State —" }, ...stateOptions]}
              />
              
              <div className="flex items-center gap-3 px-4 py-3 bg-teal-50 border border-teal-100 rounded-lg h-full max-h-[64px]">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">PTJ Code Auto-Set</span>
                  <span className="font-mono font-bold text-teal-800 text-sm">{newPtjCode || "---"}</span>
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
                  value={newLatitude}
                  onChange={(e) => setNewLatitude(e.target.value)}
                  placeholder="e.g. 1.5333"
                  className="bg-white"
                />
                <Input
                  label="Longitude"
                  type="number"
                  step="any"
                  value={newLongitude}
                  onChange={(e) => setNewLongitude(e.target.value)}
                  placeholder="e.g. 110.3833"
                  className="bg-white"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white z-20 pt-4 pb-2 border-t border-slate-100 mt-6 -mb-2">
              <div className="flex justify-end gap-3">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-5 h-5" />
                      Register School
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
