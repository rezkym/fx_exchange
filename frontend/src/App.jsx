import { useState, useEffect, useCallback, useMemo } from 'react';
import { DollarSign, TrendingUp, Info } from 'lucide-react';
import { getCurrencies, getLive, getHistory } from './services/api';
import Chart from './components/Chart';
import Controls from './components/Controls';
import StatCard from './components/StatCard';
import Alert from './components/Alert';
import Converter from './components/Converter';

export default function App() {
  // State management
  const [currencies, setCurrencies] = useState([]);
  const [sourceCurrency, setSourceCurrency] = useState('EUR');
  const [targetCurrency, setTargetCurrency] = useState('IDR');
  const [timeRange, setTimeRange] = useState(30);
  const [historyData, setHistoryData] = useState([]);
  const [liveData, setLiveData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Data waktu terakhir diambil dari liveData.time (tak perlu state terpisah)

  // Fetch currencies on mount
  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const data = await getCurrencies();
        setCurrencies(data);
      } catch (err) {
        setError('Failed to load currencies');
      }
    };
    fetchCurrencies();
  }, []);

  // Fetch history data
  // Fungsi fetch history (stabil) untuk dipakai initial, kontrol, dan refresh
  const fetchHistoryNow = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getHistory({
        source: sourceCurrency,
        target: targetCurrency,
        length: timeRange,
        unit: 'day',
        resolution: 'hourly'
      });
      setHistoryData(data);
      setError(null);
    } catch (err) {
      setError('Failed to load history data');
    } finally {
      setLoading(false);
    }
  }, [sourceCurrency, targetCurrency, timeRange]);

  // Fetch live data
  // Fungsi fetch live (stabil)
  const fetchLiveNow = useCallback(async () => {
    try {
      const data = await getLive({ source: sourceCurrency, target: targetCurrency });
      // Selalu set liveData (agar berubah saat pasangan currency berganti)
      setLiveData(data);
      // Tambahkan ke history jika timestamp baru dan pasangan currency sama
      setHistoryData(prevHist => {
        const lastHistTime = prevHist.length > 0 ? new Date(prevHist[prevHist.length - 1].time) : null;
        const newTime = new Date(data.time);
        if (!lastHistTime || newTime > lastHistTime) {
          return [
            ...prevHist,
            { time: data.time, value: data.value, source: data.source, target: data.target }
          ];
        }
        return prevHist;
      });
    } catch (err) {
      console.error('Failed to fetch live data:', err);
    }
  }, [sourceCurrency, targetCurrency]);

  // Trigger initial fetch saat currencies sudah ada
  useEffect(() => {
    if (currencies.length > 0) {
      fetchHistoryNow();
      fetchLiveNow();
    }
  }, [currencies, fetchHistoryNow, fetchLiveNow]);

  // Interval untuk live updates (cleanup benar)
  useEffect(() => {
    const id = setInterval(fetchLiveNow, 60000);
    return () => clearInterval(id);
  }, [fetchLiveNow]);

  // Initial trigger setelah currencies ter-load: cukup andalkan efek-efek di atas
  // yang sudah tergantung pada source/target/timeRange

  // (dihapus) interval lama yang memanggil fetchLiveData yang sudah tidak ada

  // Calculate change from previous data point
  const calculateChange = () => {
    if (!liveData || historyData.length < 2) return { change: 0, changeType: 'neutral' };
    
    const currentValue = liveData.value;
    const previousValue = historyData[historyData.length - 2]?.value;
    
    if (!previousValue) return { change: 0, changeType: 'neutral' };
    
    const change = currentValue - previousValue;
    const changeType = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
    
    return { change, changeType };
  };

  const { change, changeType } = calculateChange();

  // Calculate 24h change
  const calculate24hChange = () => {
    if (!liveData || historyData.length < 24) return { change: 0, changeType: 'neutral' };
    
    const currentValue = liveData.value;
    const dayAgoValue = historyData[Math.max(0, historyData.length - 24)]?.value;
    
    if (!dayAgoValue) return { change: 0, changeType: 'neutral' };
    
    const change = currentValue - dayAgoValue;
    const changeType = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
    
    return { change, changeType };
  };

  const { change: change24h, changeType: changeType24h } = calculate24hChange();

  const handleRefresh = () => {
    fetchHistoryNow();
    fetchLiveNow();
  };

  // Gabungkan history + live point (jika lebih baru) agar sumbu waktu ikut maju tanpa menunggu interval berikutnya
  const displayData = useMemo(() => {
    const hist = Array.isArray(historyData) ? historyData : [];
    if (
      liveData &&
      liveData.source === sourceCurrency &&
      liveData.target === targetCurrency &&
      hist.length > 0
    ) {
      const lastHistTime = new Date(hist[hist.length - 1].time).getTime();
      const liveTime = new Date(liveData.time).getTime();
      if (liveTime > lastHistTime) {
        return [...hist, liveData];
      }
    }
    return hist;
  }, [historyData, liveData, sourceCurrency, targetCurrency]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-lg border-b border-white/30 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">FX Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time foreign exchange rates and analytics</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Data source note */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-4 py-2 text-sm text-gray-700 shadow-lg">
            <Info className="w-4 h-4 text-gray-600" />
            <span>
              Sumber data: Wise Rates API (live & history). Waktu update berasal dari field time (UTC) dan ditampilkan sesuai zona waktu browser Anda.
            </span>
          </div>
        </div>
        
        {/* Error Alert */}
        {error && (
          <div className="mb-6">
            <Alert 
              message={error} 
              onClose={() => setError(null)} 
              type="error" 
            />
          </div>
        )}

        <div className="space-y-8">
          {/* Top Section: Controls and Stats */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Controls - Takes 2 columns on xl screens */}
            <div className="xl:col-span-2">
              <Controls
                currencies={currencies}
                sourceCurrency={sourceCurrency}
                targetCurrency={targetCurrency}
                timeRange={timeRange}
                onSourceChange={setSourceCurrency}
                onTargetChange={setTargetCurrency}
                onTimeRangeChange={setTimeRange}
                onRefresh={handleRefresh}
                loading={loading}
              />
            </div>
            
            {/* Quick Stats - Takes 1 column on xl screens */}
            <div className="space-y-4">
              <StatCard
                title="Current Rate"
                value={liveData?.value}
                change={change}
                changeType={changeType}
                loading={!liveData}
                icon={DollarSign}
                currency={targetCurrency}
              />
            </div>
          </div>

          {/* Middle Section: Additional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard
              title="24h Change"
              value={change24h}
              changeType={changeType24h}
              loading={!liveData}
              icon={TrendingUp}
            />
            <StatCard
              title="Last Update"
              value={liveData?.time}
              loading={!liveData}
              formatType="datetime"
            />
          </div>

          {/* Bottom Section: Chart and Converter */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Chart - Takes 2 columns on xl screens */}
            <div className="xl:col-span-2">
              <Chart data={displayData} loading={loading} />
            </div>
            
            {/* Currency Converter - Takes 1 column on xl screens */}
            <div>
              <Converter currencies={currencies} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


