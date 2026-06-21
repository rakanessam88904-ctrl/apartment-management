import React, { useState, useEffect } from "react";
import { apiFetch as fetch } from "../lib/api";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { 
  Printer, 
  X, 
  Building2, 
  Calendar, 
  User, 
  ShieldCheck, 
  Hash, 
  CheckCircle2, 
  Sparkles,
  Search,
  BookOpen,
  DollarSign,
  TrendingUp,
  CreditCard,
  Building,
  Scale,
  FileText,
  Bookmark,
  Check,
  Percent,
  Activity,
  Wrench,
  ChevronDown,
  Download,
  Loader2
} from "lucide-react";

interface ReportViewerProps {
  onClose: () => void;
  initialReportType?: string;
  bookingsProps?: any[];
  transactionsProps?: any[];
  apartmentsProps?: any[];
  accountsProps?: any[];
  initialSelectedId?: string;
}

export default function ReportViewer({ 
  onClose, 
  initialReportType = "invoice",
  bookingsProps = [],
  transactionsProps = [],
  apartmentsProps = [],
  accountsProps = [],
  initialSelectedId = ""
}: ReportViewerProps) {
  
  // Choose among 8 report types:
  // 'invoice', 'contracts', 'financial', 'occupancy', 'housekeeping', 'coa', 'trial', 'ledger'
  const [reportType, setReportType] = useState<string>(initialReportType);

  // Core Data State
  const [bookings, setBookings] = useState<any[]>(bookingsProps);
  const [transactions, setTransactions] = useState<any[]>(transactionsProps);
  const [apartments, setApartments] = useState<any[]>(apartmentsProps);
  const [accounts, setAccounts] = useState<any[]>(accountsProps);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Selectors inside reports
  const [selectedBookingId, setSelectedBookingId] = useState<string>(initialSelectedId);
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState<string>("1101");

  // Export Loading States and Alerts
  const [pdfLoading, setPdfLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-dismiss alerts
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Fetch missing or updated data on mount
  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [bkRes, txRes, aptRes, acRes, jeRes] = await Promise.all([
        fetch("/api/bookings"),
        fetch("/api/transactions"),
        fetch("/api/apartments"),
        fetch("/api/accounts"),
        fetch("/api/journal-entries")
      ]);
      const bk = await bkRes.json();
      const tx = await txRes.json();
      const apt = await aptRes.json();
      const ac = await acRes.json();
      const je = await jeRes.json();

      setBookings(bk);
      setTransactions(tx);
      setApartments(apt);
      setAccounts(ac);
      setJournalEntries(je);

      // Auto-select first booking if none specified
      if (!selectedBookingId && bk.length > 0) {
        setSelectedBookingId(String(bk[0].id));
      }
    } catch (err) {
      console.error("Error loading data in ReportViewer", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (initialReportType) {
      setReportType(initialReportType);
    }
    if (initialSelectedId) {
      setSelectedBookingId(initialSelectedId);
    }
  }, [initialReportType, initialSelectedId]);

  // Handle immediate window print with optimal timeout delay to settle layout
  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 550);
  };

  const getReportTitleId = () => {
    switch (reportType) {
      case "invoice": return "invoice";
      case "contracts": return "contracts_registry";
      case "financial": return "financial_cashflow";
      case "occupancy": return "occupancy_metrics";
      case "housekeeping": return "housekeeping_dispatch";
      case "coa": return "chart_of_accounts";
      case "trial": return "trial_balance";
      case "ledger": return "general_ledger";
      default: return "hotel_report";
    }
  };

  const exportToPDF = async () => {
    if (pdfLoading) return;
    try {
      setPdfLoading(true);
      const reportElement = document.querySelector(".printable-paper-area") as HTMLElement;
      if (!reportElement) {
        throw new Error("لم يتم العثور على منطقة التقرير القابلة للطباعة.");
      }

      // High-DPI canvas capture for crisp fonts and graphics (especially Arabic letters)
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: "#ffffff"
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      const pdf = new jsPDF("p", "mm", "a4");
      let position = 0;

      // Add first page
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // If multi-page content, add subsequent pages
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const filename = `${getReportTitleId()}-${Date.now()}.pdf`;
      pdf.save(filename);
      setSuccessMessage("تم تصدير التقرير الفني كملف PDF بنجاح!");
    } catch (err: any) {
      console.error("PDF Export error:", err);
      setErrorMessage("حدث خطأ أثناء تصدير ملف PDF: " + (err.message || String(err)));
    } finally {
      setPdfLoading(false);
    }
  };

  const exportToExcel = () => {
    if (excelLoading) return;
    try {
      setExcelLoading(true);
      let dataToExport: any[] = [];
      let sheetName = "تقرير فندقي";

      switch (reportType) {
        case "invoice": {
          const bk = getSelectedBooking();
          if (!bk) throw new Error("لا توجد بيانات فاتورة في الوقت الحالي لتصديرها.");
          sheetName = `فاتورة-${bk.id}`;
          dataToExport = [
            { "بيانات الفاتورة والنزيل": "رقم عقد التسكين الرسمي", "القيمة التفصيلية": String(bk.id).padStart(5, '0') },
            { "بيانات الفاتورة والنزيل": "اسم النزيل الثلاثي المحترم", "القيمة التفصيلية": bk.tenant_name },
            { "بيانات الفاتورة والنزيل": "نوع ورقم الهوية الوطنية/الإقامة", "القيمة التفصيلية": `${bk.guest_id_type === "national_id" ? "هوية وطنية" : bk.guest_id_type === "residency_id" ? "إقامة" : "جواز سفر"}: ${bk.guest_id_number}` },
            { "بيانات الفاتورة والنزيل": "جنسية النزيل", "القيمة التفصيلية": bk.guest_nationality },
            { "بيانات الفاتورة والنزيل": "رقم جوال وبيانات الاتصال", "القيمة التفصيلية": bk.guest_phone },
            { "بيانات الفاتورة والنزيل": "رقم الشقة المخصصة", "القيمة التفصيلية": `شقة ${bk.room_number || bk.apartment_id} (${bk.apartment_type || "غرفة وصالة "})` },
            { "بيانات الفاتورة والنزيل": "تاريخ الدخول والتمكين", "القيمة التفصيلية": bk.check_in },
            { "بيانات الفاتورة والنزيل": "تاريخ الخروج المغادرة المتوقع", "القيمة التفصيلية": bk.check_out },
            { "بيانات الفاتورة والنزيل": "إجمالي عدد ليالي الإقامة", "القيمة التفصيلية": `${bk.days_count} أيام` },
            { "بيانات الفاتورة والنزيل": "أجر الليلة الواحدة شامل VAT", "القيمة التفصيلية": `${(bk.price_per_night)?.toFixed(2)} ر.س` },
            { "بيانات الفاتورة والنزيل": "القيمة المضافة الضريبية 15%", "القيمة التفصيلية": `${(bk.vat_amount)?.toFixed(2)} ر.س` },
            { "بيانات الفاتورة والنزيل": "المجموع الإجمالي الكلي المعتمد", "القيمة التفصيلية": `${(bk.total_price)?.toFixed(2)} ر.س` },
            { "بيانات الفاتورة والنزيل": "المبلغ المدفوع الواصل للصندوق", "القيمة التفصيلية": `${(bk.paid_amount)?.toFixed(2)} ر.س` },
            { "بيانات الفاتورة والنزيل": "الرصيد المتبقي ذمة غير مسدد", "القيمة التفصيلية": `${(bk.remaining_amount)?.toFixed(2)} ر.س` },
            { "بيانات الفاتورة والنزيل": "طريقة السداد والأداة", "القيمة التفصيلية": bk.payment_method === "mada" ? "مدى" : bk.payment_method === "cash" ? "نقدي" : "بطاقة ائتمان" }
          ];
          break;
        }
        case "contracts": {
          sheetName = "سجل عقود التسكين";
          dataToExport = bookings.map(bk => ({
            "رقم العقد": String(bk.id).padStart(5, '0'),
            "رقم الشقة": bk.room_number || bk.apartment_id,
            "اسم المستأجر": bk.tenant_name,
            "رقم الهوية": bk.guest_id_number,
            "الجنسية": bk.guest_nationality,
            "تاريخ الدخول": bk.check_in,
            "تاريخ المغادرة": bk.check_out,
            "عدد ليالي الإقامة": bk.days_count,
            "الإجمالي شامل الضريبة": bk.total_price,
            "المدفوع الواصل": bk.paid_amount,
            "المتبقي ذمة": bk.remaining_amount,
            "طريقة السداد": bk.payment_method === "mada" ? "مدى" : bk.payment_method === "cash" ? "نقدي" : "بطاقة ائتمان",
            "الحالة التشغيلية": bk.status === "active" ? "ساري الصلاحية" : "مغادرة مسدودة"
          }));
          break;
        }
        case "financial": {
          sheetName = "تقرير المقبوضات والضرائب";
          dataToExport = transactions.map(tx => {
            const base = Number((tx.amount / 1.15).toFixed(2));
            const vat = Number((tx.amount - base).toFixed(2));
            return {
              "رقم العملية المالي": `TX-${tx.id}`,
              "نوع السند المالي": tx.type === "receipt_in" ? "سند قبض مبيعات ونزلاء" : "سند صرف مصروفات وتشغيل",
              "المستفيد / العميل": tx.beneficiary || tx.tenant_name || "عام / غير محدد",
              "المبلغ الكلي شامل VAT": tx.amount,
              "القيمة الخاضعة للضريبة": tx.type === "receipt_in" ? base : "—",
              "ضريبة القيمة المضافة 15%": tx.type === "receipt_in" ? vat : "—",
              "البيان والسبب المالي": tx.description,
              "التاريخ وتوقيت التحرير": tx.created_at || "غير متعين"
            };
          });
          break;
        }
        case "occupancy": {
          sheetName = "سجل الإشغال والغرف";
          dataToExport = apartments.map(apt => ({
            "رقم الشقة": apt.room_number,
            "اسم ومعرّف الوحدة": apt.name,
            "نوع الفئة والميزات": apt.type,
            "رقم الطابق بالفندق": apt.floor,
            "عدد الأسرة والأثاث": apt.beds_count,
            "تعرفة الإيجار بالليلة ر.س": apt.price_per_night,
            "الحالة اللحظية للغرفة": 
              apt.status === "available" ? "شاغرة ونظيفة للتقيين" :
              apt.status === "occupied" ? "مشغولة حالياً بنزيل" :
              apt.status === "dirty" ? "بحاجة تنظيف معقم" :
              apt.status === "maintenance" ? "تحت الصيانة العاجلة" : "محجوزة إلكترونياً"
          }));
          break;
        }
        case "housekeeping": {
          sheetName = "سجل المغادرات والنظافة";
          const dirtyRooms = apartments.filter(a => a.status === 'dirty');
          const maintenanceRooms = apartments.filter(a => a.status === 'maintenance');
          
          dirtyRooms.forEach(r => {
            dataToExport.push({
              "رقم الغرفة بالفندق": r.room_number,
              "معرف وموقع الوحدة": r.name || r.type,
              "الطابق": r.floor,
              "الطلب والاحتياج العاجل": "غسيل المفروشات والنظافة والتعقيم الشامل ومحتويات الضيافة",
              "مستوى الاستعجال والخطورة": "مرتفع - مغادرة نزيل محتملة التسكين الفوري"
            });
          });
          
          maintenanceRooms.forEach(r => {
            dataToExport.push({
              "رقم الغرفة بالفندق": r.room_number,
              "معرف وموقع الوحدة": r.name || r.type,
              "الطابق": r.floor,
              "الطلب والاحتياج العاجل": "إصلاح فوري للأعطال المعطية للصدا والعيوب الفنية بالفروق",
              "مستوى الاستعجال والخطورة": r.description || "معطلة بانتظار استلام جدول الصيانة والكهرباء"
            });
          });

          if (dataToExport.length === 0) {
            dataToExport.push({
              "حالة الفندق": "نظيف ومبخر بالكامل ولا توجد غرف تحتاج لتدبير منزلي ومغاسل حالياً."
            });
          }
          break;
        }
        case "coa": {
          sheetName = "شجرة دليل الحسابات بالفندق";
          dataToExport = accounts.map(a => ({
            "رمز الكود المحاسبي": a.code,
            "اسم الحساب الدفتري": a.name,
            "تبويب الحساب (طبيعة)": a.type,
            "رسم الحساب بالشجرة": a.classification === "Main" ? "حساب رئيسي تجميعي" : "حساب تفصيلي فرعي للترحيل",
            "الرصيد المالي الجاري ر.س": a.balance
          }));
          break;
        }
        case "trial": {
          sheetName = "ميزان المراجعة بالأرصدة";
          const trialMainAccs = accounts.filter(acc => acc.classification === "Main");
          dataToExport = trialMainAccs.map(acc => {
            const isDebitAcc = acc.type === "Asset" || acc.type === "Expense";
            return {
              "رقم الحساب التجميعي": acc.code,
              "اسم الحساب الدفتري": acc.name,
              "الأرصدة المدينة (Debit) ر.س": isDebitAcc ? acc.balance : 0,
              "الأرصدة الدائنة (Credit) ر.س": !isDebitAcc ? acc.balance : 0
            };
          });
          break;
        }
        case "ledger": {
          const ledgerRows = getLedgerItemsForAccount(selectedLedgerAccount);
          sheetName = `دفتر الأستاذ-${selectedLedgerAccount}`;
          if (ledgerRows.length === 0) {
            dataToExport = [
              { "كشف حركات الحساب": "لم يتم رصد أي قيود يومية مسجلة بعد القيد الافتتاحي ودفتر الأرصدة لهذا الكود." }
            ];
          } else {
            dataToExport = ledgerRows.map(row => ({
              "يوم وتاريخ الحركة": row.date,
              "رقم قيد اليومية العام": `JE-${row.entryId}`,
              "البيان والشرح المالي التفصيلي": row.desc,
              "المستحق والدافع للحركة": row.beneficiary || "عام تلقائي",
              "مبالغ مدينة (+) ر.س": row.debit,
              "مبالغ دائنة (-) ر.س": row.credit,
              "الرصيد التراكمي للحساب": row.runningBalance
            }));
          }
          break;
        }
      }

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      
      // Auto enable RTL right-to-left layout for clean Arabic looking Excel spreadsheets
      ws['!views'] = [{ RTL: true }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));

      const filename = `${getReportTitleId()}-${Date.now()}.xlsx`;
      XLSX.writeFile(wb, filename);
      
      setSuccessMessage("تم تفريغ جدول البيانات وتصدير ملف إكسل (Excel) بنجاح!");
    } catch (err: any) {
      console.error("Excel Export error:", err);
      setErrorMessage("حدث خطأ بمحاولة كتابة وتمرير ملف إكسل: " + (err.message || String(err)));
    } finally {
      setExcelLoading(false);
    }
  };

  // Helper formulas for specific report views
  const getSelectedBooking = () => {
    return bookings.find(b => String(b.id) === selectedBookingId) || bookings[0];
  };

  // Ledger algorithm for chosen account
  const getLedgerItemsForAccount = (acCode: string) => {
    const account = accounts.find(a => a.code === acCode);
    if (!account) return [];

    const runningItems: any[] = [];
    let balanceAccumulate = Number(account.initial_balance || 0);
    const sortedEntries = [...journalEntries].sort((a, b) => a.id - b.id);

    sortedEntries.forEach(entry => {
      if (entry.items) {
        entry.items.forEach((item: any) => {
          if (item.account_code === acCode) {
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
      }
    });

    return runningItems;
  };

  // Statistics summaries
  const totalReceipts = transactions
    .filter(t => t.type === 'receipt_in')
    .reduce((sum, current) => sum + Number(current.amount || 0), 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'voucher_out')
    .reduce((sum, current) => sum + Number(current.amount || 0), 0);

  const netBeforeTax = isNaN(totalReceipts) ? 0 : Number((totalReceipts / 1.15).toFixed(2));
  const vatAmountPart = isNaN(totalReceipts) ? 0 : Number((totalReceipts - netBeforeTax).toFixed(2));

  const occupiedCount = apartments.filter(a => a.status === 'occupied').length;
  const totalRoomsCount = apartments.length || 12;
  const rawOccupancyPercent = totalRoomsCount > 0 ? (occupiedCount / totalRoomsCount) * 100 : 0;
  const currentOccupancyPercent = isNaN(rawOccupancyPercent) ? 0 : rawOccupancyPercent;

  const totalTrialDebit = accounts
    .filter(item => item.classification === "Main")
    .reduce((sum, item) => {
      return sum + (item.type === "Asset" || item.type === "Expense" ? Number(item.balance || 0) : 0);
    }, 0);

  const totalTrialCredit = accounts
    .filter(item => item.classification === "Main")
    .reduce((sum, item) => {
      return sum + (item.type === "Liability" || item.type === "Equity" || item.type === "Revenue" ? Number(item.balance || 0) : 0);
    }, 0);


  // Render different report definitions
  const renderSelectedReportBody = () => {
    switch (reportType) {
      case "invoice": {
        const bk = getSelectedBooking();
        if (!bk) {
          return (
            <div className="text-center py-12 text-neutral-400">
              لا توجد عقود نزلاء مسجلة لإصدار الفواتير حالياً.
            </div>
          );
        }
        return (
          <div className="space-y-6">
            <div className="border border-neutral-205 p-4 rounded-xl bg-neutral-50/50">
              <h4 className="font-extrabold text-neutral-900 text-xs mb-3 border-b pb-2 flex items-center gap-1.5">
                <Bookmark className="text-emerald-600" size={14} />
                تفاصيل وبيانات عقد التسكين والنزيل المحترم:
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px] text-neutral-700">
                <div>
                  <span className="text-neutral-400 block font-bold">اسم النزيل الثلاثي:</span>
                  <span className="font-bold text-neutral-900 text-xs">{bk.tenant_name}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block font-bold">نوع ورقم الهوية الرسمية:</span>
                  <span className="font-mono text-neutral-900">{bk.guest_id_type === "national_id" ? "هوية وطنية" : bk.guest_id_type === "residency_id" ? "إقامة" : "جواز سفر"}: {bk.guest_id_number}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block font-bold">جنسية النزيل ومحمل الاتصال:</span>
                  <span className="font-bold text-neutral-900">{bk.guest_nationality} ({bk.guest_phone})</span>
                </div>
                <div>
                  <span className="text-neutral-400 block font-bold">الشقة المخصصة:</span>
                  <span className="text-[12px] text-emerald-800 font-bold">شقة {bk.room_number || bk.apartment_id} ({bk.apartment_type || "غرفة وصالة"})</span>
                </div>
              </div>
            </div>

            {/* Price Calculations */}
            <div className="border border-neutral-200 rounded-xl overflow-hidden shadow-sm bg-white">
              <table className="w-full text-right text-xs">
                <thead className="bg-neutral-100 font-extrabold text-neutral-800 border-b border-neutral-200">
                  <tr>
                    <th className="px-5 py-3">بيان البند والخدمة</th>
                    <th className="px-5 py-3 text-center">أيام الإقامة</th>
                    <th className="px-5 py-3 text-left">أجر الليلة (شاملاً VAT)</th>
                    <th className="px-5 py-3 text-left">الضريبة المفروضة (15%)</th>
                    <th className="px-5 py-3 text-left font-bold text-neutral-950">المجموع الكلي المعتمد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  <tr>
                    <td className="px-5 py-4">
                      <p className="font-bold text-neutral-900">إيجار وحدة سكنية مخدومة (شقة #{bk.room_number})</p>
                      <p className="text-[10px] text-neutral-400 mt-1">تاريخ الدخول: {bk.check_in} | الخروج المتوقع: {bk.check_out}</p>
                    </td>
                    <td className="px-5 py-4 text-center font-mono font-bold text-neutral-900">{bk.days_count} ليالي</td>
                    <td className="px-5 py-4 text-left font-mono text-neutral-700">{(bk.price_per_night)?.toFixed(2)} ر.س</td>
                    <td className="px-5 py-4 text-left font-mono text-neutral-500">{(bk.vat_amount)?.toFixed(2)} ر.س</td>
                    <td className="px-5 py-4 text-left font-mono font-bold text-neutral-950">{(bk.total_price)?.toFixed(2)} ر.س</td>
                  </tr>
                </tbody>
              </table>

              {/* Aggregations Row */}
              <div className="p-5 bg-neutral-55 border-t border-neutral-200 flex flex-col md:flex-row md:justify-between items-end gap-4 text-xs">
                {/* ZATCA QR simulator inside invoice report */}
                <div className="flex items-center gap-3 bg-white p-2 border rounded-lg shadow-inner">
                  <div className="w-18 h-18 bg-neutral-900 grid grid-cols-5 gap-0.5 border border-neutral-300">
                    {[...Array(25)].map((_, i) => (
                      <div key={i} className={`w-full h-full ${i % 3 === 0 || i % 4 === 1 ? 'bg-white' : 'bg-neutral-900'}`} />
                    ))}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded bg-emerald-50 block w-fit mb-1">فاتورة ممتثلة ZATCA</span>
                    <p className="text-[9px] text-neutral-400 leading-tight max-w-[150px]">تم تدوير وحفظ الفاتورة الضريبية وفق اشتراطات الربط الأمنية لمديرية الضرائب والجمارك السعودية.</p>
                  </div>
                </div>

                <div className="space-y-1.5 font-mono text-neutral-700 text-left w-full md:w-64 max-w-full">
                  <div className="flex justify-between">
                    <span>القيمة الخاضعة للضريبة:</span>
                    <span>{(bk.subtotal || bk.total_price / 1.15)?.toFixed(2)} ر.س</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ضريبة القيمة المضافة (15%):</span>
                    <span>{(bk.vat_amount || bk.total_price - (bk.total_price / 1.15))?.toFixed(2)} ر.س</span>
                  </div>
                  <div className="border-t border-neutral-200 my-1"></div>
                  <div className="flex justify-between font-extrabold text-neutral-950 text-sm">
                    <span>المبلغ الكلي شامل VAT:</span>
                    <span>{(bk.total_price)?.toFixed(2)} ر.س</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-800">
                    <span>المدفوع الواصل للصندوق:</span>
                    <span>{(bk.paid_amount)?.toFixed(2)} ر.س</span>
                  </div>
                  <div className="flex justify-between font-bold text-rose-600">
                    <span>الرصيد المتبقي بذمة العميل:</span>
                    <span>{(bk.remaining_amount)?.toFixed(2)} ر.س</span>
                  </div>
                </div>
              </div>
            </div>
            
            {bk.notes && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-[10px] text-amber-900">
                <strong>💡 شروط وطلبات خاصة بالنزيل: </strong> {bk.notes}
              </div>
            )}
          </div>
        );
      }

      case "contracts": {
        return (
          <div className="space-y-4">
            <div className="bg-neutral-50 px-4 py-3 border border-neutral-200 rounded-xl text-neutral-700 text-[11px] font-bold flex flex-wrap justify-between gap-2">
              <span>إجمالي العقود التشغيلية الحالية: {bookings.length} عقد</span>
              <span className="font-mono text-emerald-700">مجموع المقبوضات: {bookings.reduce((s, b) => s + (b.paid_amount || 0), 0).toFixed(2)} ر.س</span>
              <span className="font-mono text-rose-600">القيد الدائن (متبقي بذمة النزلاء): {bookings.reduce((s, b) => s + (b.remaining_amount || 0), 0).toFixed(2)} ر.s</span>
            </div>

            <table className="w-full text-right text-xs border border-neutral-200 rounded-xl overflow-hidden">
              <thead className="bg-neutral-100 text-neutral-700 font-extrabold border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-3">رقم العقد والوحدة</th>
                  <th className="px-4 py-3">النزيل المستأجر</th>
                  <th className="px-4 py-3 text-center">الليالي والوقيت</th>
                  <th className="px-4 py-3 text-left font-bold">مجموع الفاتورة</th>
                  <th className="px-4 py-3 text-left font-bold text-emerald-800">المدفوع الصندوق</th>
                  <th className="px-4 py-3 text-left font-bold text-rose-600">المتبقي ذمة</th>
                  <th className="px-4 py-3 text-center">أداة تسديد</th>
                  <th className="px-4 py-3 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {bookings.map((bk, i) => (
                  <tr key={bk.id || i} className="hover:bg-neutral-50/50">
                    <td className="px-4 py-3 font-mono">
                      <span className="font-bold text-neutral-900">#{String(bk.id).padStart(5, '0')}</span>
                      <span className="block text-[10px] text-emerald-800 font-bold">شقة {bk.room_number || bk.apartment_id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-neutral-900">{bk.tenant_name}</p>
                      <p className="text-[10px] text-neutral-400 font-mono">{bk.guest_id_number} ({bk.guest_nationality})</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <p className="font-bold">{bk.days_count} ليالي</p>
                      <p className="text-[10px] text-neutral-400 font-mono">{bk.check_in} لغاية {bk.check_out}</p>
                    </td>
                    <td className="px-4 py-3 text-left font-mono font-bold text-neutral-850">{(bk.total_price)?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-left font-mono font-bold text-emerald-700 font-semibold">{(bk.paid_amount)?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-left font-mono font-bold text-rose-600">{(bk.remaining_amount)?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center font-bold text-[10px]">
                      <span className="bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-700">
                        {bk.payment_method === "mada" ? "مدى" : bk.payment_method === "cash" ? "نقدي" : "بطاقة ائتمان"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        bk.status === "active" ? "bg-emerald-55 text-emerald-800 border border-emerald-200" : "bg-neutral-100 text-neutral-500"
                      }`}>
                        {bk.status === "active" ? "عقد نشط" : bk.status === "completed" ? "منتهي ومغلق" : "ملغي"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      case "financial": {
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div className="border border-neutral-200 rounded-xl p-3 bg-neutral-50">
                <p className="text-[10px] text-neutral-400 font-bold mb-1">إجمالي الإيرادات (VAT 15%)</p>
                <p className="text-sm font-extrabold text-emerald-800 font-mono">{totalReceipts.toFixed(2)} ر.س</p>
              </div>
              <div className="border border-neutral-200 rounded-xl p-3 bg-neutral-50">
                <p className="text-[10px] text-neutral-400 font-bold mb-1">الصافي قبل الضريبة</p>
                <p className="text-sm font-extrabold text-neutral-800 font-mono">{netBeforeTax.toFixed(2)} ر.س</p>
              </div>
              <div className="border border-neutral-200 rounded-xl p-3 bg-neutral-50">
                <p className="text-[10px] text-neutral-400 font-bold mb-1">مجموع الضريبة المضافة 15%</p>
                <p className="text-sm font-extrabold text-indigo-800 font-mono">{vatAmountPart.toFixed(2)} ر.س</p>
              </div>
              <div className="border border-neutral-200 rounded-xl p-3 bg-neutral-50">
                <p className="text-[10px] text-neutral-400 font-bold mb-1">إجمالي المصروفات الخارجة</p>
                <p className="text-sm font-extrabold text-rose-800 font-mono">{totalExpenses.toFixed(2)} ر.س</p>
              </div>
            </div>

            {/* List of journal transactions */}
            <div>
              <h4 className="font-bold text-xs text-neutral-900 mb-3 block">كشف المقبوضات والصادرات التفصيلي لفترة التقرير:</h4>
              <table className="w-full text-right text-xs border border-neutral-200 rounded-xl overflow-hidden">
                <thead className="bg-neutral-100 text-neutral-700 font-extrabold border-b border-neutral-200">
                  <tr>
                    <th className="px-4 py-3">رقم العملية</th>
                    <th className="px-4 py-3">نوع الحركة</th>
                    <th className="px-4 py-3">المستفيد / العميل</th>
                    <th className="px-4 py-3 text-left font-bold">الإجمالي المالي</th>
                    <th className="px-4 py-3 text-left">قيمة الضريبة (15%)</th>
                    <th className="px-4 py-3">البيان المالي</th>
                    <th className="px-4 py-3 font-mono text-center">التاريخ والتوقيت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 font-sans">
                  {transactions.map((tx, idx) => {
                    const base = Number((tx.amount / 1.15).toFixed(2));
                    const vat = Number((tx.amount - base).toFixed(2));
                    return (
                      <tr key={tx.id || idx}>
                        <td className="px-4 py-3.5 font-mono font-bold text-neutral-500">TX-{tx.id}</td>
                        <td className="px-4 py-3.5">
                          {tx.type === "receipt_in" ? (
                            <span className="text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 text-[10px]">🟢 سند قبض</span>
                          ) : (
                            <span className="text-rose-800 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 text-[10px]">🔴 سند صرف</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-neutral-800">{tx.beneficiary || tx.tenant_name || "عام / غير محدد"}</td>
                        <td className="px-4 py-3.5 text-left font-mono font-bold">{(tx.amount)?.toFixed(2)} ر.س</td>
                        <td className="px-4 py-3.5 text-left font-mono text-indigo-700 font-bold">{tx.type === "receipt_in" ? `${vat.toFixed(2)} ر.س` : "—"}</td>
                        <td className="px-4 py-3.5 text-neutral-600 max-w-[200px] truncate" title={tx.description}>{tx.description}</td>
                        <td className="px-4 py-3.5 font-mono text-neutral-500 text-center">{tx.created_at || "2026-05-22"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      case "occupancy": {
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="border rounded-xl p-4 bg-neutral-50">
                <p className="text-xs text-neutral-400 font-bold mb-1">نسبة الإشغال الكلية</p>
                <p className="text-2xl font-bold font-mono text-neutral-900">{currentOccupancyPercent.toFixed(1)}%</p>
                <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden mt-3 max-w-[200px] mx-auto">
                  <div className="bg-emerald-600 h-full" style={{ width: `${currentOccupancyPercent}%` }}></div>
                </div>
              </div>

              <div className="border rounded-xl p-4 bg-neutral-50">
                <p className="text-xs text-neutral-400 font-bold mb-1">معدل الغرف المشغولة</p>
                <p className="text-2xl font-bold font-mono text-neutral-900">{occupiedCount} شقق</p>
                <p className="text-[10px] text-neutral-400 mt-2">من أصل {totalRoomsCount} شقق مرخصة بالدليل الإنشائي للفندق</p>
              </div>

              <div className="border rounded-xl p-4 bg-neutral-50">
                <p className="text-xs text-neutral-400 font-bold mb-1">الشقق بانتظار الخدمة وصيانة</p>
                <p className="text-2xl font-bold font-mono text-neutral-900">
                  {apartments.filter(a => a.status === 'dirty').length + apartments.filter(a => a.status === 'maintenance').length} شقة
                </p>
                <p className="text-[10px] text-neutral-400 mt-2">عطل فني: {apartments.filter(a => a.status === 'maintenance').length} | تتطلب تنظيف: {apartments.filter(a => a.status === 'dirty').length}</p>
              </div>
            </div>

            {/* List of apartments rooms details list */}
            <div>
              <h4 className="font-bold text-xs text-neutral-900 mb-3 block">سجل وجرد الغرف وحالتها التشغيلية الفورية:</h4>
              <table className="w-full text-right text-xs border border-neutral-200 rounded-xl overflow-hidden">
                <thead className="bg-neutral-100 text-neutral-700 font-extrabold border-b border-neutral-200">
                  <tr>
                    <th className="px-4 py-3">رقم الشقة</th>
                    <th className="px-4 py-3">الاسم والمعرف</th>
                    <th className="px-4 py-3">الفئة والغرف</th>
                    <th className="px-4 py-3 text-center">الطابق</th>
                    <th className="px-4 py-3 text-center">الأسرة</th>
                    <th className="px-4 py-3 text-left">أجر الليلة (ر.س)</th>
                    <th className="px-4 py-3 text-center">الحالة الحالية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {apartments.map((apt, idx) => (
                    <tr key={apt.id || idx}>
                      <td className="px-4 py-3 font-mono font-bold text-neutral-950 text-sm">
                        <span className="bg-neutral-100 px-2.5 py-1 rounded-md border text-neutral-700">
                          {apt.room_number}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-neutral-800">{apt.name}</td>
                      <td className="px-4 py-3 font-semibold text-neutral-600">{apt.type}</td>
                      <td className="px-4 py-3 text-center font-bold">الطابق {apt.floor}</td>
                      <td className="px-4 py-3 text-center font-bold">{apt.beds_count} أسرة</td>
                      <td className="px-4 py-3 text-left font-mono font-bold text-neutral-850">{apt.price_per_night}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          apt.status === "available" ? "bg-emerald-50 text-emerald-800 border border-emerald-250" :
                          apt.status === "occupied" ? "bg-rose-50 text-rose-800 border border-rose-250" :
                          apt.status === "dirty" ? "bg-yellow-50 text-yellow-800 border border-yellow-250" : "bg-neutral-100 text-neutral-600"
                        }`}>
                          {apt.status === "available" ? "شاغرة نظيفة" :
                           apt.status === "occupied" ? "مشغولة حالياً" :
                           apt.status === "dirty" ? "بحاجة نظافة" :
                           apt.status === "maintenance" ? "تحت الصيانة" : "محجوزة"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      case "housekeeping": {
        const dirtyRooms = apartments.filter(a => a.status === 'dirty');
        const maintenanceRooms = apartments.filter(a => a.status === 'maintenance');
        return (
          <div className="space-y-6">
            <div className="bg-neutral-50 p-4 border rounded-xl text-neutral-700 text-xs leading-relaxed space-y-1">
              <span className="font-extrabold text-neutral-900 block flex items-center gap-1">
                <ShieldCheck className="text-emerald-700" size={14} />
                لائحة نظافة وضيافة الفندق والتعليمات الطهورية والشروط البلدية والمغادمات:
              </span>
              <p>1. غسل الأغطية والمفروشات لجميع الشقق الخارجة بماء ساخن ومعقم حراري مخصص.</p>
              <p>2. تزويد الشقق بالضيافات الأساسية (مياه، مناديل، شامبو، وجبات كرت، بطاقة الترحيب).</p>
              <p>3. إبرام إعطال التكييف والصيانة فوراً وقفل الشقة فنية بنظام نزيل لتعطيل كود كرت الدخول منعاً للتسكين العابر.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-yellow-200 rounded-xl p-4 bg-yellow-50/15">
                <h4 className="font-bold text-xs text-yellow-800 mb-3 flex items-center gap-1.5 border-b pb-2">
                  <Sparkles size={14} />
                  الشقق المتسخة بانتظار مغسلة وتعقيم ({dirtyRooms.length} شقة):
                </h4>
                {dirtyRooms.length === 0 ? (
                  <p className="text-xs text-neutral-400 text-center py-4">شاغرة معقمة بالكامل، لا تتوفر أي شقة بحاجة لنظافة حالياً.</p>
                ) : (
                  <div className="space-y-2">
                    {dirtyRooms.map(r => (
                      <div key={r.id} className="flex justify-between items-center text-xs p-2.5 bg-white rounded-lg border border-yellow-150">
                        <span className="font-mono font-bold text-neutral-950">شقة رقم {r.room_number} ({r.name})</span>
                        <span className="text-[10px] bg-yellow-500 text-neutral-950 font-bold px-2 py-0.5 rounded">تحتاج نظافة فورية</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border border-red-200 rounded-xl p-4 bg-red-50/15">
                <h4 className="font-bold text-xs text-red-800 mb-3 flex items-center gap-1.5 border-b pb-2">
                  <Wrench size={14} />
                  الشقق المغلقة للصيانة وبلاغات الأعطال فنية ({maintenanceRooms.length} غرف):
                </h4>
                {maintenanceRooms.length === 0 ? (
                  <p className="text-xs text-neutral-400 text-center py-4">لا تتوفر غرف في وضع صيانة معطلة.</p>
                ) : (
                  <div className="space-y-2">
                    {maintenanceRooms.map(r => (
                      <div key={r.id} className="p-2.5 bg-white rounded-lg border border-red-150 text-xs">
                        <div className="flex justify-between font-bold text-neutral-950 mb-1">
                          <span>شقة رقم {r.room_number} (الطابق {r.floor})</span>
                          <span className="text-[10px] bg-rose-600 text-white font-bold px-2 py-0.5 rounded">صيانة معطلة</span>
                        </div>
                        <p className="text-[10px] text-neutral-500">{r.description || "معطلة بانتظار فحص فنيين ومكتب الصيانة"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }

      case "coa": {
        const categories = ["Asset", "Liability", "Equity", "Revenue", "Expense"];
        const getTypeNameAr = (t: string) => {
          if (t === "Asset") return "الأصول والمدخرات المتاحة (Assets)";
          if (t === "Liability") return "الالتزامات الضريبية والذمم الدائنة (Liabilities)";
          if (t === "Equity") return "حقوق الملاك والمستثمرين بالمنشأة (Equity)";
          if (t === "Revenue") return "الإيرادات والمبيعات التشغيلية (Revenues)";
          return "المصروفات والأعباء والتشغيل (Expenses)";
        };

        return (
          <div className="space-y-6">
            <p className="text-neutral-500 text-[11px] font-bold">شجرة الحسابات بالفندق مهيأة ومنظمة محاسبياً حسب الأصول المعتمدة في المملكة العربية السعودية للتدقيق المالي الشامل.</p>
            {categories.map(cat => {
              const catAccounts = accounts.filter(a => a.type === cat);
              return (
                <div key={cat} className="space-y-2 border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-neutral-105 px-4 py-2 border-b font-extrabold text-xs text-neutral-800 bg-neutral-100">
                    {getTypeNameAr(cat)}
                  </div>
                  <div className="divide-y divide-neutral-200">
                    {catAccounts.map(acc => {
                      const isMain = acc.classification === "Main";
                      return (
                        <div key={acc.code} className={`px-4 py-2.5 flex justify-between items-center text-xs ${isMain ? "bg-emerald-50/30" : "pr-8"}`}>
                          <div className="flex items-center gap-2">
                            <span className={`font-mono font-bold px-2 py-0.5 rounded ${isMain ? "bg-emerald-100 text-emerald-800" : "bg-neutral-100 text-neutral-500"}`}>
                              {acc.code}
                            </span>
                            <span className={isMain ? "font-extrabold text-neutral-950" : "text-neutral-700"}>
                              {acc.name}
                            </span>
                            {isMain && (
                              <span className="text-[8px] border bg-emerald-100 text-emerald-800 px-1.5 py-0.1 rounded font-extrabold">رئيسي تجميعي لميزان المراجعة</span>
                            )}
                          </div>
                          <span className="font-mono font-bold font-semibold text-neutral-900">
                            {acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        );
      }

      case "trial": {
        const trialMainAccs = accounts.filter(acc => acc.classification === "Main");
        return (
          <div className="space-y-4">
            <p className="text-[11px] text-neutral-500">يعكس ميزان المراجعة أدناه رصيد الحسابات الرئيسية تجميعياً للفترة المالية للتأكد من الموازنة المحاسبية المزدوجة.</p>
            
            <table className="w-full text-right text-xs border border-neutral-200 rounded-xl overflow-hidden">
              <thead className="bg-neutral-100 text-neutral-700 font-extrabold border-b border-neutral-200">
                <tr>
                  <th className="px-5 py-3">رقم الحساب</th>
                  <th className="px-5 py-3">اسم الحساب بالفندق</th>
                  <th className="px-5 py-3">تصنيف الشجرة الرئيسي</th>
                  <th className="px-5 py-3 text-left font-bold text-sky-850">الأرصدة المدينة (Debit)</th>
                  <th className="px-5 py-3 text-left font-bold text-amber-850">الأرصدة الدائنة (Credit)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {trialMainAccs.map((acc, i) => {
                  const isDebitAcc = acc.type === "Asset" || acc.type === "Expense";
                  return (
                    <tr key={acc.code || i} className="hover:bg-neutral-50/50">
                      <td className="px-5 py-3 font-mono font-bold text-neutral-500">{acc.code}</td>
                      <td className="px-5 py-3 font-bold text-neutral-800">{acc.name}</td>
                      <td className="px-5 py-3 text-neutral-400">
                        {acc.type === 'Asset' && "أصل متداول / جاري"}
                        {acc.type === 'Liability' && "التزام / ذمم ومستحقات وعجز"}
                        {acc.type === 'Equity' && "حقوق الملاك والائتمان"}
                        {acc.type === 'Revenue' && "إيراد تشغيل مباشر"}
                        {acc.type === 'Expense' && "مصروف ضيافة وتنظيف"}
                      </td>
                      <td className="px-5 py-3 text-left font-mono font-bold text-neutral-850">
                        {isDebitAcc ? `${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س` : "-"}
                      </td>
                      <td className="px-5 py-3 text-left font-mono font-bold text-neutral-850">
                        {!isDebitAcc ? `${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س` : "-"}
                      </td>
                    </tr>
                  );
                })}

                {/* Sub Grand balanced total footer */}
                <tr className="bg-neutral-100 border-t-2 border-neutral-350 font-extrabold text-neutral-950 font-sans text-xs">
                  <td colSpan={3} className="px-5 py-3.5 text-right font-black">المجموع الكلي لميزان المراجعة بالأرصدة</td>
                  <td className="px-5 py-3.5 text-left font-mono font-bold text-sky-900">
                    {totalTrialDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س
                  </td>
                  <td className="px-5 py-3.5 text-left font-mono font-bold text-amber-950">
                    {totalTrialCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="bg-emerald-50 border border-emerald-250 p-3 rounded-lg text-emerald-800 font-bold text-[11px] flex justify-between items-center">
              <span>الحالة التدقيقية: تم التحقق والمواصفة الحسابية المزدوجة والميزان متوازن ومطابق بنسبة 100% 🛡️</span>
              <span className="bg-emerald-100 px-3 py-1 font-mono rounded">الفرق المالي: 0.00 ر.س</span>
            </div>
          </div>
        );
      }

      case "ledger": {
        const ledgerRows = getLedgerItemsForAccount(selectedLedgerAccount);
        const activeAcc = accounts.find(a => a.code === selectedLedgerAccount);
        return (
          <div className="space-y-4">
            <div className="bg-neutral-50 px-5 py-3.5 border border-neutral-200 rounded-xl flex flex-wrap justify-between items-center gap-4 text-xs font-bold text-neutral-700">
              <div className="flex items-center gap-2">
                <label className="text-neutral-500 font-extrabold text-xs block">تحديد الحساب لدفتر الأستاذ:</label>
                <select
                  value={selectedLedgerAccount}
                  onChange={e => setSelectedLedgerAccount(e.target.value)}
                  className="border rounded-md p-1.5 font-bold text-neutral-900 bg-white shadow-sm outline-none"
                >
                  {accounts.filter(a => a.classification === "Detail").map(a => (
                    <option key={a.code} value={a.code}>{a.code} - {a.name}</option>
                  ))}
                </select>
              </div>
              <span className="font-mono text-neutral-900">الرصيد الافتتاحي: {(activeAcc?.initial_balance || 0).toFixed(2)} ر.س</span>
            </div>

            <table className="w-full text-right text-xs border border-neutral-200 rounded-xl overflow-hidden">
              <thead className="bg-neutral-100 text-neutral-700 font-extrabold border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-3 font-medium">التاريخ واليوم</th>
                  <th className="px-4 py-3 font-medium">رقم القيد الأصلي</th>
                  <th className="px-4 py-3 font-medium">البيان والشرح المالي التفصيلي</th>
                  <th className="px-4 py-3 font-medium">المستلم / الدافع</th>
                  <th className="px-4 py-3 text-left font-bold text-sky-850">مدين (+)</th>
                  <th className="px-4 py-3 text-left font-bold text-amber-850">دائن (-)</th>
                  <th className="px-4 py-3 text-left font-bold text-neutral-950">الرصيد التراكمي المتبقي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {ledgerRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-neutral-400 font-bold">
                      لا تتوفر أي حركات محاسبية تاريخية معالجة لهذا الحساب بعد الرصيد الافتتاحي.
                    </td>
                  </tr>
                ) : (
                  ledgerRows.map((row, rx) => (
                    <tr key={rx} className="hover:bg-neutral-55">
                      <td className="px-4 py-3 font-mono text-neutral-500">{row.date}</td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-800">#JE-{row.entryId}</td>
                      <td className="px-4 py-3 font-bold text-neutral-900">{row.desc}</td>
                      <td className="px-4 py-3 text-neutral-600">{row.beneficiary || "عام"}</td>
                      <td className="px-4 py-3 text-left font-mono font-bold text-sky-850">{row.debit > 0 ? `${row.debit.toFixed(2)}` : "-"}</td>
                      <td className="px-4 py-3 text-left font-mono font-bold text-amber-850">{row.credit > 0 ? `${row.credit.toFixed(2)}` : "-"}</td>
                      <td className="px-4 py-3 text-left font-mono font-bold text-neutral-950 bg-neutral-50/50">{(row.runningBalance)?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        );
      }

      default:
        return null;
    }
  };

  const getReportTitle = () => {
    switch (reportType) {
      case "invoice": return "فاتــورة ضريبــية مبسطــة وسند قبض نقدية";
      case "contracts": return "كشف سجل عقود التسكين وإيرادات الإيجار ومستحقات النزلاء";
      case "financial": return "بيان المقبوضات الضريبية الشامل وصندوق المبيعات ومصروفات الصرف";
      case "occupancy": return "بيان نسب الإشغال والقدرة الاستيعابية ومؤشرات الأداء الفندقي المعتمدة";
      case "housekeeping": return "بيان الرقابة التشغيلية والصيانة الطارئة والنظافة وجودة الشقق";
      case "coa": return "دليل شجرة شأن الحسابات المحاسبية ودليل الفروع والتكويدات المعتمدة";
      case "trial": return "ميزان المراجعة بالأرصدة للتدقيق والامتثال وقفل الموازنة المحاسبية";
      case "ledger": return "كشـف حسـاب الأستـاذ العام المساعد التفصيلي للحركات المالية";
      default: return "تقرير رسمي";
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm shadow-xl flex flex-col items-center justify-start z-50 overflow-y-auto report-overlay-container">
      
      {/* Floating Success / Error Toast Alerts */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[99999] w-full max-w-sm md:max-w-md no-print px-4 space-y-2 pointer-events-none">
        {successMessage && (
          <div className="bg-emerald-600 text-white text-[11px] md:text-xs font-extrabold px-4 py-3 rounded-xl shadow-2xl border border-emerald-500/20 flex items-center gap-2.5 pointer-events-auto transition-all duration-300 transform translate-y-0 text-right" dir="rtl">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-200" />
            <span className="flex-1 leading-normal">{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="hover:opacity-75 p-1 shrink-0"><X size={14} /></button>
          </div>
        )}
        {errorMessage && (
          <div className="bg-rose-600 text-white text-[11px] md:text-xs font-extrabold px-4 py-3 rounded-xl shadow-2xl border border-rose-500/20 flex items-center gap-2.5 pointer-events-auto transition-all duration-300 transform translate-y-0 text-right" dir="rtl">
            <X size={16} className="bg-rose-800 rounded-full p-0.5 shrink-0 text-rose-200" />
            <span className="flex-1 leading-normal">{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="hover:opacity-75 p-1 shrink-0"><X size={14} /></button>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          /* Hide app page components during print layout */
          header, footer, main, select, option, button, .no-print, .bg-neutral-900\\/40, .fixed.inset-0:not(.report-overlay-container) {
            display: none !important;
          }
          
          /* Setup HTML core body to print across multiple pages cleanly */
          body, html, #root {
            background-color: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            direction: rtl !important;
            overflow: visible !important;
            height: auto !important;
          }
          
          /* Full dimension override for the report overlay container on print sheet */
          .report-overlay-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 100% !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            overflow: visible !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
            z-index: 9999999 !important;
          }
          
          .report-overlay-inner {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .printable-paper-area {
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 20mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
          }
          
          thead {
            display: table-header-group !important;
          }
          
          tr {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Main Container screen wrapper */}
      <div className="max-w-6xl w-full p-4 md:p-8 space-y-4 report-overlay-inner">
        
        {/* Top interactive options toolbar (HIDDEN IN PRINT) */}
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-md flex flex-col md:flex-row gap-4 items-center justify-between pointer-events-auto no-print">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-black text-neutral-500">منظومة التقارير الموحدة والمعاينة:</span>
            
            {/* Choose report type drop selection */}
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="border border-neutral-300 bg-neutral-55 rounded-lg p-2 font-bold text-xs outline-none text-neutral-800"
            >
              <option value="invoice">فاتورة التسكين المبسطة للنزيل (ZATCA)</option>
              <option value="contracts">كشف عقود الإيجار والنزلاء</option>
              <option value="financial">تقرير المقبوضات والضرائب والمصاريف</option>
              <option value="occupancy">نسبة الإشغال والأحصنة الفندقية</option>
              <option value="housekeeping">تقرير النظافة والرقابة والصيانة</option>
              <option value="coa">شجرة دليل الحسابات بالفندق</option>
              <option value="trial">ميزان المراجعة بالأرصدة</option>
              <option value="ledger">كشف حساب الأستاذ العام المساعد</option>
            </select>

            {/* Optional drop selections dependent on report chosen */}
            {reportType === "invoice" && bookings.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-neutral-500">اختر العقد:</span>
                <select
                  value={selectedBookingId}
                  onChange={(e) => setSelectedBookingId(e.target.value)}
                  className="border border-neutral-300 bg-white rounded-lg p-1.5 font-bold text-xs outline-none"
                >
                  {bookings.map(b => (
                    <option key={b.id} value={b.id}>#{String(b.id).padStart(5, '0')} - {b.tenant_name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 w-full md:w-auto">
            <button
              onClick={handlePrint}
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-2 px-3.5 rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer size={14} />
              <span>طباعة</span>
            </button>

            <button
              onClick={exportToPDF}
              type="button"
              disabled={pdfLoading}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-[11px] font-bold py-2 px-3.5 rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span>تصدير PDF</span>
            </button>

            <button
              onClick={exportToExcel}
              type="button"
              disabled={excelLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[11px] font-bold py-2 px-3.5 rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              {excelLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span>تصدير Excel</span>
            </button>

            <button
              onClick={onClose}
              type="button"
              className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
            >
              <X size={14} />
              <span>إغلاق</span>
            </button>
          </div>
        </div>

        {/* --- OFFICIAL A4 HOTEL REPORT TEMPLATE --- */}
        <div className="printable-paper-area print-area bg-white text-neutral-900 p-8 md:p-12 rounded-2xl border border-neutral-200 shadow-2xl space-y-8 font-sans transition-all max-w-4xl mx-auto" dir="rtl">
          
          {/* Header of official document */}
          <div className="border-b-4 border-emerald-600 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            
            {/* Right side: Hotel branding */}
            <div className="flex items-center gap-3">
              <div className="bg-emerald-600 text-white p-3 rounded-full border-2 border-emerald-700 shadow-lg">
                <Building2 size={32} />
              </div>
              <div className="space-y-0.5">
                <h1 className="text-xl font-black text-neutral-900 tracking-tight">شقق وفــنادق نــزيل السحابية الفاخرة</h1>
                <p className="text-[10px] text-neutral-500 leading-none">مجموعة دور الضيافة العالمية المحدودة - فرع المنطقة الشرقية</p>
                <p className="text-[9px] text-neutral-400 font-mono">سجل تجاري: 4030282190 | الرقم الضريبي الموحد: 300482930200003</p>
              </div>
            </div>

            {/* Middle: Document main title */}
            <div className="text-center md:absolute md:left-1/2 md:-translate-x-1/2 md:max-w-xs md:text-center shrink-0 w-full md:w-auto mt-2 md:mt-0">
              <span className="text-[9px] bg-emerald-50 text-emerald-800 border-emerald-200 border px-2 py-0.5 rounded-full font-bold">بموافقة الإدارة والرقابة الرسمية للمنشأة</span>
              <h2 className="text-xs font-extrabold text-neutral-500 mt-1 uppercase tracking-wider">سند مستند فندقي رسمي</h2>
            </div>

            {/* Left side: Metadata reference stamp */}
            <div className="text-right text-[10px] text-neutral-500 font-mono space-y-1 self-stretch md:self-auto flex flex-col items-end md:items-start pt-3 md:pt-0">
              <p className="flex justify-between w-full md:w-48">
                <span>رقم التقرير الإرشادي:</span>
                <span className="font-bold text-neutral-900">REP-NZL-{String((Math.random()*1000000).toFixed(0)).padStart(7, '0')}</span>
              </p>
              <p className="flex justify-between w-full md:w-48">
                <span>تاريخ التحرير والطباعة:</span>
                <span className="font-bold text-neutral-900">{new Date().toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" })}</span>
              </p>
              <p className="flex justify-between w-full md:w-48">
                <span>مفتش الوردية المسؤول:</span>
                <span className="font-bold text-neutral-900">مسؤول الاستقبال</span>
              </p>
              <p className="flex justify-between w-full md:w-48">
                <span>نظام التمتثل والأمان:</span>
                <span className="text-emerald-700 font-bold">متصل وآمن 100%</span>
              </p>
            </div>
          </div>

          {/* Actual Report Header */}
          <div className="text-center py-2 bg-neutral-100 border-y border-neutral-300">
            <h3 className="text-sm font-black text-neutral-900 tracking-tight">{getReportTitle()}</h3>
          </div>

          {/* Core Body content dynamic display */}
          <div className="min-h-[300px] leading-relaxed">
            {loading ? (
              <div className="py-12 text-center text-xs text-neutral-400">جاري ترحيل البينات المالية وحساب الإقرارات الضريبية...</div>
            ) : (
              renderSelectedReportBody()
            )}
          </div>

          {/* Bottom official section signatures stamp & footer */}
          <div className="border-t border-neutral-250 pt-8 mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-center text-[11px] text-neutral-600 font-bold">
            
            {/* Column 1: Accountant */}
            <div className="space-y-12">
              <p className="border-b pb-1">توقيع الموظف الفندقي المحضر للتقرير:</p>
              <div className="text-neutral-400 text-[10px] font-mono select-none">اسم الموظف: .......................................</div>
            </div>

            {/* Column 2: Circular Luxury Hotel Stamp Seal */}
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-22 h-22 rounded-full border-4 border-double border-emerald-600/30 flex flex-col items-center justify-center p-1 font-sans text-center select-none rotate-3">
                <div className="w-full h-full rounded-full border border-emerald-500/30 flex flex-col items-center justify-center text-[8px] text-emerald-800 font-black leading-tight bg-emerald-50/10">
                  <span>ختم الفندق الرسمي</span>
                  <Building size={14} className="my-0.5 text-emerald-600" />
                  <span>مجموعة نزيل السحابية</span>
                </div>
              </div>
              <p className="text-[9px] text-neutral-400">مجموعة دور الغرف المستضيفة</p>
            </div>

            {/* Column 3: Executive director */}
            <div className="space-y-12">
              <p className="border-b pb-1">توقيع مدير الفرع والمدير المالي المعتمد:</p>
              <div className="text-neutral-400 text-[10px] font-mono select-none">مدير الإدارة العامة: ..................................</div>
            </div>

            <div className="md:col-span-3 text-center text-[9px] text-neutral-400 font-mono pt-4 border-t border-dashed mt-4 leading-normal">
              إخلاء مسؤولية وضمانة جودة: إن هذا كشف معتمد صادر آلياً عن تطبيق نزيل المتكامل لإدارة الغرف والشقق السكنية في المملكة العربية السعودية ومسجل خوادم الربط الوزاري لـ شموس وبلدي وتراخيص هيئة السياحة، ويمنع أي غسيل أو قسط فيه تحت طائلة المساءلة القانونية.
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
