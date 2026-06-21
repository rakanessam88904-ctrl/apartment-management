import { useState, useEffect } from "react";
import { apiFetch as fetch } from "../lib/api";
import { Plus, MoreVertical, Edit2, Trash2, Home, MapPin } from "lucide-react";

export default function Apartments() {
  const [apartments, setApartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/apartments")
      .then(res => res.json())
      .then(data => {
        setApartments(data);
        setLoading(data.length === 0);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">إدارة الشقق</h2>
          <p className="text-gray-400">عرض وتعديل بيانات الشقق المتاحة.</p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20">
          <Plus size={20} />
          شقة جديدة
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {apartments.map((apt) => (
          <div key={apt.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden group hover:border-indigo-500/50 transition-all">
            <div className="relative h-48 bg-gray-800">
              <img 
                src={`https://picsum.photos/seed/${apt.id}/800/600`} 
                alt={apt.name}
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                referrerPolicy="no-referrer"
              />
              <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                apt.status === 'available' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {apt.status === 'available' ? 'متاحة' : 'محجوزة'}
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg font-bold text-white">{apt.name}</h3>
                  <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                    <MapPin size={14} />
                    <span>{apt.type}</span>
                  </div>
                </div>
                <button className="text-gray-500 hover:text-white p-1">
                  <MoreVertical size={20} />
                </button>
              </div>
              
              <p className="text-gray-400 text-sm line-clamp-2 mb-6">
                {apt.description || "لا يوجد وصف متاح لهذه الشقة حالياً."}
              </p>
              
              <div className="flex items-center justify-between pt-6 border-t border-gray-800">
                <div>
                  <span className="text-2xl font-bold text-white">{apt.price_per_night}</span>
                  <span className="text-gray-500 text-sm mr-1">ر.س / ليلة</span>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-colors">
                    <Edit2 size={18} />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
