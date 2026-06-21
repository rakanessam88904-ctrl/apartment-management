import { useState, useEffect } from "react";
import { apiFetch as fetch } from "../lib/api";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Calendar, User, CreditCard, CheckCircle2, Clock } from "lucide-react";

export default function Bookings() {
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/bookings")
      .then(res => res.json())
      .then(data => setBookings(data));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">سجل الحجوزات</h2>
          <p className="text-gray-400">تتبع جميع الحجوزات الحالية والسابقة.</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-gray-800/50 border-b border-gray-800">
                <th className="px-6 py-4 text-sm font-bold text-gray-300">المستأجر</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-300">الشقة</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-300">تاريخ الدخول</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-300">تاريخ الخروج</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-300">المبلغ الإجمالي</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-300">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    لا توجد حجوزات مسجلة حالياً.
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                          <User size={16} />
                        </div>
                        <span className="font-medium text-white">{booking.tenant_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300">{booking.apartment_name}</td>
                    <td className="px-6 py-4 text-gray-300">
                      {format(new Date(booking.check_in), "dd MMMM yyyy", { locale: ar })}
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {format(new Date(booking.check_out), "dd MMMM yyyy", { locale: ar })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-emerald-400 font-bold">
                        <CreditCard size={14} />
                        <span>{booking.total_price.toLocaleString()} ر.س</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 size={12} />
                        مؤكد
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
