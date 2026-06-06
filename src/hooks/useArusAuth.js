import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export function useArusAuth(setCurrentTab) {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userSchoolId, setUserSchoolId] = useState(null);
  const [isCritical, setIsCritical] = useState(false);

  const handleDemoLogin = (userData) => {
    setSession(userData);
    localStorage.setItem("demo_session", JSON.stringify(userData));

    const roleStr = userData.role.toLowerCase().trim();
    setUserRole(roleStr);
    setUserSchoolId(userData.school_id);

    if (roleStr === "superadmin") setCurrentTab("super-dashboard");
    else if (roleStr === "headmaster") setCurrentTab("admin-management");
    else setCurrentTab("mobile-audit");
  };

  useEffect(() => {
    const savedSession = localStorage.getItem("demo_session");
    if (savedSession) {
      handleDemoLogin(JSON.parse(savedSession));
    }

    const telemetryChannel = supabase
      .channel("public:water_data")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "water_data" },
        (payload) => setIsCritical(payload.new.is_critical) 
      )
      .subscribe();

    return () => {
      supabase.removeChannel(telemetryChannel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const handleSignOut = () => {
    setSession(null);
    setUserRole(null);
    setUserSchoolId(null);
    localStorage.removeItem("demo_session");
  };

  const handleSessionUpdate = (updatedFields) => {
    const updatedSession = { ...session, ...updatedFields };
    setSession(updatedSession);
    localStorage.setItem("demo_session", JSON.stringify(updatedSession));
  };

  return {
    session,
    userRole,
    userSchoolId,
    isCritical,
    handleDemoLogin,
    handleSignOut,
    handleSessionUpdate,
  };
}