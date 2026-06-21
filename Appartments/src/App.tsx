import React, { useState, useEffect } from "react";
import Reports from "./components/Reports";
import Accounting from "./components/Accounting";
import ReportViewer from "./components/ReportViewer";
import AuthGate from "./components/AuthGate";
import { apiFetch as fetch } from "./lib/api";
import { 
  Home, 
  Users, 
  FileText, 
  CreditCard, 
  CheckCircle, 
  AlertTriangle, 
  Wrench, 
  Sparkles,
  Search,
  Plus,
  ArrowDownLeft, 
  ArrowUpRight,
  Printer,
  X,
  UserCheck,
  Calendar,
  Layers,
  Info,
  DollarSign,
  Briefcase,
  Layers3,
  TrendingUp,
  RotateCcw,
  Check,
  Hash,
  Calculator,
  Lock,
  ShieldAlert,
  KeyRound,
  Trash2,
  Settings,
  Activity
} from "lucide-react";



export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<"grid" | "contracts" | "accounting" | "housekeeping" | "settings" | "reports">("grid");
  const [apartments, setApartments] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [checkinModalOpen, setCheckinModalOpen] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState<any>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  
  // New booking form
  const [newBooking, setNewBooking] = useState({
    tenant_name: "",
    guest_id_type: "national_id",
    guest_id_number: "",
    guest_phone: "",
    guest_nationality: "Saudi",
    days_count: 1,
    paid_amount: 0,
    payment_method: "mada",
    notes: ""
  });

  const [transactions, setTransactions] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [profilePassCurrent, setProfilePassCurrent] = useState("");
  const [profilePassNew, setProfilePassNew] = useState("");

  // Branded Unified Report Viewer State
  const [reportViewerOpen, setReportViewerOpen] = useState(false);
  const [reportViewerType, setReportViewerType] = useState<string>("invoice");
  const [reportViewerSelectedId, setReportViewerSelectedId] = useState<string>("");

  const openReportViewer = (type: string, id: string = "") => {
    setReportViewerType(type);
    setReportViewerSelectedId(id);
    setReportViewerOpen(true);
  };

  // New manual transaction form
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [newTx, setNewTx] = useState({
    type: "receipt_in",
    amount: "",
    payment_method: "cash",
    description: "",
    beneficiary: ""
  });

  // Housekeeping modal or direct worker action
  const [cleaningModalOpen, setCleaningModalOpen] = useState(false);
  const [selectedCleanApt, setSelectedCleanApt] = useState<any>(null);
  const [assignedWorker, setAssignedWorker] = useState("أحمد عثمان (خدمات نظافة)");

  // Shift state
  const [shift, setShift] = useState<any>(null);
  const [closeShiftValue, setCloseShiftValue] = useState("");

  const refreshData = async () => {
    try {
      setLoading(true);
      const [aptsRes, bookingsRes, statsRes, shiftRes, txsRes] = await Promise.all([
        fetch("/api/apartments"),
        fetch("/api/bookings"),
        fetch("/api/stats"),
        fetch("/api/shifts/active"),
        fetch("/api/transactions")
      ]);
      const apts = await aptsRes.json();
      const bks = await bookingsRes.json();
      const st = await statsRes.json();
      const sh = await shiftRes.json();
      const txs = await txsRes.json();
      
      setApartments(apts);
      setBookings(bks);
      setStats(st);
      setShift(sh);
      setTransactions(txs);
    } catch (e) {
      console.error("Error refreshing Nazeel data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initAuthAndData = async () => {
      const token = localStorage.getItem("nazeel_auth_token");
      if (token) {
        try {
          const res = await fetch("/api/auth/me");
          if (res.ok) {
            const user = await res.json();
            setCurrentUser(user);
            // Only trigger data loading after validating auth token
            await refreshData();
          } else {
            localStorage.removeItem("nazeel_auth_token");
            setCurrentUser(null);
          }
        } catch (e) {
          console.error("Error authenticating token", e);
          localStorage.removeItem("nazeel_auth_token");
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setAuthChecking(false);
    };

    initAuthAndData();

    // Listen to global 401 unauth events to force clear state
    const handleUnauthorized = () => {
      localStorage.removeItem("nazeel_auth_token");
      setCurrentUser(null);
    };
    window.addEventListener("nazeel_unauthorized", handleUnauthorized);

    return () => {
      window.removeEventListener("nazeel_unauthorized", handleUnauthorized);
    };
  }, []);

  const fetchUsersList = async () => {
    try {
      const res = await fetch("/api/auth/users");
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (err) {
      console.error("Error fetching users roster", err);
    }
  };

  useEffect(() => {
    if (activeTab === "settings" && currentUser?.role === "admin") {
      fetchUsersList();
    }
  }, [activeTab, currentUser]);

  // Quick Check-in operation
  const handleOpenCheckin = (apt: any) => {
    setSelectedApartment(apt);
    setNewBooking({
      tenant_name: "",
      guest_id_type: "national_id",
      guest_id_number: "",
      guest_phone: "",
      guest_nationality: "سعودي",
      days_count: 1,
      paid_amount: apt.price_per_night,
      payment_method: "mada",
      notes: ""
    });
    setCheckinModalOpen(true);
  };

  const submitCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApartment) return;

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newBooking,
          apartment_id: selectedApartment.id,
          price_per_night: selectedApartment.price_per_night
        })
      });

      if (response.ok) {
        setCheckinModalOpen(false);
        refreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Perform quick Checkout
  const handleCheckout = async (bookingId: number) => {
    if (!confirm("هل أنت متأكد من رغبتك في تسجيل خروج النزيل وإلغاء قفل الشقة؟")) return;
    try {
      const res = await fetch(`/api/bookings/${bookingId}/checkout`, { method: "POST" });
      if (res.ok) {
        refreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Quick Status change (e.g. from Dirty to Clean)
  const markApartmentClean = async (aptId: number) => {
    try {
      const res = await fetch("/api/housekeeping/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apartment_id: aptId })
      });
      if (res.ok) {
        refreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markApartmentStatus = async (aptId: number, status: string) => {
    try {
      const res = await fetch("/api/apartments/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: aptId, status })
      });
      if (res.ok) {
        refreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit manual Sandat (قبض / صرف)
  const submitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/transactions/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newTx.type,
          beneficiary: newTx.beneficiary,
          amount: parseFloat(newTx.amount),
          payment_method: newTx.payment_method,
          description: newTx.description
        })
      });
      if (res.ok) {
        setTxModalOpen(false);
        setNewTx({ type: "receipt_in", amount: "", payment_method: "cash", description: "", beneficiary: "" });
        refreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Close shift
  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/shifts/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cash_drawer_end: parseFloat(closeShiftValue || "0") })
      });
      if (res.ok) {
        alert("تم إغلاق الوردية المالية بنجاح وترحيل الرصيد للوردية الجديدة.");
        setCloseShiftValue("");
        refreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden text-center" dir="rtl">
        {/* Visual ambient gradients */}
        <div className="absolute w-[400px] h-[400px] rounded-full bg-emerald-500/10 blur-[80px] -top-24 -right-24 pointer-events-none"></div>
        <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="font-extrabold text-white text-md tracking-tight">جاري الاتصال والتحقق من الهوية السحابية...</h2>
        <p className="text-xs text-slate-400 mt-1.5 font-mono">نزيل كلون الفاخر | Nazeel PMS Security Gateway</p>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthGate onLoginSuccess={(user: any) => {
      setCurrentUser(user);
    }} />;
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-800 flex flex-col font-sans" dir="rtl">
      
      {/* Top Professional Header - Nazeel Branded Theme */}
      <header className="bg-emerald-700 text-white shadow-md select-none">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-wrap justify-between items-center gap-4">
          
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3">
            <div className="bg-emerald-900 text-white p-2 rounded-xl border border-emerald-500 shadow-inner flex items-center justify-center">
              <Sparkles className="text-emerald-300 animate-pulse" size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-yellow-400 text-emerald-900 text-[10px] font-bold px-1.5 py-0.5 rounded">
                  كـلون نـزيل
                </span>
                <h1 className="text-xl font-bold tracking-tight">نزيل السحابي الفاخر</h1>
              </div>
              <p className="text-[11px] text-emerald-100 font-mono">نظام إدارة الشقق الفندقية المتكامل - الإصدار الرائد</p>
            </div>
          </div>

          {/* Quick Metrics (Direct overview header like Nazeel) */}
          <div className="hidden lg:flex items-center gap-6 text-xs text-emerald-50 bg-emerald-800/60 py-1.5 px-4 rounded-xl border border-emerald-600/50">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>شاغرة: <strong>{stats ? (stats.total - stats.occupied - stats.dirty - stats.maintenance - stats.reserved) : 0}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span>مشغولة: <strong>{stats?.occupied ?? 0}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-bounce"></span>
              <span>متسخة: <strong>{stats?.dirty ?? 0}</strong></span>
            </div>
            <div className="flex items-center gap-1">
              <span>الإشغال:</span>
              <span className="bg-emerald-990 px-1.5 py-0.5 rounded text-yellow-300 font-bold font-mono">
                {stats?.occupancyRate && !isNaN(stats.occupancyRate) ? Number(stats.occupancyRate).toFixed(1) : 0}%
              </span>
            </div>
          </div>

          {/* Active Shift Widget */}
          <div className="flex items-center gap-3">
            {shift ? (
              <div className="flex items-center gap-2 text-xs bg-emerald-900/60 border border-emerald-500/50 px-3 py-1.5 rounded-lg">
                <span className="text-emerald-300 font-bold">الوردية مفتوحة:</span>
                <span className="text-white font-medium">{shift.user_name}</span>
                <button
                  onClick={() => {
                    const val = prompt("أدخل رصيد صندوق الإغلاق الفعلي (ريال سعودي):");
                    if (val) {
                      setCloseShiftValue(val);
                      // Trigger direct call
                      fetch("/api/shifts/close", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ cash_drawer_end: parseFloat(val) })
                      }).then(() => {
                        alert("تم إغلاق الوردية المالية الحالية وفتح وردية الاستلام التالية.");
                        refreshData();
                      });
                    }
                  }}
                  className="bg-yellow-500 text-emerald-950 font-bold px-2 py-0.5 rounded hover:bg-yellow-400 transition"
                >
                  إغلاق الصندوق
                </button>
              </div>
            ) : (
              <span className="text-xs text-red-300 font-bold">⚠️ الصندوق مغلق!</span>
            )}

            {currentUser && (
              <div className="flex items-center gap-2 text-xs bg-emerald-900/80 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-white font-bold">{currentUser.name}</span>
                <span className="bg-emerald-950 text-emerald-300 text-[9px] px-1 py-0.5 rounded font-extrabold">
                  {currentUser.role === "admin" ? "مدير" : "استقبال"}
                </span>
                <button
                  onClick={() => {
                    localStorage.removeItem("nazeel_auth_token");
                    setCurrentUser(null);
                  }}
                  className="bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded mr-1 transition"
                >
                  الخروج
                </button>
              </div>
            )}

            <button 
              onClick={refreshData}
              className="bg-emerald-800 hover:bg-emerald-600 text-white p-2 rounded-lg transition"
              title="تحديث البيانات"
            >
              <RotateCcw size={16} />
            </button>
          </div>

        </div>
      </header>

      {/* Navigation Tabs - Styled exactly like Nazeel's top navigation menu */}
      <div className="bg-white border-b border-neutral-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 flex overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab("grid")}
            className={`px-5 py-3.5 text-sm font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
              activeTab === "grid" 
                ? "border-emerald-600 text-emerald-700 bg-emerald-50/50" 
                : "border-transparent text-neutral-600 hover:text-emerald-600 hover:bg-neutral-50"
            }`}
          >
            <Layers size={18} />
            مخطط الشقق والعمليات (نزيل)
          </button>
          <button
            onClick={() => setActiveTab("contracts")}
            className={`px-5 py-3.5 text-sm font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
              activeTab === "contracts" 
                ? "border-emerald-600 text-emerald-700 bg-emerald-50/50" 
                : "border-transparent text-neutral-600 hover:text-emerald-600 hover:bg-neutral-50"
            }`}
          >
            <FileText size={18} />
            عقود النزلاء والفواتير VAT
          </button>
          <button
            onClick={() => setActiveTab("accounting")}
            className={`px-5 py-3.5 text-sm font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
              activeTab === "accounting" 
                ? "border-emerald-600 text-emerald-700 bg-emerald-50/50" 
                : "border-transparent text-neutral-600 hover:text-emerald-600 hover:bg-neutral-50"
            }`}
          >
            <Calculator size={18} />
            النظام المحاسبي والقيود (شجرة الحسابات)
          </button>
          <button
            onClick={() => setActiveTab("housekeeping")}
            className={`px-5 py-3.5 text-sm font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
              activeTab === "housekeeping" 
                ? "border-emerald-600 text-emerald-700 bg-emerald-50/50" 
                : "border-transparent text-neutral-600 hover:text-emerald-600 hover:bg-neutral-50"
            }`}
          >
            <Sparkles size={18} />
            تفويضات النظافـة والصيانة
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-5 py-3.5 text-sm font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
              activeTab === "settings" 
                ? "border-emerald-600 text-emerald-700 bg-emerald-50/50" 
                : "border-transparent text-neutral-600 hover:text-emerald-600 hover:bg-neutral-50"
            }`}
          >
            <Wrench size={18} />
            إدارة الشقق وتكويد الفندق
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`px-5 py-3.5 text-sm font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
              activeTab === "reports" 
                ? "border-emerald-600 text-emerald-700 bg-emerald-50/50" 
                : "border-transparent text-neutral-600 hover:text-emerald-600 hover:bg-neutral-50"
            }`}
          >
            <TrendingUp size={18} />
            التقارير والإحصائيات
          </button>

          {/* Quick Universal Print Button */}
          <button
            onClick={() => openReportViewer("invoice")}
            className="mr-auto self-center flex items-center gap-1.5 px-4 py-2 hover:bg-emerald-55 text-emerald-750 text-emerald-800 bg-white border border-emerald-350 rounded-lg text-xs font-extrabold shadow-sm whitespace-nowrap mb-2 md:mb-0 ml-4 font-sans border-emerald-300"
          >
            <Printer size={14} className="text-emerald-600" />
            عارض وطباعة التقارير الموحد
          </button>
        </div>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="bg-emerald-50 text-emerald-800 text-xs px-4 py-2 text-center animate-pulse border-b border-emerald-200">
          جاري مزامنة المعلومات وتحديث شاشة نزيل السحابية...
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">

        {/* ----------------- TAB 1: OPERATIONAL ROOM GRID (مخطط الشقق) ----------------- */}
        {activeTab === "grid" && (
          <div className="space-y-6">
            
            {/* Quick Filter Info Panel */}
            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-neutral-500">حالات الشقق المعتمدة:</span>
                <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  شاغرة نظيفة ({apartments.filter(a => a.status === 'available').length})
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-md font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  مشغولة بالكامل ({apartments.filter(a => a.status === 'occupied').length})
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-2.5 py-1 rounded-md font-bold animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                  تحتاج نظافة ({apartments.filter(a => a.status === 'dirty').length})
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-md font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  محجوزة مسبقاً ({apartments.filter(a => a.status === 'reserved').length})
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs bg-neutral-100 text-neutral-700 border border-neutral-300 px-2.5 py-1 rounded-md font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-neutral-500"></span>
                  صيانة مغلقة ({apartments.filter(a => a.status === 'maintenance').length})
                </span>
              </div>
              
              <button 
                onClick={() => handleOpenCheckin(apartments.find(a => a.status === 'available') || apartments[0])}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center gap-2 shadow-sm"
              >
                <Plus size={16} />
                تسكين نزيل مباشر
              </button>
            </div>

            {/* Room Matrix Grouped by Floores */}
            <div className="space-y-8">
              {[1, 2, 3].map(floorNum => {
                const floorApartments = apartments.filter(a => a.floor === floorNum);
                return (
                  <div key={floorNum} className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                    <div className="bg-neutral-100 border-b border-neutral-200 px-5 py-3 flex items-center gap-2">
                      <Layers3 size={18} className="text-neutral-500" />
                      <h3 className="font-bold text-neutral-800 text-sm">الطابق {floorNum === 1 ? 'الأول' : floorNum === 2 ? 'الثاني' : 'الثالث'}</h3>
                      <span className="text-[11px] bg-neutral-200 text-neutral-600 font-bold px-2 py-0.5 rounded-full">
                        {floorApartments.length} شقق
                      </span>
                    </div>

                    <div className="p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {floorApartments.map(apt => {
                        // Find booking associated if occupied
                        let activeBk = null;
                        if (apt.status === "occupied") {
                          activeBk = bookings.find(b => b.apartment_id === apt.id && b.status === "active");
                        } else if (apt.status === "reserved") {
                          activeBk = bookings.find(b => b.apartment_id === apt.id && b.status === "active") || { tenant_name: "حجز مسبق" };
                        }

                        return (
                          <div 
                            key={apt.id}
                            className={`border rounded-xl overflow-hidden shadow-sm flex flex-col justify-between transition-all duration-150 ${
                              apt.status === "available" ? "border-emerald-200 bg-emerald-50/20 hover:border-emerald-400 hover:shadow-md" :
                              apt.status === "occupied" ? "border-rose-200 bg-rose-50/10 hover:border-rose-400 hover:shadow-md" :
                              apt.status === "dirty" ? "border-yellow-200 bg-yellow-50/10 hover:border-yellow-400 hover:shadow-md" :
                              apt.status === "reserved" ? "border-amber-200 bg-amber-50/10" : "border-neutral-200 bg-neutral-50"
                            }`}
                          >
                            <div className="p-4 flex-1">
                              {/* Header Card: Room number/status */}
                              <div className="flex justify-between items-start">
                                <span className={`text-base font-bold font-mono px-3 py-1 rounded-lg ${
                                  apt.status === "available" ? "bg-emerald-600 text-white" :
                                  apt.status === "occupied" ? "bg-rose-600 text-white" :
                                  apt.status === "dirty" ? "bg-yellow-500 text-neutral-900" :
                                  apt.status === "reserved" ? "bg-amber-500 text-neutral-900" : "bg-neutral-600 text-white"
                                }`}>
                                  {apt.room_number}
                                </span>
                                <span className="text-[11px] text-neutral-500 font-bold bg-neutral-100 px-2 py-0.5 rounded-full">
                                  {apt.type}
                                </span>
                              </div>

                              {/* Middle Card: Guest Name or Clean requirements */}
                              <div className="mt-4 min-h-[50px]">
                                {apt.status === "available" && (
                                  <p className="text-xs text-emerald-700 font-bold">✓ شاغرة وجاهزة للتسكين</p>
                                )}
                                {apt.status === "occupied" && activeBk && (
                                  <div className="space-y-1">
                                    <p className="text-xs font-bold text-neutral-900 line-clamp-1">{activeBk?.tenant_name}</p>
                                    <p className="text-[10px] text-neutral-500 font-mono">الهاتف: {activeBk?.guest_phone}</p>
                                    <p className="text-[10px] text-neutral-500 font-mono">الخروج المتوقع: {activeBk?.check_out}</p>
                                  </div>
                                )}
                                {apt.status === "dirty" && (
                                  <div className="space-y-1">
                                    <p className="text-xs text-yellow-700 font-bold">⚠️ متسخة بانتظار تنظيف المفارش</p>
                                    <p className="text-[10px] text-neutral-500">تم تسجيل الخروج مؤخراً</p>
                                  </div>
                                )}
                                {apt.status === "reserved" && (
                                  <div className="space-y-1">
                                    <p className="text-xs text-amber-700 font-bold">📅 محجوزة مأمونة العقد</p>
                                    <p className="text-[10px] text-neutral-500">{activeBk?.tenant_name}</p>
                                  </div>
                                )}
                                {apt.status === "maintenance" && (
                                  <p className="text-xs text-neutral-500 font-bold flex items-center gap-1">
                                    <Wrench size={12} />
                                    تحت الصيانة
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Footer Quick Action Buttons (Exact Nazeel interactive style) */}
                            <div className="border-t border-neutral-100 bg-neutral-50/50 p-2 text-center flex flex-wrap gap-1 justify-content">
                              {apt.status === "available" && (
                                <button
                                  onClick={() => handleOpenCheckin(apt)}
                                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 transition"
                                >
                                  <UserCheck size={13} />
                                  تسكين سريع
                                </button>
                              )}
                              {apt.status === "occupied" && activeBk && (
                                <div className="w-full flex gap-1">
                                  <button
                                    onClick={() => {
                                      setSelectedBooking(activeBk);
                                      openReportViewer("invoice", String(activeBk.id));
                                    }}
                                    className="flex-1 bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-700 text-xs font-bold py-1 px-1.5 rounded-lg flex items-center justify-center gap-1"
                                    title="طباعة الفاتورة والسند"
                                  >
                                    <Printer size={12} />
                                    الفاتورة
                                  </button>
                                  <button
                                    onClick={() => handleCheckout(activeBk.id)}
                                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-1 px-1.5 rounded-lg text-center"
                                  >
                                    مغادرة/خروج
                                  </button>
                                </div>
                              )}
                              {apt.status === "dirty" && (
                                <button
                                  onClick={() => markApartmentClean(apt.id)}
                                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-neutral-950 text-xs font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1"
                                >
                                  <Check size={14} />
                                  تنظيف منجز (دخول الخدمة)
                                </button>
                              )}
                              {apt.status === "maintenance" && (
                                <button
                                  onClick={() => markApartmentStatus(apt.id, "available")}
                                  className="w-full bg-neutral-700 hover:bg-neutral-800 text-white text-xs font-bold py-1.5 px-3 rounded-lg"
                                >
                                  إنهاء الصيانة والفتح
                                </button>
                              )}
                              {apt.status === "reserved" && (
                                <button
                                  onClick={() => markApartmentStatus(apt.id, "available")}
                                  className="w-full bg-neutral-200 text-neutral-700 hover:bg-neutral-300 text-xs font-bold py-1.5 px-3 rounded-lg"
                                >
                                  إلغاء الحجز المسبق
                                </button>
                              )}
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* General Hotel Performance Overview Bar */}
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5">
              <h3 className="font-bold text-sm text-neutral-800 mb-4">إنتاجية ومؤشرات الفندق اليومية (نزيل)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-neutral-500 font-bold mb-1">المداخيل الإجمالية للفترة</p>
                    <p className="text-2xl font-bold font-mono text-emerald-800">{stats?.revenue?.toLocaleString() || 0} ر.س</p>
                  </div>
                  <TrendingUp className="text-emerald-600" size={32} />
                </div>
                <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-neutral-500 font-bold mb-1">المصروفات والمشتريات</p>
                    <p className="text-2xl font-bold font-mono text-rose-800">{stats?.expenses?.toLocaleString() || 0} ر.س</p>
                  </div>
                  <ArrowDownLeft className="text-rose-600" size={32} />
                </div>
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-neutral-500 font-bold mb-1">صافي الصندوق المتوفر</p>
                    <p className="text-2xl font-bold font-mono text-blue-800">{stats ? (stats.revenue - stats.expenses).toLocaleString() : 0} ر.س</p>
                  </div>
                  <DollarSign className="text-blue-600" size={32} />
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ----------------- TAB 2: ACTIVE GUEST CONTRACTS & INVOICES ----------------- */}
        {activeTab === "contracts" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-neutral-200 flex flex-wrap justify-between items-center gap-4">
                <div>
                  <h3 className="font-bold text-neutral-800 text-base">سجل عقود إيجار النزلاء والفواتير الضريبية</h3>
                  <p className="text-xs text-neutral-500 mt-1">المطابقة للضريبة المضافة في المملكة العربية السعودية 15%</p>
                </div>
                <button
                  onClick={() => refreshData()}
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold py-2 px-4 rounded-lg"
                >
                  تحديث قائمة العقود
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-200">
                    <tr>
                      <th className="px-5 py-3 font-bold text-neutral-700">رقم العقد</th>
                      <th className="px-5 py-3 font-bold text-neutral-700">اسم النزيل / رقم الهوية</th>
                      <th className="px-5 py-3 font-bold text-neutral-700">الشقة</th>
                      <th className="px-5 py-3 font-bold text-neutral-700">فترة الإقامة (ليالي)</th>
                      <th className="px-5 py-3 font-bold text-neutral-700">فاتورة الإقامة الاجمالية</th>
                      <th className="px-5 py-3 font-bold text-neutral-700">المدفوع</th>
                      <th className="px-5 py-3 font-bold text-neutral-700">المتبقي</th>
                      <th className="px-5 py-3 font-bold text-neutral-700">طريقة السداد</th>
                      <th className="px-5 py-3 font-bold text-neutral-700">الحالة</th>
                      <th className="px-5 py-3 font-bold text-neutral-700 text-center">العمليات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {bookings.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-5 py-12 text-center text-neutral-400">
                          لا توجد عقود مسجلة حالياً في نظام نزيل.
                        </td>
                      </tr>
                    ) : (
                      bookings.map(bk => (
                        <tr key={bk.id} className="hover:bg-neutral-50/50">
                          <td className="px-5 py-4 font-mono font-bold text-neutral-900">
                            #{String(bk.id).padStart(5, '0')}
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-bold text-neutral-900">{bk.tenant_name}</p>
                            <p className="text-neutral-500 font-mono mt-0.5 text-[10px]">{bk.guest_id_number} ({bk.guest_nationality})</p>
                          </td>
                          <td className="px-5 py-4 font-bold text-neutral-800">
                            شقة {bk.room_number || bk.apartment_id}
                          </td>
                          <td className="px-5 py-4 font-mono">
                            {bk.check_in} إلى {bk.check_out} ({bk.days_count} ليالي)
                          </td>
                          <td className="px-5 py-4 font-bold text-neutral-950">
                            {bk.total_price?.toFixed(2)} ر.س
                            <span className="block text-[10px] text-neutral-400 font-normal">تشمل 15% ضريبة</span>
                          </td>
                          <td className="px-5 py-4 font-bold text-emerald-700">
                            {bk.paid_amount?.toFixed(2)} ر.س
                          </td>
                          <td className="px-5 py-4 font-bold text-rose-600">
                            {bk.remaining_amount?.toFixed(2)} ر.س
                          </td>
                          <td className="px-5 py-4">
                            <span className="bg-neutral-100 border border-neutral-200 rounded px-2 py-0.5 font-bold">
                              {bk.payment_method === 'mada' ? 'مدى' : bk.payment_method === 'cash' ? 'نقدي' : bk.payment_method === 'credit_card' ? 'فيزا/ماستر' : 'تحويل بنكي'}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-block px-2 py-0.5 rounded font-bold ${
                              bk.status === 'active' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                              bk.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-neutral-100 text-neutral-500'
                            }`}>
                              {bk.status === 'active' ? 'نشط' : bk.status === 'completed' ? 'منتهي ومغلق' : 'ملغي'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <div className="flex justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedBooking(bk);
                                  openReportViewer("invoice", String(bk.id));
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-2.5 rounded flex items-center gap-1"
                                title="طباعة الفاتورة الضريبية ونقاط السداد"
                              >
                                <Printer size={12} />
                                طباعة
                              </button>
                              
                              {bk.remaining_amount > 0 && bk.status === 'active' && (
                                <button
                                  onClick={async () => {
                                    const payAmount = prompt(`أدخل قيمة السند المالي المضافة للنزيل (الحد الأقصى: ${bk.remaining_amount} ريال):`);
                                    if (payAmount && !isNaN(parseFloat(payAmount))) {
                                      const res = await fetch(`/api/bookings/${bk.id}/pay`, {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                          amount: parseFloat(payAmount),
                                          payment_method: "mada"
                                        })
                                      });
                                      if (res.ok) {
                                        alert("تم استلام السند وتقييد المقبوضات وإتلاف الفارق المتبقي.");
                                        refreshData();
                                      }
                                    }
                                  }}
                                  className="bg-yellow-500 hover:bg-yellow-600 text-neutral-900 font-bold py-1 px-2.5 rounded"
                                >
                                  سند قبض
                                </button>
                              )}

                              {bk.status === 'active' && (
                                <button
                                  onClick={() => handleCheckout(bk.id)}
                                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-1 px-2 rounded"
                                >
                                  استلام مغادرة
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB 3: ACCOUNTING MODULE (المحاسبة والقيود المزدوجة) ----------------- */}
        {activeTab === "accounting" && (
          currentUser.role === "admin" ? (
            <Accounting onOpenReportViewer={openReportViewer} />
          ) : (
            <div className="bg-white p-8 md:p-12 rounded-2xl border border-neutral-200 shadow-sm text-center max-w-xl mx-auto my-12" dir="rtl">
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-600">
                <Lock size={32} />
              </div>
              <h3 className="font-extrabold text-neutral-900 text-lg mb-2">النظام المالي والمحاسبي محمي</h3>
              <p className="text-xs text-neutral-500 leading-relaxed mb-6">
                عذراً، يتطلب الوصول إلى شجرة الحسابات، دفاتر الأستاذ، القيود اليومية المحاسبية المزدوجة، ومجموعات الميزانية صلاحية **مدير عام الفندق (Admin)**. 
                أنت مسجل حالياً برتبة (موظف استقبال) وليس لديك أذونات الوصول المالي.
              </p>
              <div className="bg-neutral-50 rounded-xl p-4 border text-[11px] mb-6 text-neutral-600 leading-normal text-right">
                💡 <strong className="text-emerald-800">لتجربة هذه الميزة:</strong> يمكنك ترقية دورك الحالي إلى مدير بضغطة زر واحدة مجاناً من علامة تبويب <strong>"إدارة الشقق وتكويد الفندق"</strong> بالأسفل، أو عبر تسجيل الدخول التلقائي بحساب المدير.
              </div>
            </div>
          )
        )}

        {/* ----------------- TAB 4: HOUSEKEEPING & DISPATCH (النظافة والصيانة) ----------------- */}
        {activeTab === "housekeeping" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-neutral-200 shadow-sm space-y-4">
                <h3 className="font-bold text-neutral-800 text-sm">شاشـة توزيع أعمال التنظيف والتعقيم اليومي</h3>
                <p className="text-xs text-neutral-500">بعد تفعيل المغادرة للنزيل في نظام نزيل، يتم توجيه الشقة مباشرة لقائمة النظافة للحشوات والتعقيم قبل تسكين السائح القادم.</p>

                <div className="space-y-4">
                  {apartments.filter(a => a.status === 'dirty').length === 0 ? (
                    <div className="p-8 text-center text-neutral-400 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                      <CheckCircle className="text-emerald-500 mx-auto mb-2" size={32} />
                      <p className="text-xs font-bold text-emerald-800">كل الشقق نظيفة ومعقمة وجاهزة للتسجيل!</p>
                    </div>
                  ) : (
                    apartments.filter(a => a.status === 'dirty').map(apt => (
                      <div key={apt.id} className="p-4 border border-yellow-200 bg-yellow-50/25 rounded-xl flex flex-wrap justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
                          <span className="w-10 h-10 rounded-full bg-yellow-500/20 text-yellow-800 flex items-center justify-center font-bold text-sm font-mono">
                            {apt.room_number}
                          </span>
                          <div>
                            <h5 className="font-bold text-neutral-900 text-xs">الشقة {apt.name} (الطابق {apt.floor})</h5>
                            <p className="text-[10px] text-neutral-500">بحاجة لتعقيم الفراش وتغيير المناديل وبطاقات الاستقبال</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedCleanApt(apt);
                              setSelectedCleanApt(apt);
                              alert(`تم اسناد مهمة تنظيف الشقة رقم ${apt.room_number} بنجاح إلى العامل المناوب أحمد عثمان.`);
                              markApartmentClean(apt.id);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1"
                          >
                            <UserCheck size={12} />
                            إسناد للعامل المناوب
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Maintenance request sidebar block */}
              <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm space-y-4">
                <h3 className="font-bold text-neutral-800 text-sm">البلاغات الفنية وبلاغات الصيانة</h3>
                <p className="text-xs text-neutral-500">تقييد البلاغات لأعطال المصاعد، التكييف، مواسير المياه الكهربائية مع تحويل حالة الغرفة فورياً لقفل الصيانة.</p>

                <div className="space-y-3">
                  <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-bold text-red-700">تكييف معطل - شقة 202</span>
                      <span className="text-[9px] bg-red-100 text-red-800 px-1 rounded font-bold">بانتظار الصيانة</span>
                    </div>
                    <p className="text-[11px] text-neutral-600">يوجد عطل فني في موزع الهواء الخارجي الكومبروسر وبحاجة لشحن الفريون من مهندسي الصيانة.</p>
                  </div>
                  
                  {/* Create temporary report form clicker */}
                  <button
                    onClick={() => {
                      const roomNo = prompt("أدخل رقم الشقة التي تود تحويلها لغرفة صيانة مغلقة:");
                      if (roomNo) {
                        const target = apartments.find(a => a.room_number === roomNo);
                        if (target) {
                          markApartmentStatus(target.id, "maintenance");
                          alert(`تم تحويل الشقة ${roomNo} إلى وضع صيانة مغلقة بنجاح.`);
                        } else {
                          alert("رقم الشقة غير صحيح.");
                        }
                      }
                    }}
                    className="w-full bg-neutral-800 hover:bg-neutral-950 text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
                  >
                    رصد بلاغ صيانة جديد
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ----------------- TAB 5: APARTMENT DIRECTORIES & SYSTEM USERS (إعدادات طاقم العمل والمنشأة) ----------------- */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            
            {/* Grid for User Profile & Core Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Profile card view */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 border-b pb-4 mb-4">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-black">
                      {currentUser.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-neutral-850 text-sm">الملف التعريفي طاقم العمل</h3>
                      <p className="text-[11px] text-neutral-400 font-mono">ID: #{currentUser.id} | نزيل للاستقبال الفندقي</p>
                    </div>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">اسم الموظف الثلاثي:</span>
                      <span className="font-bold text-neutral-800">{currentUser.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">البريد الإلكتروني التجاري:</span>
                      <span className="font-bold text-neutral-800 font-mono">{currentUser.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">البطاقة المهنية (الدور):</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        currentUser.role === 'admin' ? "bg-emerald-100 text-emerald-800" : "bg-neutral-100 text-neutral-700"
                      }`}>
                        {currentUser.role === 'admin' ? "مدير النظام العام" : "موظف ممتلكات شقيقية"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">سؤال الاستعادة الافتراضي:</span>
                      <span className="font-medium text-amber-800">ما هي مدينتك المفضلة؟</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-neutral-100">
                  <span className="text-[10px] text-neutral-400 font-semibold block">سجل الدخول الحالي</span>
                  <div className="flex justify-between items-center text-xs mt-1">
                    <span className="text-neutral-500">الحالة الأمنية:</span>
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      درع حماية نزيل نشط
                    </span>
                  </div>
                </div>
              </div>

              {/* Password change section */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                <h3 className="font-bold text-neutral-850 text-sm mb-2">تحديث كلمة المرور وأمان الهوية</h3>
                <p className="text-[11px] text-neutral-500 mb-4">اختبار مطابقة سؤال الأمان وتغيير معيار الدخول:</p>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const formData = new FormData(form);
                  try {
                    const res = await fetch("/api/auth/reset-password", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        email: currentUser.email,
                        security_answer: formData.get("sec_answer"),
                        new_password: formData.get("new_pass")
                      })
                    });
                    if (res.ok) {
                      alert("تم تغيير وتحديث كلمة السر الخاصة بحسابك الفندقي بنجاح في النظام.");
                      form.reset();
                    } else {
                      const data = await res.json();
                      alert(data.error || "فشل التحقق من جواب سؤال الأمان السري.");
                    }
                  } catch (err) {
                    console.error(err);
                  }
                }} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 mb-1">الجواب السري لسؤالك (مثال: الرياض)</label>
                    <input required name="sec_answer" placeholder="إجابتك السرية" type="text" className="w-full border rounded-lg p-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 mb-1">الرقم السري التجاري الجديد والمقترح</label>
                    <input required name="new_pass" placeholder="••••••••" minLength={6} type="password" className="w-full border rounded-lg p-2 text-xs" />
                  </div>
                  
                  <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 rounded-lg text-xs transition">
                    تحديث كلمة المرور الفندقية
                  </button>
                </form>
              </div>

            </div>

            {/* Team Management - Only Visible to Admin users */}
            {currentUser.role === "admin" ? (
              <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b pb-3.5">
                  <div>
                    <h3 className="font-extrabold text-neutral-900 text-sm">إدارة طاقم العمل ومستخدمي نظام نزيل</h3>
                    <p className="text-[11px] text-neutral-400">سجل الموظفين النشطين مع إمكانية تعديل الأدوار أو التعليق الإداري الحازم</p>
                  </div>
                  <span className="bg-emerald-150 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-bold">
                    إجمالي الطاقم: {usersList.length} موظفين
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 text-neutral-600 border-b">
                        <th className="p-3 font-bold">رقم التعريف</th>
                        <th className="p-3 font-bold">الاسم التجاري للموظف</th>
                        <th className="p-3 font-bold">البريد الإلكتروني للعمل</th>
                        <th className="p-3 font-bold">رتبة الدخول والتصنيف</th>
                        <th className="p-3 font-bold text-center">الإجراءات والتحكم بالتفويض</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map((usr) => (
                        <tr key={usr.id} className="border-b hover:bg-neutral-50/50">
                          <td className="p-3 font-mono text-neutral-500">#{usr.id}</td>
                          <td className="p-3 font-extrabold text-neutral-800">{usr.name} {usr.id === currentUser.id && "(أنت)"}</td>
                          <td className="p-3 font-mono text-neutral-700">{usr.email}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              usr.role === "admin" ? "bg-emerald-100 text-emerald-800" : "bg-neutral-150 text-neutral-600"
                            }`}>
                              {usr.role === "admin" ? "مدير نظام عام" : "موظف استقبال مالي"}
                            </span>
                          </td>
                          <td className="p-3 flex items-center justify-center gap-2">
                            <button
                              onClick={async () => {
                                if (usr.id === currentUser.id) {
                                  alert("لا يمكنك إلغاء تفويض رتبة الأدمن الخاصة بحسابك بنفسك لتجنب الإغلاق التام.");
                                  return;
                                }
                                const targetRole = usr.role === "admin" ? "user" : "admin";
                                try {
                                  const res = await fetch(`/api/auth/users/${usr.id}/role`, {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ role: targetRole })
                                  });
                                  if (res.ok) {
                                    alert(`تم تحوير وتحديث رتبة الحساب إلى: ${targetRole === "admin" ? "مدير" : "موظف"}`);
                                    fetchUsersList();
                                  } else {
                                    const data = await res.json();
                                    alert(data.error || "فشل تعديل الدور.");
                                  }
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold px-2 py-1 rounded text-[11px]"
                            >
                              تبديل الرتبة
                            </button>
                            <button
                              onClick={async () => {
                                if (usr.id === currentUser.id) {
                                  alert("أنت مسجل الدخول بهذا الحساب حالياً ولا يمكنك حذفه.");
                                  return;
                                }
                                if (!confirm(`هل أنت متأكد من حذف الحساب الآمن التابع لـ ${usr.name}؟`)) return;
                                try {
                                  const res = await fetch(`/api/auth/users/${usr.id}`, { method: "DELETE" });
                                  if (res.ok) {
                                    alert("تم إقصاء وحذف حساب المستخدم بنجاح.");
                                    fetchUsersList();
                                  } else {
                                    const data = await res.json();
                                    alert(data.error || "خطأ في حذف الحساب.");
                                  }
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold px-2 py-1 rounded text-[11px]"
                            >
                              حذف العضو
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-neutral-100 p-5 rounded-2xl border border-dashed text-center space-y-2">
                <Lock size={20} className="mx-auto text-neutral-400" />
                <h4 className="font-bold text-neutral-700 text-xs">إدارة طاقم العمل محجوبة</h4>
                <p className="text-[10px] text-neutral-500">
                  يرجى ملاحظة أن شاشة إدارة الموظفين وتبديل تفويض الصلاحيات تتطلب رتبة مدير عام النظام (Admin).
                </p>
              </div>
            )}

            {/* Room configuration section - ADMIN ONLY */}
            {currentUser.role === "admin" ? (
              <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
                <h3 className="font-bold text-neutral-800 text-sm mb-4">إضافة شقة جديدة لتكوين الفندق (تكويد فندقي)</h3>
                
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const formData = new FormData(form);
                  
                  try {
                    const res = await fetch("/api/apartments", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        room_number: formData.get("room_number"),
                        name: formData.get("name"),
                        type: formData.get("type"),
                        floor: parseInt(formData.get("floor") as string),
                        beds_count: parseInt(formData.get("beds_count") as string),
                        price_per_night: parseFloat(formData.get("price_per_night") as string),
                        description: formData.get("description")
                      })
                    });
                    if (res.ok) {
                      alert("تم تكويد وإدراج الشقة الفندقية الجديدة بنجاح في مخطط الفندق.");
                      form.reset();
                      refreshData();
                    } else {
                      const err = await res.json();
                      alert(err.error || "فشل إضافة وتخزين الشقة.");
                    }
                  } catch (err) {
                    console.error(err);
                  }
                }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">رقم الشقة (فريد)</label>
                    <input required name="room_number" type="text" placeholder="مثال: 401" className="w-full border rounded-lg p-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">الاسم التجاري للمعرف</label>
                    <input required name="name" type="text" placeholder="مثال: شقة أعمال فاخرة 401" className="w-full border rounded-lg p-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">نوع الغرفة/الشقة</label>
                    <select required name="type" className="w-full border rounded-lg p-2 text-xs">
                      <option value="غرفة وصالة">غرفة وصالة</option>
                      <option value="غرفتين وصالة">غرفتين وصالة</option>
                      <option value="ثلاث غرف وصالة">ثلاث غرف وصالة</option>
                      <option value="ستوديو">ستوديو ديلوكس</option>
                      <option value="جناح ملكي فاخر">جناح ملكي فاخر</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">الطابق</label>
                    <input required name="floor" type="number" min="1" max="5" placeholder="الطابق" className="w-full border rounded-lg p-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">عدد الأسرة المتوفرة</label>
                    <input required name="beds_count" type="number" min="1" max="10" placeholder="أسرة" className="w-full border rounded-lg p-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">سعر الليلة المعياري (شامل للضريبة) ر.س</label>
                    <input required name="price_per_night" type="number" placeholder="السعر بالريال" className="w-full border rounded-lg p-2 text-xs" />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-neutral-700 mb-1">وصف شروط الشقة الفندقية والكماليات المتاحة</label>
                    <textarea name="description" placeholder="مكيفات باردة ممتاز، اثاث عائلي متكامل..." className="w-full border rounded-lg p-2 text-xs" rows={2}></textarea>
                  </div>
                  
                  <div className="md:col-span-3 flex justify-end">
                    <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-lg text-xs">
                      تخزين وإضافـة الشقـة
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-neutral-100 p-5 rounded-2xl border border-dashed text-center space-y-2">
                <Lock size={20} className="mx-auto text-neutral-400" />
                <h4 className="font-bold text-neutral-700 text-xs">إضافة الشقق (التكويد الفندقي) محجوبة</h4>
                <p className="text-[10px] text-neutral-500">
                  تأسيس وتكويد شقق جديدة للمنشأة يتطلب أن تسجل الدخول بحساب بصلاحيات مدير عام الفندق (Admin).
                </p>
              </div>
            )}

          </div>
        )}

        {/* ----------------- TAB 6: REPORTS & STATS (التقارير المالية والتحليلات) ----------------- */}
        {activeTab === "reports" && (
          currentUser.role === "admin" ? (
            <Reports onOpenReportViewer={openReportViewer} />
          ) : (
            <div className="bg-white p-8 md:p-12 rounded-2xl border border-neutral-200 shadow-sm text-center max-w-xl mx-auto my-12" dir="rtl">
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-600">
                <Lock size={32} />
              </div>
              <h3 className="font-extrabold text-neutral-900 text-lg mb-2">تقارير الإدارة محظورة</h3>
              <p className="text-xs text-neutral-500 leading-relaxed mb-6">
                عذراً، يتطلب الوصول إلى شاشة التقارير والقرارات التحليلية للمنشأة الفندقية صلاحية **مدير عام الفندق (Admin)**. 
                أنت مسجل حالياً برتبة (موظف استقبال) لتأمين المعاملات والسياسات المالية الكلية.
              </p>
              <div className="bg-neutral-50 rounded-xl p-4 border text-[11px] mb-6 text-neutral-600 leading-normal text-right">
                💡 <strong className="text-emerald-800">لتجربة هذه الميزة:</strong> انتقل لتبويب الإعدادات بالأسفل وقم بترقية دورك الحالي، أو سجّل الدخول بحساب المدير مسبق الحساب.
              </div>
            </div>
          )
        )}

      </main>

      {/* ----------------- MODAL: QUICK CHECK-IN (تسكين سريع) ----------------- */}
      {checkinModalOpen && selectedApartment && (
        <div className="fixed inset-0 bg-neutral-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative" dir="rtl">
            <button 
              onClick={() => setCheckinModalOpen(false)}
              className="absolute left-4 top-4 text-neutral-400 hover:text-neutral-700"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 border-b border-neutral-100 pb-3 mb-4">
              <span className="w-10 h-10 bg-emerald-100 rounded-full text-emerald-700 flex items-center justify-center font-bold">
                {selectedApartment.room_number}
              </span>
              <div>
                <h4 className="font-bold text-neutral-900 text-sm">عقد تسكين سريع - الشقة {selectedApartment.room_number}</h4>
                <p className="text-[11px] text-neutral-500">القيمة الإيجارية المعتمدة: {selectedApartment.price_per_night} ريال سعودي / ليلة</p>
              </div>
            </div>

            <form onSubmit={submitCheckin} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">اسم النزيل الثلاثي</label>
                  <input
                    required
                    type="text"
                    placeholder="مثال: راكان عصام القحطاني"
                    value={newBooking.tenant_name}
                    onChange={e => setNewBooking({ ...newBooking, tenant_name: e.target.value })}
                    className="w-full border rounded-lg p-2 text-xs outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">رقم جوال العميل</label>
                  <input
                    required
                    type="tel"
                    placeholder="مثال: 0501234567"
                    value={newBooking.guest_phone}
                    onChange={e => setNewBooking({ ...newBooking, guest_phone: e.target.value })}
                    className="w-full border rounded-lg p-2 text-xs outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">نوع وتوثيق الهوية</label>
                  <select
                    value={newBooking.guest_id_type}
                    onChange={e => setNewBooking({ ...newBooking, guest_id_type: e.target.value })}
                    className="w-full border rounded-lg p-2 text-xs outline-none bg-white"
                  >
                    <option value="national_id">هوية وطنية</option>
                    <option value="residency_id">إقامة نظامية</option>
                    <option value="passport">جواز سفر</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">رقم الهوية / الإقامة</label>
                  <input
                    required
                    type="text"
                    placeholder="مثال: 1098234851"
                    value={newBooking.guest_id_number}
                    onChange={e => setNewBooking({ ...newBooking, guest_id_number: e.target.value })}
                    className="w-full border rounded-lg p-2 text-xs outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">الجنسية</label>
                  <input
                    type="text"
                    placeholder="مثال: سعودي"
                    value={newBooking.guest_nationality}
                    onChange={e => setNewBooking({ ...newBooking, guest_nationality: e.target.value })}
                    className="w-full border rounded-lg p-2 text-xs outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">عدد أيام / ليالي الإقامة</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={newBooking.days_count}
                    onChange={e => {
                      const days = parseInt(e.target.value || "1");
                      // Default deposit to total standard price
                      setNewBooking({ 
                        ...newBooking, 
                        days_count: days,
                        paid_amount: days * selectedApartment.price_per_night 
                      });
                    }}
                    className="w-full border rounded-lg p-2 text-xs outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">تاريخ الدخول</label>
                  <input required type="date" className="w-full border rounded-lg p-2 text-xs" defaultValue="2026-05-22" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">تاريخ الخروج المتوقع</label>
                  <input required type="date" className="w-full border rounded-lg p-2 text-xs" defaultValue="2026-05-23" />
                </div>
              </div>

              {/* Automatic accounting calculation preview card inside modal */}
              <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 text-xs space-y-2">
                <p className="font-bold text-neutral-800">تفاصيل الحساب المالي (حسب لوائح الهيئة السعودية للسياحة):</p>
                <div className="grid grid-cols-2 gap-2 text-neutral-600">
                  <p>قيمة الإقامة الصافية:</p>
                  <p className="text-left font-mono">{(newBooking.days_count * selectedApartment.price_per_night / 1.15).toFixed(2)} ر.س</p>
                  <p>الضريبة المضافة للخدمات الفندقية (15%):</p>
                  <p className="text-left font-mono">{(newBooking.days_count * selectedApartment.price_per_night - (newBooking.days_count * selectedApartment.price_per_night / 1.15)).toFixed(2)} ر.س</p>
                  <div className="col-span-2 border-t border-neutral-200 my-1"></div>
                  <p className="font-bold text-neutral-800">المبلغ الإجمالي المطلق (شامل للضريبة):</p>
                  <p className="text-left font-mono font-bold text-emerald-800">{(newBooking.days_count * selectedApartment.price_per_night).toFixed(2)} ر.س</p>
                </div>
              </div>

              {/* Deposit submission */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">المبلغ المقبوض حالياً (ريال)</label>
                  <input
                    type="number"
                    max={newBooking.days_count * selectedApartment.price_per_night}
                    value={newBooking.paid_amount}
                    onChange={e => setNewBooking({ ...newBooking, paid_amount: parseFloat(e.target.value || "0") })}
                    className="w-full border rounded-lg p-2 text-xs outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">قناة الدفع المستعملة</label>
                  <select
                    value={newBooking.payment_method}
                    onChange={e => setNewBooking({ ...newBooking, payment_method: e.target.value })}
                    className="w-full border rounded-lg p-2 text-xs outline-none bg-white"
                  >
                    <option value="mada">مدى (Mada Card)</option>
                    <option value="cash">نقدي (كاش في الصندوق)</option>
                    <option value="credit_card">فيزا / ماستركارد</option>
                    <option value="bank_transfer">حوالة مصرفية فورية</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">ملاحظات وطلبات النزيل الإضافية</label>
                <textarea
                  value={newBooking.notes}
                  onChange={e => setNewBooking({ ...newBooking, notes: e.target.value })}
                  placeholder="طلب سجادة صلاة، سرير إضافي، تسجيل متأخر..."
                  className="w-full border rounded-lg p-2 text-xs outline-none"
                  rows={2}
                ></textarea>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setCheckinModalOpen(false)}
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold py-2 px-5 rounded-lg"
                >
                  إلغاء المعاملة
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-6 rounded-lg shadow-sm"
                >
                  حفظ وتسجيل عقد الدخول
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: PRINT EXQUISITE TAX INVOICE (الفاتورة الضريبية المبسطة) ----------------- */}
      {invoiceModalOpen && selectedBooking && (
        <div className="fixed inset-0 bg-neutral-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto invoice-modal-overlay-container no-print-backdrop">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative text-neutral-950 font-sans printable-invoice-card print-area" dir="rtl">
            
            <button
              onClick={() => setInvoiceModalOpen(false)}
              className="absolute left-4 top-4 text-neutral-400 hover:text-neutral-700 bg-neutral-100 p-1.5 rounded-full"
            >
              <X size={16} />
            </button>

            {/* Print friendly zone */}
            <div id="print-area" className="p-2 space-y-4 border border-neutral-100 rounded-md">
              
              <div className="text-center pb-3 border-b border-dashed border-neutral-350">
                <span className="text-[10px] bg-neutral-100 border text-neutral-600 px-2 py-0.5 rounded-full font-bold">
                  المملكة العربية السعودية
                </span>
                <h3 className="font-bold text-sm text-neutral-900 mt-2">شقق نزيل السكنية الفاخرة</h3>
                <p className="text-[9px] text-neutral-500 mt-0.5">الرقم الضريبي الموحد: 300482930200003</p>
                <h4 className="font-bold text-xs bg-emerald-600 text-white rounded py-1 px-3 mt-3">
                  فاتورة ضريبية مبسطة / سند قبض
                </h4>
              </div>

              {/* Invoice Meta */}
              <div className="text-[10px] space-y-1 text-neutral-700 font-mono">
                <p className="grid grid-cols-2">
                  <span>رقم الفاتورة:</span>
                  <span className="text-left font-bold text-neutral-900">#{String(selectedBooking.id).padStart(5, '0')}</span>
                </p>
                <p className="grid grid-cols-2">
                  <span>تاريخ الصدور:</span>
                  <span className="text-left">{selectedBooking.created_at || "2026-05-22"}</span>
                </p>
                <p className="grid grid-cols-2">
                  <span>رقم الشقة المحجوزة:</span>
                  <span className="text-left font-bold">{selectedBooking.room_number || "102"}</span>
                </p>
                <p className="grid grid-cols-2">
                  <span>النزيل المحترم:</span>
                  <span className="text-left font-bold">{selectedBooking.tenant_name}</span>
                </p>
                <p className="grid grid-cols-2">
                  <span>رقم هوية العميل:</span>
                  <span className="text-left">{selectedBooking.guest_id_number}</span>
                </p>
                <p className="grid grid-cols-2">
                  <span>عدد الأيام المتفق عليها:</span>
                  <span className="text-left">{selectedBooking.days_count} في ليلة</span>
                </p>
              </div>

              {/* Costing Breakdowns */}
              <div className="border-t border-b border-dashed border-neutral-300 py-3 space-y-1.5 text-xs">
                <p className="flex justify-between text-neutral-700">
                  <span>أجر الإقامة الصافي:</span>
                  <span className="font-mono">{selectedBooking.subtotal?.toFixed(2)} ر.س</span>
                </p>
                <p className="flex justify-between text-neutral-700">
                  <span>ضريبة القيمة المضافة (15%):</span>
                  <span className="font-mono">{selectedBooking.vat_amount?.toFixed(2)} ر.س</span>
                </p>
                <div className="border-t border-neutral-200"></div>
                <p className="flex justify-between font-bold text-neutral-950 text-sm">
                  <span>المبلغ الإجمالي الشامل:</span>
                  <span className="font-mono">{selectedBooking.total_price?.toFixed(2)} ر.س</span>
                </p>
                <p className="flex justify-between text-emerald-700 font-bold">
                  <span>المدفوع الواصل حالياً:</span>
                  <span className="font-mono">{selectedBooking.paid_amount?.toFixed(2)} ر.س</span>
                </p>
                <p className="flex justify-between text-rose-600 font-bold">
                  <span>المتبقي ذمة مالية:</span>
                  <span className="font-mono">{selectedBooking.remaining_amount?.toFixed(2)} ر.س</span>
                </p>
              </div>

              {/* Saudi Zatca QR Code Simulator */}
              <div className="flex flex-col items-center justify-center p-2 pt-1">
                <div className="border border-neutral-300 p-2 bg-white rounded-lg">
                  <div className="grid grid-cols-5 gap-0.5 w-24 h-24 bg-neutral-900 border border-neutral-950">
                    {/* Simulated pixelated QR pattern block */}
                    {[...Array(25)].map((_, i) => (
                      <div key={i} className={`w-full h-full ${i % 3 === 0 || i % 4 === 1 ? 'bg-white' : 'bg-neutral-900'}`} />
                    ))}
                  </div>
                </div>
                <p className="text-[8px] text-neutral-500 mt-2 text-center line-clamp-1">فاتورة مدعومة بهزات الرمز السحابي لهيئة الزكاة</p>
              </div>

            </div>

            <div className="mt-4 flex gap-2 no-print">
              <button
                onClick={() => {
                  setTimeout(() => {
                    window.print();
                  }, 500);
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 font-bold py-2 rounded-lg text-white text-xs flex items-center justify-center gap-2"
              >
                <Printer size={14} />
                 طباعة وحفظ PDF
              </button>
              <button
                onClick={() => setInvoiceModalOpen(false)}
                className="bg-neutral-100 hover:bg-neutral-200 font-bold py-2 px-4 rounded-lg text-neutral-700 text-xs"
              >
                إغلاق الفاتورة
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ----------------- MODAL: CREATE MANUAL TRANSACTION (انشاء مستند قبض/صرف) ----------------- */}
      {txModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative" dir="rtl">
            <button
              onClick={() => setTxModalOpen(false)}
              className="absolute left-4 top-4 text-neutral-400 hover:text-neutral-700"
            >
              <X size={20} />
            </button>

            <h4 className="font-bold text-neutral-950 text-base mb-4 border-b border-neutral-100 pb-2">
              {newTx.type === 'receipt_in' ? 'إصدار سند قبض نقدية جديد' : 'إصدار سند صرف مصروفات ومشتريات'}
            </h4>

            <form onSubmit={submitTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1">
                  {newTx.type === 'receipt_in' ? 'اسم العميل / المستلم منه (الدافع)' : 'الجهة المستفيدة / المورد (المستلم للمبلغ)'}
                </label>
                <input
                  required
                  type="text"
                  placeholder={newTx.type === 'receipt_in' ? "مثال: ركان عصام القحطاني" : "مثال: شركة التوريدات الكهربائية المحدودة"}
                  value={newTx.beneficiary}
                  onChange={e => setNewTx({ ...newTx, beneficiary: e.target.value })}
                  className="w-full border rounded-lg p-2.5 text-xs outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1">المبلغ المالي المطلق (ريال)</label>
                <input
                  required
                  type="number"
                  placeholder="مثال: 450"
                  value={newTx.amount}
                  onChange={e => setNewTx({ ...newTx, amount: e.target.value })}
                  className="w-full border rounded-lg p-2.5 text-xs outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1">طريقة المعالجة والسداد</label>
                <select
                  value={newTx.payment_method}
                  onChange={e => setNewTx({ ...newTx, payment_method: e.target.value })}
                  className="w-full border rounded-lg p-2.5 text-xs outline-none bg-white"
                >
                  <option value="cash">نقداً (كاش بالدرج)</option>
                  <option value="mada">مدى (Mada)</option>
                  <option value="credit_card">فيزا كارد</option>
                  <option value="bank_transfer">تحويل فوري راجحي/أهلي</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1">البيان المالي والوصف بالتفصيل</label>
                <textarea
                  required
                  rows={3}
                  placeholder="اذكر وصف المعاملة بدقة لتسهيل التدقيق والتقارير..."
                  value={newTx.description}
                  onChange={e => setNewTx({ ...newTx, description: e.target.value })}
                  className="w-full border rounded-lg p-2.5 text-xs outline-none"
                ></textarea>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setTxModalOpen(false)}
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold py-2 px-5 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className={`text-white text-xs font-bold py-2 px-6 rounded-lg ${
                    newTx.type === 'receipt_in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  حفظ وتسجيل السند
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer Branded Zone */}
      <footer className="bg-neutral-900 text-neutral-400 py-6 border-t border-neutral-800 text-center text-xs mt-12 select-none print:hidden">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="font-bold text-neutral-300">نظام نزيل السحابي الفندقـي لقفل الشقوق والغرف © 2026</p>
          <p className="text-[10px] text-neutral-500">مبني ومطور على أحدث هياكل وتثبيبات قواعد البيانات السريعة والضريبة السعودية المضافة Simplified Tax Invoice</p>
        </div>
      </footer>

      {/* Unified Report and Documents Print Viewer Portal Modal Overlay */}
      {reportViewerOpen && (
        <ReportViewer
          initialReportType={reportViewerType}
          initialSelectedId={reportViewerSelectedId}
          bookingsProps={bookings}
          transactionsProps={transactions}
          apartmentsProps={apartments}
          onClose={() => setReportViewerOpen(false)}
        />
      )}

    </div>
  );
}
