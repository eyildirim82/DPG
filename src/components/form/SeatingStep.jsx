import React from 'react';
import Button from '../ui/Button';

const CLUSTERS = [
  { id: 'Otomatik', name: 'Beni Otomatik Yerleştir (Önerilen)', desc: 'Ekibimiz sizi ve sevdiklerinizi meslektaşlarınızla en uygun şekilde yerleştirecektir.' },
  { id: 'KumeA', name: 'A Kümesi', desc: 'Sahne Önü ve Protokol Çevresi' },
  { id: 'KumeB', name: 'B Kümesi', desc: 'Salonun Orta Kısımları' },
  { id: 'KumeC', name: 'C Kümesi', desc: 'Geniş Alan ve Yan Koridorlar' },
  { id: 'KumeD', name: 'D Kümesi', desc: 'Arka Localar ve Dinlenme Alanı' },
];

export default function SeatingStep({ selectedCluster, setSelectedCluster, submittingSeating, tableStats, onSubmit }) {
  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="mb-6 py-4 px-5 rounded border border-green-500/30 bg-green-500/10 text-green-100 text-base md:text-lg font-body">
        <h3 className="text-xl md:text-2xl font-bold text-green-400 mb-2">Başvurunuz Onaylanmıştır!</h3>
        <p className="text-lg text-gray-200">
          Aşağıdaki oturma kümelerinden birini seçerek Gala alanındaki yerinizi belirtebilirsiniz.
          Arkadaşlarınızla aynı kümeyi seçerek yan yana oturabilirsiniz.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CLUSTERS.map((cluster) => {
          const clusterStats = tableStats.filter((s) => s.cluster === cluster.id);
          return (
            <div
              key={cluster.id}
              onClick={() => setSelectedCluster(cluster.id)}
              className={`cursor-pointer border-2 rounded-lg p-5 transition-all duration-300 ${
                selectedCluster === cluster.id
                  ? 'border-dpg-gold bg-dpg-gold/20 shadow-[0_0_15px_rgba(230,194,117,0.3)]'
                  : 'border-white/10 bg-white/5 hover:bg-white/10 border-dashed'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedCluster === cluster.id ? 'border-dpg-gold' : 'border-gray-500'
                  }`}
                >
                  {selectedCluster === cluster.id && <div className="w-3 h-3 bg-dpg-gold rounded-full"></div>}
                </div>
                <div className="flex-1">
                  <h4
                    className={`text-xl font-bold font-heading mb-1 ${
                      selectedCluster === cluster.id ? 'text-dpg-gold' : 'text-gray-300'
                    }`}
                  >
                    {cluster.name}
                  </h4>
                  <p className="text-base md:text-lg font-body text-gray-400">{cluster.desc}</p>
                  {cluster.id !== 'Otomatik' && clusterStats.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {clusterStats.map((stat, idx) => (
                        <span
                          key={idx}
                          className="bg-white/10 px-3 py-1.5 rounded text-sm md:text-base text-gray-300 flex items-center gap-2"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-dpg-gold/70"></span>
                          {stat.airline}: {stat.count}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Button
        type="submit"
        disabled={!selectedCluster}
        className="w-full"
        style={{ opacity: submittingSeating || !selectedCluster ? 0.7 : 1 }}
      >
        {submittingSeating ? 'Kaydediliyor...' : 'Küme Tercihimi Kaydet'}
      </Button>
    </form>
  );
}
