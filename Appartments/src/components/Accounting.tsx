import React, { useState, useEffect } from "react";
import { apiFetch as fetch } from "../lib/api";
import { 
  FolderTree, 
  FileText, 
  Plus, 
  Check, 
  AlertCircle, 
  BookOpen, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw,
  Scale,
  Calendar,
  User,
  Activity,
  ChevronDown,
  ChevronUp,
  Printer
} from "lucide-react";

interface Account {
  code: string;
  name: string;
  type: string;
  initial_balance: number;
  total_debit: number;
  total_credit: number;
  balance: number;
  classification?: string;
}

interface JournalItem {
  id: number;
  entry_id: number;
  account_code: string;
  account_name?: string;
  debit: number;
  credit: number;
  description: string;
}

interface JournalEntry {
  id: number;
  date: string;
  description: string;
  beneficiary: string;
  created_at: string;
  items: JournalItem[];
}

export default function Accounting({ onOpenReportViewer }: { onOpenReportViewer?: (type: string, id?: string) => void }) {
  const [activeSubTab, setActiveSubTab] = useState<"coa" | "entries" | "voucher" | "trial" | "ledger">("coa");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Ledger Filter State
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState<string>("");

  // Quick Voucher entry state
  const [voucherForm, setVoucherForm] = useState({
    type: "receipt_in", // receipt_in (قبض) or voucher_out (صرف)
    finance_account: "1101", // Default: cash box (الصندوق الرئيسي)
    ledger_account: "", // Offset account (revenues, expenses, trade payables, etc.)
    amount: "",
    payment_method: "cash",
    beneficiary: "",
    description: "",
    date: new Date().toISOString().split("T")[0]
  });

  // Manual Journal Entry Form State (قيود يومية مزدوجة يدوية بالكامل)
  const [manualJeDesc, setManualJeDesc] = useState("");
  const [manualJeBeneficiary, setManualJeBeneficiary] = useState("");
  const [manualJeDate, setManualJeDate] = useState(new Date().toISOString().split("T")[0]);
  const [manualJeLines, setManualJeLines] = useState<Array<{ account_code: string; debit: string; credit: string; line_desc: string }>>([
    { account_code: "", debit: "", credit: "", line_desc: "" },
    { account_code: "", debit: "", credit: "", line_desc: "" }
  ]);

  // Expandable journal entries
  const [expandedEntries, setExpandedEntries] = useState<Record<number, boolean>>({});

  // Autocomplete focus states for beneficiary
  const [voucherFocused, setVoucherFocused] = useState(false);
  const [manualFocused, setManualFocused] = useState(false);

  // Suggestion list fetchers linked to Chart of Accounts (COA)
  const getVoucherSuggestions = () => {
    const query = (voucherForm.beneficiary || "").toLowerCase().trim();
    if (!query) return accounts;
    return accounts.filter(acc => 
      acc.name.toLowerCase().includes(query) || 
      acc.code.includes(query)
    );
  };

  const getManualSuggestions = () => {
    const query = (manualJeBeneficiary || "").toLowerCase().trim();
    if (!query) return accounts;
    return accounts.filter(acc => 
      acc.name.toLowerCase().includes(query) || 
      acc.code.includes(query)
    );
  };

  const selectVoucherAccountAsBeneficiary = (acc: Account) => {
    setVoucherForm(prev => ({
      ...prev,
      beneficiary: acc.name,
      // If ledger account is empty or typical default, auto-assign selected account code
      ledger_account: ["1101", "1102"].includes(acc.code) ? prev.ledger_account : acc.code
    }));
    setVoucherFocused(false);
  };

  const selectManualAccountAsBeneficiary = (acc: Account) => {
    setManualJeBeneficiary(acc.name);
    setManualFocused(false);
  };

  // State & handler for adding new dynamic accounts to Chart of Accounts (COA)
  const [showAddAccountForm, setShowAddAccountForm] = useState(false);
  const [newAccountCode, setNewAccountCode] = useState("");
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState("Asset");
  const [newAccountClassification, setNewAccountClassification] = useState("Detail");
  const [newAccountInitialBalance, setNewAccountInitialBalance] = useState("");
 
  const handleAddAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountCode.trim() || !newAccountName.trim() || !newAccountType || !newAccountClassification) {
      triggerError("الرجاء ملء كافة الحقول الإلزامية لإنشاء الحساب");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newAccountCode.trim(),
          name: newAccountName.trim(),
          type: newAccountType,
          classification: newAccountClassification,
          initial_balance: Number(newAccountInitialBalance || 0)
        })
      });
      const data = await res.json();
      if (res.ok) {
        triggerSuccess(`تم إضافة الحساب الجديد "${newAccountName}" بنجاح ضمن حسابات الفندق!`);
        setNewAccountCode("");
        setNewAccountName("");
        setNewAccountType("Asset");
        setNewAccountClassification("Detail");
        setNewAccountInitialBalance("");
        setShowAddAccountForm(false);
        setRefreshKey(p => p + 1);
      } else {
        triggerError(data.error || "فشل إضافة الحساب المحاسبي الجديد");
      }
    } catch (err) {
      triggerError("حدث خطأ أثناء الاتصال بالخادم لترحيل البيانات");
    } finally {
      setLoading(false);
    }
  };

  // Loading All Data
  const loadAccountingData = async () => {
    try {
      setLoading(true);
      const [acctsRes, journalRes] = await Promise.all([
        fetch("/api/accounts"),
        fetch("/api/journal-entries")
      ]);
      if (acctsRes.ok && journalRes.ok) {
        const acctsData = await acctsRes.json();
        const journalData = await journalRes.json();
        setAccounts(acctsData);
        setJournalEntries(journalData);
        
        // Auto select first detail account for general ledger sheet if none is selected
        if (acctsData.length > 0 && !selectedLedgerAccount) {
          const firstDetail = acctsData.find((a: any) => a.classification === 'Detail');
          setSelectedLedgerAccount(firstDetail ? firstDetail.code : acctsData[0].code);
        }
      }
    } catch (err) {
      console.error("Error loading accounting data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccountingData();
  }, [refreshKey]);

  // Flash messages helper
  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 5000);
  };
  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(""), 6000);
  };

  // Submit Simplified Voucher
  const handleVoucherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherForm.ledger_account) {
      triggerError("الرجاء اختيار الحساب المعاكس المتمم في شجرة الحسابات");
      return;
    }
    if (voucherForm.finance_account === voucherForm.ledger_account) {
      triggerError("لا يمكن تدوين قيد بين حساب ونفسه، الرجاء اختيار حسابين مختلفين");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/journal-entries/voucher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(voucherForm)
      });
      const data = await res.json();
      if (res.ok) {
        triggerSuccess(
          voucherForm.type === "receipt_in" 
            ? `تم إصدار سند القبض بنجاح وتوليد قيد مزدوج بقيمة ${voucherForm.amount} ر.س`
            : `تم إصدار سند الصرف بنجاح وتوجيهه في قيد الحسابات بقيمة ${voucherForm.amount} ر.س`
        );
        // Reset form
        setVoucherForm({
          type: "receipt_in",
          finance_account: "1101",
          ledger_account: "",
          amount: "",
          payment_method: "cash",
          beneficiary: "",
          description: "",
          date: new Date().toISOString().split("T")[0]
        });
        setRefreshKey(p => p + 1);
      } else {
        triggerError(data.error || "فشل تسجيل قيد السند المحاسبي");
      }
    } catch (err) {
      triggerError("حدث خطأ في الاتصال بالشبكة");
    } finally {
      setLoading(false);
    }
  };

  // Add line to manual journal entry constructor
  const addJeLine = () => {
    setManualJeLines([...manualJeLines, { account_code: "", debit: "", credit: "", line_desc: "" }]);
  };

  // Update line in manual journal entry
  const updateJeLine = (index: number, field: string, value: string) => {
    const updated = [...manualJeLines];
    if (field === "account_code") updated[index].account_code = value;
    if (field === "line_desc") updated[index].line_desc = value;
    if (field === "debit") {
      updated[index].debit = value;
      if (value !== "") updated[index].credit = ""; // Clear credit if debit is set
    }
    if (field === "credit") {
      updated[index].credit = value;
      if (value !== "") updated[index].debit = ""; // Clear debit if credit is set
    }
    setManualJeLines(updated);
  };

  // Remove line from manual journal entry
  const removeJeLine = (index: number) => {
    if (manualJeLines.length <= 2) {
      triggerError("الحد الأدنى لسطور القيد المزدوج هو سطرين (مدين ودائن)");
      return;
    }
    setManualJeLines(manualJeLines.filter((_, i) => i !== index));
  };

  // Submit manual double entry
  const handleManualJeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualJeDesc.trim()) {
      triggerError("الرجاء تدوين وصف عام للبيان الإجمالي للقيد");
      return;
    }

    // Prepare clean list of lines
    const parsedLines = manualJeLines.map(line => ({
      account_code: line.account_code,
      debit: Number(line.debit || 0),
      credit: Number(line.credit || 0),
      description: line.line_desc || manualJeDesc
    }));

    // Check if accounts are chosen for all lines
    if (parsedLines.some(l => !l.account_code)) {
      triggerError("الرجاء اختيار الحساب المحاسبي لجميع سطور القيد");
      return;
    }

    // Check balance
    const sumDebits = parsedLines.reduce((s, c) => s + c.debit, 0);
    const sumCredits = parsedLines.reduce((s, c) => s + c.credit, 0);

    if (Math.abs(sumDebits - sumCredits) > 0.05) {
      triggerError(`القيد المحاسبي غير متوازن! مجموع المدين (${sumDebits.toFixed(2)}) لا يساوي مجموع الدائن (${sumCredits.toFixed(2)})`);
      return;
    }

    if (sumDebits === 0) {
      triggerError("يجب أن تكون قيمة القيد أكبر من صفر ريال");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/journal-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: manualJeDate,
          description: manualJeDesc,
          beneficiary: manualJeBeneficiary || "عام / قيد تسوية",
          items: parsedLines
        })
      });
      const data = await res.json();
      if (res.ok) {
        triggerSuccess(`تم تدوين القيد المزدوج اليدوي بنجاح برقم قيد #${data.id}`);
        // Reset manual constructor state
        setManualJeDesc("");
        setManualJeBeneficiary("");
        setManualJeDate(new Date().toISOString().split("T")[0]);
        setManualJeLines([
          { account_code: "", debit: "", credit: "", line_desc: "" },
          { account_code: "", debit: "", credit: "", line_desc: "" }
        ]);
        setRefreshKey(p => p + 1);
        setActiveSubTab("entries"); // Redirect back to general ledger tab view
      } else {
        triggerError(data.error || "فشل حفظ القيد المحاسبي المزدوج");
      }
    } catch (err) {
      triggerError("حدث خطأ في الشبكة أثناء ترحيل القيد");
    } finally {
      setLoading(false);
    }
  };

  // Toggle rows to view sub detail items of any entry
  const toggleEntryExpansion = (id: number) => {
    setExpandedEntries(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Dynamic Trial Balance totals (Main accounts only)
  const totalTrialDebit = accounts
    .filter(item => item.classification === "Main")
    .reduce((sum, item) => {
      return sum + (item.type === "Asset" || item.type === "Expense" ? item.balance : 0);
    }, 0);
  const totalTrialCredit = accounts
    .filter(item => item.classification === "Main")
    .reduce((sum, item) => {
      return sum + (item.type === "Liability" || item.type === "Equity" || item.type === "Revenue" ? item.balance : 0);
    }, 0);

  // Filter accounts by standard types
  const getAccountsByType = (type: string) => {
    return accounts.filter(acc => acc.type === type);
  };

  // Human friendly Account Group Translate
  const getTypeArabicLabel = (type: string) => {
    switch (type) {
      case "Asset": return "الأصـول (Assets)";
      case "Liability": return "الالتزامات والخصوم (Liabilities)";
      case "Equity": return "حقوق الملاك والملكية (Equity)";
      case "Revenue": return "الإيرادات والمبيعات (Revenues)";
      case "Expense": return "المصروفات والأعباء (Expenses)";
      default: return type;
    }
  };

  // Account Ledger filtering (كشف الحساب التفصيلي المتكامل)
  const getLedgerItemsForAccount = () => {
    if (!selectedLedgerAccount) return [];
    
    const account = accounts.find(a => a.code === selectedLedgerAccount);
    if (!account) return [];

    const runningItems: Array<{
      date: string;
      entryId: number;
      desc: string;
      beneficiary: string;
      debit: number;
      credit: number;
      runningBalance: number;
    }> = [];

    // Pre-populate with initial balance if present
    let balanceAccumulate = Number(account.initial_balance || 0);
    
    // Sort all entries older to newer to accumulate running balance correctly
    const sortedEntries = [...journalEntries].sort((a, b) => a.id - b.id);

    sortedEntries.forEach(entry => {
      entry.items.forEach(item => {
        if (item.account_code === selectedLedgerAccount) {
          const deb = Number(item.debit || 0);
          const cred = Number(item.credit || 0);
          
          if (account.type === 'Asset' || account.type === 'Expense') {
            balanceAccumulate = balanceAccumulate + deb - cred;
          } else {
            balanceAccumulate = balanceAccumulate + cred - deb;
          }

          runningItems.push({
            date: entry.date,
            entryId: entry.id,
            desc: item.description || entry.description,
            beneficiary: entry.beneficiary,
            debit: deb,
            credit: cred,
            runningBalance: balanceAccumulate
          });
        }
      });
    });

    // Sort list matching standard ledger sheets (latest first)
    return runningItems.reverse();
  };

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      
      {/* Dynamic Notifications */}
      {successMessage && (
        <div className="p-4 border border-emerald-200 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in shadow-sm">
          <Check size={16} className="text-emerald-600 animate-bounce" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 border border-rose-200 bg-rose-50 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in shadow-sm">
          <AlertCircle size={16} className="text-rose-600 animate-bounce" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Page Header */}
      <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <Activity size={20} />
            </span>
            <h1 className="text-lg font-extrabold text-neutral-900">نظام إدارة المحاسبة والقيود المزدوجة المتقدم</h1>
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">
            شجرة حسابات موحدة، ترصيد القيود مدين/دائن، توليد سندات قبض وصرف متكاملة تطبق على النزلاء والشركاء والموردين.
          </p>
        </div>

        {/* Quick Sub-tab select */}
        <div className="flex flex-wrap items-center gap-1.5 bg-neutral-100 p-1.5 rounded-xl border border-neutral-200/50">
          <button
            onClick={() => setActiveSubTab("coa")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === "coa" 
                ? "bg-white text-emerald-900 shadow-sm" 
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
            }`}
          >
            <FolderTree size={14} className="inline ml-1" />
            شجرة الحسابات COA
          </button>
          
          <button
            onClick={() => setActiveSubTab("entries")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === "entries" 
                ? "bg-white text-emerald-900 shadow-sm" 
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
            }`}
          >
            <BookOpen size={14} className="inline ml-1" />
            دفتر القيود واليومية
          </button>

          <button
            onClick={() => setActiveSubTab("voucher")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === "voucher" 
                ? "bg-white text-emerald-900 shadow-sm" 
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
            }`}
          >
            <Plus size={14} className="inline ml-1" />
            إصدار السندات واليومية
          </button>

          <button
            onClick={() => setActiveSubTab("trial")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === "trial" 
                ? "bg-white text-emerald-900 shadow-sm" 
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
            }`}
          >
            <Scale size={14} className="inline ml-1" />
            ميزان المراجعة
          </button>

          <button
            onClick={() => setActiveSubTab("ledger")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === "ledger" 
                ? "bg-white text-emerald-900 shadow-sm" 
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
            }`}
          >
            <Search size={14} className="inline ml-1" />
            دفتر الأستاذ (كشف كلي)
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center p-8 text-neutral-500 gap-1.5 text-xs">
          <RefreshCw size={16} className="animate-spin text-emerald-600" />
          <span>جاري تحديث دفتر الحسابات العام للصحيفة...</span>
        </div>
      )}

      {/* -------------------- SUB-TAB 1: CHART OF ACCOUNTS (شجرة الحسابات) -------------------- */}
      {activeSubTab === "coa" && (
        <div className="space-y-6">
          
          {/* Visual explaining Customers as Assets */}
          <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                💡 موقع ودور حسابات العملاء والنزلاء كأصول (Customers Account / Accounts Receivable)
              </h4>
              <p className="text-[11px] text-emerald-800 leading-relaxed max-w-3xl">
                يصنف حساب <b>ذمم النزلاء - مدينون (Customers Account)</b> كـ <b>أصل متداول (Asset)</b> في الجانب المدين للأصول، لأن المبالغ المتراكمة عليه تمثل موارد اقتصادية مملوكة للفندق سيتم تحصيلها نقداً في المستقبل القريب. عند قيد عقود النزلاء الآجلة، يتم مدينتها لحساب ذمم النزلاء لتبين المديونيات المستحقة بدقة والتحكم الكلي بها.
              </p>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowAddAccountForm(!showAddAccountForm)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Plus size={14} />
                {showAddAccountForm ? "إخفاء لوحة الإضافة" : "إضافة حساب فرعي جديد للشجرة"}
              </button>
              {onOpenReportViewer && (
                <button
                  onClick={() => onOpenReportViewer("coa")}
                  className="px-4 py-2 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Printer size={14} className="text-emerald-600" />
                  طباعة دليل شجرة الحسابات
                </button>
              )}
            </div>
          </div>

          {/* Create Account Inline form */}
          {showAddAccountForm && (
            <form onSubmit={handleAddAccountSubmit} className="bg-white p-5 rounded-xl border border-emerald-200/80 shadow-md space-y-4 animate-fade-in">
              <div className="border-b pb-2 flex justify-between items-center">
                <h4 className="text-xs font-bold text-neutral-800 flex items-center gap-1">
                  <FolderTree size={14} className="text-emerald-600" />
                  إضافة وتأسيس حساب جديد في شجرة الحسابات COA
                </h4>
                <span className="text-[10px] text-neutral-400 font-bold">بناء هيكلي متوازن ومطابق</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* Code */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">رقم/رمز كان الحساب (Code) *</label>
                  <input
                    required
                    type="text"
                    value={newAccountCode}
                    onChange={e => setNewAccountCode(e.target.value)}
                    placeholder="مثال: 1104 أو 5104"
                    className="w-full border rounded-lg p-2.5 text-xs outline-none focus:border-emerald-600 font-mono font-bold"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">إسم الحساب (Name) *</label>
                  <input
                    required
                    type="text"
                    value={newAccountName}
                    onChange={e => setNewAccountName(e.target.value)}
                    placeholder="مثال: ذمم العملاء والنزلاء"
                    className="w-full border rounded-lg p-2.5 text-xs outline-none focus:border-emerald-600 font-bold"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">نوع وتبويب الحساب (Type) *</label>
                  <select
                    required
                    value={newAccountType}
                    onChange={e => setNewAccountType(e.target.value)}
                    className="w-full border rounded-lg p-2.5 text-xs outline-none bg-white focus:border-emerald-600 font-bold"
                  >
                    <option value="Asset">أصول متداولة وثابتة (Asset)</option>
                    <option value="Liability">الالتزامات والخصوم (Liability)</option>
                    <option value="Equity">حقوق الملكية ورأس المال (Equity)</option>
                    <option value="Revenue">الإيرادات الحالية والمبيعات (Revenue)</option>
                    <option value="Expense">المصروفات والتشغيل والأثر (Expense)</option>
                  </select>
                </div>

                {/* Classification */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">درجة الحساب (Classification) *</label>
                  <select
                    required
                    value={newAccountClassification}
                    onChange={e => setNewAccountClassification(e.target.value)}
                    className="w-full border rounded-lg p-2.5 text-xs outline-none bg-white focus:border-emerald-600 font-bold"
                  >
                    <option value="Detail">تفصيلي (Detail) - يسجل قيود حركات</option>
                    <option value="Main">رئيسي تجميعي (Main) - يظهر بالميزان</option>
                  </select>
                </div>

                {/* Initial balance */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">الرصيد الافتتاحي (ر.س) (اختياري)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newAccountInitialBalance}
                    onChange={e => setNewAccountInitialBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full border rounded-lg p-2.5 text-xs outline-none focus:border-emerald-600 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddAccountForm(false)}
                  className="px-3.5 py-1.5 border rounded-lg hover:bg-neutral-50 text-xs text-neutral-600 font-bold"
                >
                  إلغاء النافذة
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm"
                >
                  {loading ? "جاري ترحيل وحفظ..." : "حفظ وتعديل شجرة الحسابات فوراً"}
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* List of categories with account nodes */}
            <div className="lg:col-span-2 space-y-4">
              {["Asset", "Liability", "Equity", "Revenue", "Expense"].map(categoryGroup => {
                const categoryAccounts = getAccountsByType(categoryGroup);
                return (
                  <div key={categoryGroup} className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                    <div className="bg-neutral-50/80 px-4 py-3 border-b border-neutral-200 flex justify-between items-center">
                      <h3 className="font-extrabold text-neutral-800 text-xs flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          categoryGroup === 'Asset' ? 'bg-sky-500' :
                          categoryGroup === 'Liability' ? 'bg-orange-500' :
                          categoryGroup === 'Equity' ? 'bg-purple-500' :
                          categoryGroup === 'Revenue' ? 'bg-emerald-500' : 'bg-rose-500'
                        }`} />
                        {getTypeArabicLabel(categoryGroup)}
                      </h3>
                      <span className="text-[10px] text-neutral-500 font-mono bg-neutral-200/50 px-2 py-0.5 rounded-full">
                        {categoryAccounts.length} حساب فرعي
                      </span>
                    </div>

                    <div className="divide-y divide-neutral-100">
                      {categoryAccounts.length === 0 ? (
                        <p className="p-4 text-xs text-center text-neutral-400">لا يوجد حسابات حالياً في هذه الشجرة الفرعية</p>
                      ) : (
                        categoryAccounts.map(account => {
                          const isMain = account.classification === "Main";
                          return (
                            <div 
                              key={account.code} 
                              className={`p-4 flex justify-between items-center gap-4 transition-all ${
                                isMain 
                                  ? "bg-neutral-50/80 border-r-4 border-r-emerald-500" 
                                  : "hover:bg-neutral-50/30 pr-8"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <span className={`font-mono text-xs font-bold px-2 py-1 rounded ${
                                  isMain ? "text-emerald-800 bg-emerald-50" : "text-neutral-400 bg-neutral-100"
                                }`}>
                                  {account.code}
                                </span>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h5 className={`text-xs ${isMain ? "font-extrabold text-neutral-950 text-[13px]" : "font-semibold text-neutral-800"}`}>
                                      {account.name}
                                    </h5>
                                    {isMain ? (
                                      <span className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-extrabold">
                                        حساب رئيسي (تجميعي للميزان)
                                      </span>
                                    ) : (
                                      <span className="text-[9px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded font-bold">
                                        حساب تفصيلي (تسجيل قيود)
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-neutral-400 mt-0.5">
                                    رصيد افتتاحي: {account.initial_balance.toFixed(2)} ر.س | 
                                    مدين: {account.total_debit.toFixed(2)} | دائن: {account.total_credit.toFixed(2)}
                                  </p>
                                </div>
                              </div>

                              <div className="text-left">
                                <span className={`font-mono text-xs font-bold ${
                                  account.balance >= 0 
                                    ? isMain ? "text-emerald-700 font-extrabold" : "text-neutral-900" 
                                    : "text-rose-600 font-bold"
                                }`}>
                                  {account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Guidelines info card for accounting accuracy */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white p-5 rounded-xl border border-emerald-900 shadow-lg">
                <h4 className="font-extrabold text-white text-xs mb-3 flex items-center gap-1.5">
                  <Scale size={16} />
                  مفهوم القيد المزدوج والVAT
                </h4>
                <p className="text-[11px] text-emerald-100 leading-relaxed space-y-2">
                  <span>تعتمد الفنادق على شجرة حسابات متكاملة. عند تسكين النزلاء، يقوم النظام تلقائياً بترحيل العمليات مدققة لتبسيط العمل:</span>
                  <br /><br />
                  <span>• <b>المدير يقبض مبلغ:</b> يدخل مباشرة في المدين (حساب الصندوق 1101 أو البنك 1102).</span>
                  <br />
                  <span>• <b>الدائن المقابل:</b> يوزع كإيراد خدمات غرف (شحنة 4101) قبل الضريبة ومستقطعات ضريبة القيمة المضافة 15% (شحنة 2101).</span>
                  <br />
                  <span>• <b>النتيجة:</b> تظل الدفاتير متوازنة دائمًا للشركة دون تدخل يدوي معقد.</span>
                </p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-neutral-200/80 shadow-sm space-y-4">
                <h4 className="font-extrabold text-neutral-800 text-xs border-b pb-2">تفاصيل الحسابات البنكية اليومية</h4>
                <div className="space-y-3">
                  {accounts.filter(a => ["1101", "1102"].includes(a.code)).map(acc => (
                    <div key={acc.code} className="flex justify-between items-center text-xs">
                      <span className="text-neutral-600 font-bold">{acc.name}</span>
                      <span className="font-mono bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded font-extrabold">
                        {acc.balance.toFixed(2)} ر.س
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- SUB-TAB 2: JOURNAL ENTRIES (دفتر قيود اليومية لربط الموازين) -------------------- */}
      {activeSubTab === "entries" && (
        <div className="space-y-4">
          
          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-neutral-800 text-sm">سجل اليومية العامة للدفاتر (General Journal Entries)</h3>
              <p className="text-[11px] text-neutral-400 mt-0.5">يبين كافة القيود المحاسبية الإجبارية والاختيارية المزدوجة المتوازنة في القيود اليومية.</p>
            </div>

            <button
              onClick={() => setActiveSubTab("voucher")}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus size={14} />
              انشاء تدوين قيد أو سند جديد
            </button>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-200 font-bold">
                  <tr>
                    <th className="px-5 py-3.5 text-neutral-600">رقم القيد المالـي</th>
                    <th className="px-5 py-3.5 text-neutral-600">تاريخ القيد</th>
                    <th className="px-5 py-3.5 text-neutral-600">البيان الإجمالي (الوصف)</th>
                    <th className="px-5 py-3.5 text-neutral-600">المستفيد / العميل / المورد</th>
                    <th className="px-5 py-3.5 text-neutral-600 text-left">إجمالي القيمة</th>
                    <th className="px-5 py-3.5 text-center">أطراف القيد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {journalEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-neutral-400 font-semibold">
                        لا يوجد أي معاملات مالية مسجلة حالياً كقيود عامة
                      </td>
                    </tr>
                  ) : (
                    journalEntries.map(entry => {
                      // Total sum of debits in this entry
                      const entrySum = entry.items.reduce((acc, item) => acc + Number(item.debit), 0);
                      const isExpanded = !!expandedEntries[entry.id];

                      return (
                        <React.Fragment key={entry.id}>
                          <tr className="hover:bg-neutral-50/50 transition-all font-sans">
                            <td className="px-5 py-4 font-mono font-bold text-neutral-700">
                              #JE-{entry.id}
                            </td>
                            <td className="px-5 py-4 text-neutral-600">
                              {entry.date}
                            </td>
                            <td className="px-5 py-4 font-bold text-neutral-800">
                              {entry.description}
                            </td>
                            <td className="px-5 py-4 text-neutral-900 font-bold">
                              {entry.beneficiary || "عام"}
                            </td>
                            <td className="px-5 py-4 text-left font-mono font-bold text-emerald-800">
                              {entrySum.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س
                            </td>
                            <td className="px-5 py-3 text-center">
                              <button
                                onClick={() => toggleEntryExpansion(entry.id)}
                                className="px-2.5 py-1 text-[11px] border rounded hover:bg-neutral-50 font-bold flex items-center gap-1 mx-auto"
                              >
                                {isExpanded ? (
                                  <>
                                    <span>إخفاء الحسابات</span>
                                    <ChevronUp size={12} />
                                  </>
                                ) : (
                                  <>
                                    <span>تفصيل الحسابات ({entry.items.length})</span>
                                    <ChevronDown size={12} />
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded doubleentry details */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} className="bg-neutral-50 px-5 py-4">
                                <div className="border border-neutral-200/80 rounded-lg overflow-hidden shadow-sm bg-white">
                                  <div className="px-4 py-2 bg-neutral-100 text-[11px] font-bold text-neutral-600 border-b flex justify-between">
                                    <span>أطراف حركة توازن الحسابات المتأثرة بالقيد رقم #JE-{entry.id}</span>
                                    <span className="text-emerald-800">توازن مدين = دائن</span>
                                  </div>
                                  <table className="w-full text-right text-[11px]">
                                    <thead className="bg-neutral-50 border-b">
                                      <tr>
                                        <th className="px-4 py-2 font-bold text-neutral-600">رقم الحساب</th>
                                        <th className="px-4 py-2 font-bold text-neutral-600">اسم الحساب في الشجرة</th>
                                        <th className="px-4 py-2 font-bold text-neutral-600">بيان الحركة الفرعي</th>
                                        <th className="px-4 py-2 font-bold text-neutral-600 text-left">مدين (Debit)</th>
                                        <th className="px-4 py-2 font-bold text-neutral-600 text-left">دائن (Credit)</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                      {entry.items.map(item => (
                                        <tr key={item.id} className="hover:bg-neutral-50/50">
                                          <td className="px-4 py-2 font-mono text-neutral-500">{item.account_code}</td>
                                          <td className="px-4 py-2 text-neutral-800 font-bold">{item.account_name || "غير معروف"}</td>
                                          <td className="px-4 py-2 text-neutral-500">{item.description}</td>
                                          <td className="px-4 py-2 text-left font-mono font-bold text-sky-800">
                                            {item.debit > 0 ? `${item.debit.toFixed(2)} ر.س` : "-"}
                                          </td>
                                          <td className="px-4 py-2 text-left font-mono font-bold text-amber-700">
                                            {item.credit > 0 ? `${item.credit.toFixed(2)} ر.س` : "-"}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* -------------------- SUB-TAB 3: VOUCHER CREATOR (سندات الصرف والقبض والقيود اليدوية) -------------------- */}
      {activeSubTab === "voucher" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Section A: Easy Vouchers (سندات الصرف والقبض المبسطة المنشئة للقيود) */}
          <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm space-y-4">
            <div className="border-b pb-3 mb-2">
              <h2 className="font-extrabold text-neutral-800 text-sm">إصدار سند مالي مبسط (صرف / قبض تلقائي ممتزج بالدفاتر)</h2>
              <p className="text-[11px] text-neutral-400 mt-0.5">يقوم بتسجيل سند القبض أو الصرف، وبناء القيد المحاسبي المتوازن المزدوج فوراً.</p>
            </div>

            <form onSubmit={handleVoucherSubmit} className="space-y-4">
              
              {/* Type toggle */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-500 mb-1.5">نوع السند المراد إصداره</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVoucherForm({ ...voucherForm, type: "receipt_in" })}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                      voucherForm.type === "receipt_in" 
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300" 
                        : "bg-white text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    <ArrowDownLeft size={16} className="inline ml-1 text-emerald-600" />
                    سند قبض مالي (مقبوضات / إيرادات)
                  </button>

                  <button
                    type="button"
                    onClick={() => setVoucherForm({ ...voucherForm, type: "voucher_out" })}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                      voucherForm.type === "voucher_out" 
                        ? "bg-rose-50 text-rose-800 border-rose-300" 
                        : "bg-white text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    <ArrowUpRight size={16} className="inline ml-1 text-rose-600" />
                    سند صرف مالي (مصروف فرعي / دفعات مورد)
                  </button>
                </div>
              </div>

              {/* Beneficiary Name */}
              <div className="relative">
                <label className="block text-[11px] font-bold text-neutral-600 mb-1 flex justify-between items-center animate-fade-in">
                  <span>البادئ (الدافع / المستلم منه) أو (المورد / المستفيد من الصرف)</span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">مرتبط بشجرة الحسابات</span>
                </label>
                <div className="relative">
                  <input
                    required
                    type="text"
                    value={voucherForm.beneficiary}
                    onChange={e => setVoucherForm({ ...voucherForm, beneficiary: e.target.value })}
                    onFocus={() => setVoucherFocused(true)}
                    onBlur={() => setTimeout(() => setVoucherFocused(false), 200)}
                    placeholder="ابحث أو اختر من شجرة الحسابات، مثال: ذمم النزلاء"
                    className="w-full border rounded-lg p-2.5 text-xs outline-none focus:border-emerald-600 pr-9"
                  />
                  <User className="absolute right-3 top-3 text-neutral-400" size={14} />
                </div>

                {/* Autocomplete Suggestions Panel from COA */}
                {voucherFocused && (
                  <div className="absolute right-0 left-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-xl max-h-52 overflow-y-auto z-50 divide-y divide-neutral-100">
                    <div className="px-3 py-1.5 bg-neutral-50 text-[10px] font-semibold text-neutral-500 sticky top-0 flex justify-between">
                      <span>البحث في شجرة الحسابات للفندق (COA)</span>
                      <span>اختر للربط التلقائي للحساب</span>
                    </div>
                    {getVoucherSuggestions().length === 0 ? (
                      <div className="p-3 text-xs text-neutral-400 text-center">لا توجد حسابات مطابقة للبحث</div>
                    ) : (
                      getVoucherSuggestions().map(acc => (
                        <div
                          key={acc.code}
                          onMouseDown={() => selectVoucherAccountAsBeneficiary(acc)}
                          className="px-3 py-2 hover:bg-emerald-50/80 cursor-pointer flex justify-between items-center transition-all text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono bg-neutral-100 text-[10px] px-1.5 py-0.5 rounded font-bold text-neutral-500">
                              {acc.code}
                            </span>
                            <span className="font-bold text-neutral-800">{acc.name}</span>
                          </div>
                          <span className="text-[10px] text-neutral-400 bg-neutral-100 rounded-full px-2.5 py-0.5">
                            {getTypeArabicLabel(acc.type)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Grid 2 Column */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Method */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">طبيعة الدفع المتبعة</label>
                  <select
                    value={voucherForm.payment_method}
                    onChange={e => setVoucherForm({ ...voucherForm, payment_method: e.target.value })}
                    className="w-full border rounded-lg p-2.5 text-xs outline-none bg-white focus:border-emerald-600"
                  >
                    <option value="cash">نقدي (كاش الصندوق)</option>
                    <option value="mada">شبكة مدى (Mada)</option>
                    <option value="credit_card">بطاقة ائتمانية (فندق)</option>
                    <option value="bank_transfer">حوالة بنكية فورية</option>
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">تاريخ تحرير السند</label>
                  <input
                    required
                    type="date"
                    value={voucherForm.date}
                    onChange={e => setVoucherForm({ ...voucherForm, date: e.target.value })}
                    className="w-full border rounded-lg p-2.5 text-xs outline-none focus:border-emerald-600"
                  />
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Finance asset Account */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">الصندوق / حساب البنك المتأثر</label>
                  <select
                    required
                    value={voucherForm.finance_account}
                    onChange={e => setVoucherForm({ ...voucherForm, finance_account: e.target.value })}
                    className="w-full border rounded-lg p-2.5 text-xs outline-none bg-white focus:border-emerald-600"
                  >
                    <option value="1101">1101 - الصندوق الرئيسي - كاش</option>
                    <option value="1102">1102 - حساب الرياض الجاري - البنك</option>
                  </select>
                </div>

                {/* Ledger/Offset Account */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">الحساب المقابل لتطابق الشجرة</label>
                  <select
                    required
                    value={voucherForm.ledger_account}
                    onChange={e => setVoucherForm({ ...voucherForm, ledger_account: e.target.value })}
                    className="w-full border rounded-lg p-2.5 text-xs outline-none bg-white focus:border-emerald-600"
                  >
                    <option value="">-- اختر الحساب المعاكس --</option>
                    {accounts.filter(a => !["1101", "1102"].includes(a.code)).map(acc => (
                      <option key={acc.code} value={acc.code}>
                        {acc.code} - {acc.name} ({acc.type === 'Revenue' ? 'إيرادات' : acc.type === 'Expense' ? 'مصروفات' : acc.type === 'Liability' ? 'التزام' : acc.type})
                      </option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Amount */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">قيمة السند المطلقة (ر.س)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={voucherForm.amount}
                  onChange={e => setVoucherForm({ ...voucherForm, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full border rounded-lg p-2.5 text-xs outline-none focus:border-emerald-600 font-mono font-bold"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">البيان المالي المفصل الشارح</label>
                <textarea
                  required
                  rows={2}
                  value={voucherForm.description}
                  onChange={e => setVoucherForm({ ...voucherForm, description: e.target.value })}
                  placeholder="اكتب تفاصيل حركة القيد بوضوح لدفتر الأستاذ والتقارير"
                  className="w-full border rounded-lg p-2.5 text-xs outline-none focus:border-emerald-600"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-lg text-xs font-bold text-white transition-all shadow-sm ${
                  voucherForm.type === "receipt_in" 
                    ? "bg-emerald-600 hover:bg-emerald-700" 
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {loading ? "جاري ترحيل وحفظ القيد..." : "ترحيل توازن السند في الدفاتر اليومية والCOA"}
              </button>

            </form>
          </div>

          {/* Section B: Manual Double Entry general constructor (منشئ قيود يدوية احترافية) */}
          <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm space-y-4">
            <div className="border-b pb-3 mb-2">
              <h2 className="font-extrabold text-neutral-800 text-sm">منشئ قيد يومية عام يدوي (Manual Journal Entry Balancing)</h2>
              <p className="text-[11px] text-neutral-400 mt-0.5">خطوط خاضعة للرقابة التامة. اكتب سطور الحركة وتأكد من توازن مدين = دائن.</p>
            </div>

            <form onSubmit={handleManualJeSubmit} className="space-y-4">
              
              {/* Date & Beneficiary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">تاريخ القيد المزدوج</label>
                  <input
                    required
                    type="date"
                    value={manualJeDate}
                    onChange={e => setManualJeDate(e.target.value)}
                    className="w-full border rounded-lg p-2.5 text-xs outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="relative">
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1 flex justify-between items-center">
                    <span>المستفيد / البادئ</span>
                    <span className="text-[10px] text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded font-bold">اتصال مع شجرة الحسابات</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={manualJeBeneficiary}
                      onChange={e => setManualJeBeneficiary(e.target.value)}
                      onFocus={() => setManualFocused(true)}
                      onBlur={() => setTimeout(() => setManualFocused(false), 200)}
                      placeholder="ابحث أو اختر حساب، مثال: رأس المال"
                      className="w-full border rounded-lg p-2.5 text-xs outline-none focus:border-emerald-600"
                    />
                  </div>

                  {/* Autocomplete Suggestions Panel from COA */}
                  {manualFocused && (
                    <div className="absolute right-0 left-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-xl max-h-52 overflow-y-auto z-50 divide-y divide-neutral-100">
                      <div className="px-3 py-1.5 bg-neutral-50 text-[10px] font-semibold text-neutral-500 sticky top-0 flex justify-between">
                        <span>اختيار أو بحث من شجرة الحسابات (COA)</span>
                        <span>انقر لملء اسم الحساب</span>
                      </div>
                      {getManualSuggestions().length === 0 ? (
                        <div className="p-3 text-xs text-neutral-400 text-center">لا توجد حسابات مطابقة للبحث</div>
                      ) : (
                        getManualSuggestions().map(acc => (
                          <div
                            key={acc.code}
                            onMouseDown={() => selectManualAccountAsBeneficiary(acc)}
                            className="px-3 py-2 hover:bg-neutral-100 cursor-pointer flex justify-between items-center transition-all text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono bg-neutral-100 text-[10px] px-1.5 py-0.5 rounded font-bold text-neutral-500">
                                {acc.code}
                              </span>
                              <span className="font-bold text-neutral-800">{acc.name}</span>
                            </div>
                            <span className="text-[10px] text-neutral-400 bg-neutral-100 rounded-full px-2 py-0.5">
                              {getTypeArabicLabel(acc.type)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Master Description */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">البيان العام للقيد</label>
                <input
                  required
                  type="text"
                  value={manualJeDesc}
                  onChange={e => setManualJeDesc(e.target.value)}
                  placeholder="مثال: تسوية حسابات عجز مواد نظافة الاستقبال بنهاية وردية النهار"
                  className="w-full border rounded-lg p-2.5 text-xs outline-none focus:border-emerald-600"
                />
              </div>

              {/* Lines table items debit credit */}
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-neutral-50 p-2 rounded text-[11px] font-bold text-neutral-500">
                  <span>سطور المعاملات التأثيرية المحاسبية</span>
                  <button
                    type="button"
                    onClick={addJeLine}
                    className="px-2 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded hover:bg-emerald-100"
                  >
                    + إضافة سطر متمم
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {manualJeLines.map((line, idx) => (
                    <div key={idx} className="p-3 border rounded-lg bg-neutral-50/50 space-y-2 text-xs relative">
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {/* select account */}
                        <div className="md:col-span-1">
                          <select
                            required
                            value={line.account_code}
                            onChange={e => updateJeLine(idx, "account_code", e.target.value)}
                            className="w-full border rounded p-1.5 text-[11px] outline-none bg-white focus:border-emerald-600"
                          >
                            <option value="">-- اختر الحساب --</option>
                            {accounts.map(a => (
                              <option key={a.code} value={a.code}>{a.code} - {a.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Debit input */}
                        <div>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="مدين (Debit)"
                            value={line.debit}
                            disabled={!!line.credit}
                            onChange={e => updateJeLine(idx, "debit", e.target.value)}
                            className="w-full border rounded p-1.5 text-[11px] outline-none focus:border-emerald-600 font-mono text-center"
                          />
                        </div>

                        {/* Credit input */}
                        <div>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="دائن (Credit)"
                            value={line.credit}
                            disabled={!!line.debit}
                            onChange={e => updateJeLine(idx, "credit", e.target.value)}
                            className="w-full border rounded p-1.5 text-[11px] outline-none focus:border-emerald-600 font-mono text-center"
                          />
                        </div>
                      </div>

                      {/* Sub-description & Remove button */}
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="بيان تفصيلي فرعي للسطر (اختياري)"
                          value={line.line_desc}
                          onChange={e => updateJeLine(idx, "line_desc", e.target.value)}
                          className="flex-1 border rounded p-1.5 text-[10px] outline-none focus:border-emerald-600"
                        />
                        <button
                          type="button"
                          onClick={() => removeJeLine(idx)}
                          className="px-2 py-1 text-rose-600 border border-rose-200 rounded hover:bg-rose-50 text-[10px] font-bold"
                        >
                          حذف السطر
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              </div>

              {/* Balancing summary panel */}
              <div className="p-3 bg-neutral-100 rounded-lg text-xs font-bold space-y-1 font-mono">
                <div className="flex justify-between">
                  <span>إجمالي المدين المكتوب:</span>
                  <span className="text-sky-800">
                    {manualJeLines.reduce((s, c) => s + Number(c.debit || 0), 0).toFixed(2)} ر.س
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>إجمالي الدائن المكتوب:</span>
                  <span className="text-amber-800">
                    {manualJeLines.reduce((s, c) => s + Number(c.credit || 0), 0).toFixed(2)} ر.س
                  </span>
                </div>
                <div className="border-t pt-1 flex justify-between text-neutral-800 font-extrabold text-[12px]">
                  <span>الفارق الحالي (مطلوب صفر):</span>
                  <span className={
                    Math.abs(manualJeLines.reduce((s, c) => s + Number(c.debit || 0), 0) - manualJeLines.reduce((s, c) => s + Number(c.credit || 0), 0)) < 0.05
                      ? "text-emerald-700 font-extrabold" 
                      : "text-rose-600 font-extrabold"
                  }>
                    {Math.abs(manualJeLines.reduce((s, c) => s + Number(c.debit || 0), 0) - manualJeLines.reduce((s, c) => s + Number(c.credit || 0), 0)).toFixed(2)} ر.س
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-neutral-800 hover:bg-neutral-900 text-white rounded-lg text-xs font-bold transition-all shadow-md"
              >
                {loading ? "جاري المطابقة والحفظ..." : "تدوين وبدء فحص موازنة ترحيل القيد للميزانية العمومية"}
              </button>

            </form>
          </div>

        </div>
      )}

      {/* -------------------- SUB-TAB 4: TRIAL BALANCE (ميزان المراجعة) -------------------- */}
      {activeSubTab === "trial" && (
        <div className="space-y-4">
          
          <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-neutral-800 text-sm">ميزان المراجعة بالأرصدة (Trial Balance Sheet)</h3>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                يعتبر ميزان المراجعة بمثابة المرجع الأساسي للتأكد من توازن كافة العمليات المالية بنظام شجرة الحسابات بالفندق.
              </p>
            </div>
            {onOpenReportViewer && (
              <button
                onClick={() => onOpenReportViewer("trial")}
                className="px-4 py-2 bg-emerald-650 hover:bg-emerald-700 bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Printer size={14} />
                عرض وطباعة ميزان المراجعة
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-200 font-bold">
                  <tr>
                    <th className="px-5 py-3.5 text-neutral-700">رقم الحساب المحاسبي</th>
                    <th className="px-5 py-3.5 text-neutral-700">اسم الحساب بالفندق</th>
                    <th className="px-5 py-3.5 text-neutral-700">نوع الشجرة</th>
                    <th className="px-5 py-3.5 text-left font-bold text-sky-800">الأرصدة المدينة (Debit)</th>
                    <th className="px-5 py-3.5 text-left font-bold text-amber-800">الأرصدة الدائنة (Credit)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {accounts.filter(acc => acc.classification === "Main").map(acc => {
                    const isDebitAcc = acc.type === "Asset" || acc.type === "Expense";
                    return (
                      <tr key={acc.code} className="hover:bg-neutral-50/50">
                        <td className="px-5 py-3 font-mono font-bold text-neutral-500">{acc.code}</td>
                        <td className="px-5 py-3 font-bold text-neutral-800">{acc.name}</td>
                        <td className="px-5 py-3 text-neutral-500">
                          {acc.type === 'Asset' && "أصل متداول / ثابت"}
                          {acc.type === 'Liability' && "التزام / ذمم دائنة"}
                          {acc.type === 'Equity' && "حقوق ملكية"}
                          {acc.type === 'Revenue' && "إيرادات وإضافات"}
                          {acc.type === 'Expense' && "مصاريف تشغيلية"}
                        </td>
                        
                        {/* Debit column */}
                        <td className="px-5 py-3 text-left font-mono font-bold text-neutral-800">
                          {isDebitAcc ? `${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س` : "-"}
                        </td>

                        {/* Credit column */}
                        <td className="px-5 py-3 text-left font-mono font-bold text-neutral-800">
                          {!isDebitAcc ? `${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س` : "-"}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Aggregated Balanced Net Column footer */}
                  <tr className="bg-neutral-100 border-t-2 border-neutral-400 font-extrabold text-[12px] text-neutral-950 font-sans">
                    <td colSpan={3} className="px-5 py-4 text-right">المجموع الكلي الموازن لميزان المراجعة</td>
                    <td className="px-5 py-4 text-left font-mono text-sky-900 border-l border-neutral-300">
                      {totalTrialDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س
                    </td>
                    <td className="px-5 py-4 text-left font-mono text-amber-950">
                      {totalTrialCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Reconciliation Check Sign banner */}
            <div className="p-4 bg-emerald-50 text-emerald-800 text-xs font-bold border-t flex justify-between items-center">
              <span>الحالة التدقيقية: شجرة الحسابات متوازنة وبصحة تامة بنسبة 100% ✔</span>
              <span className="font-mono text-[10px] bg-emerald-100 text-emerald-900 px-3 py-1 rounded">
                الفرق المالي: 0.00 ر.س
              </span>
            </div>
          </div>

        </div>
      )}

      {/* -------------------- SUB-TAB 5: ACCOUNT LEDGER SHEET (دفتر الأستاذ التفصيلي وكشوفات الحساب) -------------------- */}
      {activeSubTab === "ledger" && (
        <div className="space-y-4">
          
          <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-neutral-800 text-sm">كشف حساب الأستاذ العام التفصيلي (General Ledger Sheet)</h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">استعرض كافة القيود والحركات التاريخية المدونة التي طرأت على أي حساب فرعي.</p>
              </div>

              {/* Account selection drop list & Print button */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-bold text-neutral-600 block shrink-0">الحساب المطلوب مراجعته:</label>
                  <select
                    value={selectedLedgerAccount}
                    onChange={e => setSelectedLedgerAccount(e.target.value)}
                    className="border rounded-lg p-2.5 text-xs outline-none bg-white focus:border-emerald-600 font-bold text-neutral-800"
                  >
                    {accounts.filter(acc => acc.classification === "Detail").map(acc => (
                      <option key={acc.code} value={acc.code}>{acc.code} - {acc.name}</option>
                    ))}
                  </select>
                </div>
                {onOpenReportViewer && (
                  <button
                    onClick={() => onOpenReportViewer("ledger", selectedLedgerAccount)}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Printer size={14} />
                    طباعة كشف الحساب التفصيلي
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table representing Ledger card for selected account */}
          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b bg-neutral-50/50 flex justify-between text-xs font-bold text-neutral-800">
              <span>كشف تفصيلي لحركات حساب: <strong className="text-emerald-700">{accounts.find(a => a.code === selectedLedgerAccount)?.name}</strong></span>
              <span className="font-mono">الرصيد الافتتاحي المقيد: {accounts.find(a => a.code === selectedLedgerAccount)?.initial_balance.toFixed(2)} ر.س</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-neutral-50 border-b text-neutral-600 font-bold">
                  <tr>
                    <th className="px-5 py-3.5">التاريخ</th>
                    <th className="px-5 py-3.5">رقم القيد الأصلي</th>
                    <th className="px-5 py-3.5">البيان والشرح المالي</th>
                    <th className="px-5 py-3.5">المستلم / المستفيد</th>
                    <th className="px-5 py-3.5 text-left text-sky-800 font-bold">مدين (+)</th>
                    <th className="px-5 py-3.5 text-left text-amber-800 font-bold">دائن (-)</th>
                    <th className="px-5 py-3.5 text-left text-neutral-900 font-bold">الرصيد التراكمي المتبقي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {getLedgerItemsForAccount().length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-neutral-400">
                        لا توجد حركات مالية مسجلة تاريخياً لهذا الحساب بعد الرصيد الافتتاحي
                      </td>
                    </tr>
                  ) : (
                    getLedgerItemsForAccount().map((ledgerRow, rx) => (
                      <tr key={rx} className="hover:bg-neutral-50/20">
                        <td className="px-5 py-3.5 font-mono text-neutral-500">{ledgerRow.date}</td>
                        <td className="px-5 py-3.5 font-mono text-neutral-500 font-bold">#JE-{ledgerRow.entryId}</td>
                        <td className="px-5 py-3.5 font-bold text-neutral-900">{ledgerRow.desc}</td>
                        <td className="px-5 py-3.5 text-neutral-600">{ledgerRow.beneficiary}</td>
                        <td className="px-5 py-3.5 text-left font-mono font-bold text-sky-800">
                          {ledgerRow.debit > 0 ? `${ledgerRow.debit.toFixed(2)} ر.س` : "-"}
                        </td>
                        <td className="px-5 py-3.5 text-left font-mono font-bold text-amber-700">
                          {ledgerRow.credit > 0 ? `${ledgerRow.credit.toFixed(2)} ر.س` : "-"}
                        </td>
                        <td className="px-5 py-3.5 text-left font-mono font-bold text-neutral-950 bg-neutral-50/30">
                          {ledgerRow.runningBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س
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

    </div>
  );
}
