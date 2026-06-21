import React, { useState } from "react";
import { apiFetch as fetch } from "../lib/api";
import { 
  Lock, 
  Mail, 
  Sparkles, 
  UserPlus, 
  KeyRound, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Activity 
} from "lucide-react";

interface AuthGateProps {
  onLoginSuccess: (user: any) => void;
}

export default function AuthGate({ onLoginSuccess }: AuthGateProps) {
  const [tab, setTab] = useState<"login" | "register" | "forgot">("login");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("ما هي مدينتك المفضلة؟");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleDemoLogin = async (demoEmail: string, demoPass: string) => {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: demoEmail, password: demoPass })
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("nazeel_auth_token", data.token);
        setSuccessMessage("تم تسجيل الدخول بنجاح! جاري تحويلك للمخطط...");
        setTimeout(() => {
          onLoginSuccess(data.user);
        }, 800);
      } else {
        setErrorMessage(data.error || "فشل تسجيل الدخول التلقائي للمحاكاة.");
      }
    } catch (err: any) {
      setErrorMessage("حدث خطأ في الاتصال بالخادم الرئيسي.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    if (!email || !password) {
      setErrorMessage("الرجاء إدخال البريد الإلكتروني وكلمة المرور.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("nazeel_auth_token", data.token);
        setSuccessMessage("أهلاً بك مجدداً! تم التحقق من الهوية وصلاحية الوصول.");
        setTimeout(() => {
          onLoginSuccess(data.user);
        }, 1000);
      } else {
        setErrorMessage(data.error || "البريد الإلكتروني أو كلمة المرور غير صحيحة.");
      }
    } catch {
      setErrorMessage("فشل الاتصال بخدمة نزيل السحابية.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!name || !email || !password || !confirmPassword || !securityAnswer) {
      setErrorMessage("الرجاء تعبئة كافة الحقول المطلوبة لإنشاء الحساب.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("كلمتا المرور غير متطابقتين.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name,
          security_question: securityQuestion,
          security_answer: securityAnswer
        })
      });

      const data = await response.json();
      if (response.ok) {
        setSuccessMessage("تم تسجيل حسابك الفندقي الآمن بنجاح! يمكنك الآن تسجيل الدخول.");
        setTab("login");
        // Pre-fill login email
        setPassword("");
      } else {
        setErrorMessage(data.error || "خطأ أثناء محاولة تسجيل الحساب بالفندق.");
      }
    } catch {
      setErrorMessage("حدث عطل في الاتصال مع قاعدة البيانات السحابية.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!email || !securityAnswer || !newPassword) {
      setErrorMessage("الرجاء ملء البريد، إجابة الأمان، وكلمة المرور الجديدة.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          security_answer: securityAnswer,
          new_password: newPassword
        })
      });

      const data = await response.json();
      if (response.ok) {
        setSuccessMessage("تم إعادة تعيين كلمة المرور بنجاح! الرجاء الدخول بكلمة المرور الجديدة.");
        setTab("login");
        setPassword("");
        setNewPassword("");
      } else {
        setErrorMessage(data.error || "إجابة الأمان المدخلة خاطئة أو الحساب غير موجود.");
      }
    } catch {
      setErrorMessage("خطأ في الاتصال بالشبكة السحابية.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden" dir="rtl">
      {/* Visual Ambient Background Orbits */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-emerald-500/10 blur-[120px] -top-48 -right-48 pointer-events-none"></div>
      <div className="absolute w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-[100px] -bottom-48 -left-48 pointer-events-none"></div>

      {/* Auth Container */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl z-10 transition-all duration-300">
        
        {/* Nazeel Hotel Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex justify-center items-center w-16 h-16 bg-gradient-to-br from-emerald-600 to-teal-800 rounded-2xl shadow-lg shadow-emerald-900/40 border border-emerald-500/30 mb-4 animate-pulse">
            <Sparkles className="text-emerald-100" size={32} />
          </div>
          <div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="bg-yellow-400 text-slate-950 text-[10px] font-extrabold px-1.5 py-0.5 rounded tracking-wider">
                نزيل السحابي
              </span>
              <h1 className="text-2xl font-black text-white tracking-tight">نظام الـبوابة الموحّدة</h1>
            </div>
            <p className="text-xs text-slate-400 font-medium">إدارة الشقق الفندقية والعقود والأموال المتكاملة</p>
          </div>
        </div>

        {/* Action Tabs Selector */}
        <div className="grid grid-cols-3 bg-slate-950 border border-slate-800 p-1.5 rounded-2xl mb-6">
          <button 
            onClick={() => { setTab("login"); setErrorMessage(""); }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              tab === "login" 
                ? "bg-emerald-600 text-white shadow" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            تسجيل الدخول
          </button>
          <button 
            onClick={() => { setTab("register"); setErrorMessage(""); }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              tab === "register" 
                ? "bg-emerald-600 text-white shadow" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            إنشاء حساب
          </button>
          <button 
            onClick={() => { setTab("forgot"); setErrorMessage(""); }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              tab === "forgot" 
                ? "bg-emerald-600 text-white shadow" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            استعادة كلمة السر
          </button>
        </div>

        {/* Response Alert messages */}
        {errorMessage && (
          <div className="bg-red-950/60 border border-red-500/40 text-red-200 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs mb-5 animate-shake">
            <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-100 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs mb-5">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {/* 1. Log In Form */}
        {tab === "login" && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-300 text-[11px] font-bold mb-1.5">البريد الإلكتروني للعمل</label>
              <div className="relative">
                <span className="absolute right-3.5 top-3 text-slate-500">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  required
                  placeholder="name@nazeel.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-2.5 pr-11 pl-4 text-xs font-medium focus:border-emerald-500 focus:outline-none transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 text-[11px] font-bold mb-1.5">كلمة المرور الخاصة بالمستخدم</label>
              <div className="relative">
                <span className="absolute right-3.5 top-3 text-slate-500">
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-2.5 pr-11 pl-11 text-xs font-medium focus:border-emerald-500 focus:outline-none transition-all placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-3 text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold py-3 rounded-xl text-xs shadow-md transition-all active:scale-[0.98] disabled:opacity-50 flex justify-center items-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Activity size={16} className="animate-spin text-white" />
                  <span>برجاء الانتظار...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  <span>دخول منصّة نزيل الآمنة</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* 2. Sign Up (Register) Form */}
        {tab === "register" && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-300 text-[11px] font-bold mb-1.5">الاسم التجاري الكامل للموظف/المدير</label>
              <input
                type="text"
                required
                placeholder="راكان عصام القحطاني"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-2.5 px-4 text-xs font-medium focus:border-emerald-500 focus:outline-none transition-all placeholder:text-slate-600"
              />
            </div>

            <div>
              <label className="block text-slate-300 text-[11px] font-bold mb-1.5">البريد الإلكتروني للعمل الجديد</label>
              <input
                type="email"
                required
                placeholder="name@nazeel.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-2.5 px-4 text-xs font-medium focus:border-emerald-500 focus:outline-none transition-all placeholder:text-slate-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-35">
              <div>
                <label className="block text-slate-300 text-[11px] font-bold mb-1.5">كلمة السر</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-2.5 px-4 text-xs font-medium focus:border-emerald-500 focus:outline-none transition-all placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="block text-slate-300 text-[11px] font-bold mb-1.5">تأكيد كلمة السر</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-2.5 px-4 text-xs font-medium focus:border-emerald-500 focus:outline-none transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="border-t border-slate-805/50 pt-3">
              <label className="block text-amber-300 text-[10px] font-semibold mb-1">إجراء الأمان الذاتي (مطلوب لاستعادة كلمة السر)</label>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-3">
                <div>
                  <label className="block text-slate-400 text-[10px] mb-1">اختر سؤال أمان سري</label>
                  <select
                    value={securityQuestion}
                    onChange={(e) => setSecurityQuestion(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg p-2 text-[11px] font-medium"
                  >
                    <option value="ما هي مدينتك المفضلة؟">ما هي مدينتك المفضلة؟</option>
                    <option value="ما هو اسم شقة طفولتك الأولى؟">ما هو اسم شقة طفولتك الأولى؟</option>
                    <option value="ما هو اسم مدرسة صباك؟">ما هو اسم مدرسة صباك؟</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] mb-1">الجواب السري (غير قابل للتخمين)</label>
                  <input
                    type="text"
                    required
                    placeholder="الرياض"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    className="w-full bg-slate-905 border border-slate-800 text-white rounded-lg p-2 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-xs transition active:scale-[0.98] disabled:opacity-50 flex justify-center items-center gap-2 mt-2"
            >
              {loading ? (
                <Activity size={16} className="animate-spin" />
              ) : (
                <>
                  <UserPlus size={16} />
                  <span>تثبيت وتسجيل العضوية الجديدة</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* 3. Forgot Password Form */}
        {tab === "forgot" && (
          <form onSubmit={handleResetSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-300 text-[11px] font-bold mb-1.5">البريد الإلكتروني للعمل لاستعادته</label>
              <input
                type="email"
                required
                placeholder="name@nazeel.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-2.5 px-4 text-xs font-medium focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="bg-slate-950 border border-slate-830/40 p-3 rounded-xl space-y-2">
              <span className="text-[10px] text-amber-300 font-bold block">🔒 التحقق البيومتري من سؤال الأمان لتجاوز الهوية</span>
              <p className="text-[10px] text-slate-400">سوف نقوم بمطابقة الجواب المدخل بالملف لحقن كلمة السر الجديدة.</p>
              <div>
                <label className="block text-slate-300 text-[10px] mb-1">سؤال الأمان الافتراضي (أو جواب سؤالك): ما هي مدينتك المفضلة؟</label>
                <input
                  type="text"
                  required
                  placeholder="أدخل جوابك المحفوظ (مثلاً: الرياض)"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg p-2 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 text-[11px] font-bold mb-1.5">أدخل كلمة المرور الفندقية الجديدة</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-2.5 px-4 text-xs focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-bold py-3 rounded-xl text-xs transition active:scale-[0.98] disabled:opacity-50 flex justify-center items-center gap-2 mt-2"
            >
              {loading ? (
                <Activity size={16} className="animate-spin" />
              ) : (
                <>
                  <KeyRound size={16} />
                  <span>توليد وتجربة كلمة سر جديدة</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Branded Sandboxed Live Simulation Panel */}
        <div className="border-t border-slate-800/80 pt-5 mt-6">
          <div className="bg-slate-950 rounded-2xl p-4 border border-emerald-950">
            <h4 className="text-yellow-400 text-[10px] font-black tracking-wide uppercase flex items-center gap-1.5 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-bounce"></span>
              قالب المحاكاة السريع للاختبار التجاري (1-Click Test)
            </h4>
            <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
              لتسهيل المراجعة الأمنية وصلاحية الأدوار، يمنحك نظام نزيل تجربة مسبقة للحسابات الأساسية بنقرة واحدة بدون كتابة:
            </p>
            
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleDemoLogin("admin@nazeel.com", "admin123")}
                disabled={loading}
                className="bg-emerald-990 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-100 py-1.5 px-2 rounded-xl text-[10px] font-bold transition flex items-center justify-center gap-1.5 hover:scale-[1.02]"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                أدمن (مدير كامل)
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin("staff@nazeel.com", "staff123")}
                disabled={loading}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-slate-200 py-1.5 px-2 rounded-xl text-[10px] font-bold transition flex items-center justify-center gap-1.5 hover:scale-[1.02]"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                موظف (استقبال)
              </button>
            </div>
            <div className="text-[9px] text-slate-600 mt-2 text-center" dir="ltr">
              Admin: admin@nazeel.com / admin123 | Staff: staff@nazeel.com / staff123
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
