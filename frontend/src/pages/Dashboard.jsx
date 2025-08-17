import { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart3, TrendingUp, Info } from 'lucide-react';
import { getCurrencies, getLive, getHistory } from '../services/api';
import Chart from '../components/Chart';
import Controls from '../components/Controls';
import StatCard from '../components/StatCard';
import Alert from '../components/Alert';
import Converter from '../components/Converter';

export default function Dashboard() {
  // State management
  const [currencies, setCurrencies] = useState([]);
  const [sourceCurrency, setSourceCurrency] = useState('EUR');
  const [targetCurrency, setTargetCurrency] = useState('IDR');
  const [timeRange, setTimeRange] = useState(1);
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
    const currentTime = new Date(liveData.time);
    
    // Find a data point that's at least 1 hour ago to get meaningful change
    let previousValue = null;
    const oneHourAgo = new Date(currentTime.getTime() - 60 * 60 * 1000);
    
    // Look for the most recent data point that's at least 1 hour old
    for (let i = historyData.length - 1; i >= 0; i--) {
      const dataTime = new Date(historyData[i].time);
      if (dataTime <= oneHourAgo) {
        previousValue = historyData[i].value;
        break;
      }
    }
    
    // If no data older than 1 hour, use the oldest available data
    if (previousValue === null && historyData.length > 0) {
      previousValue = historyData[0].value;
    }
    
    if (!previousValue || previousValue === currentValue) return { change: 0, changeType: 'neutral' };
    
    const change = currentValue - previousValue;
    const changeType = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
    
    return { change, changeType };
  };

  const { change, changeType } = calculateChange();

  // Calculate 24h change
  const calculate24hChange = () => {
    if (!liveData || historyData.length < 2) return { change: 0, changeType: 'neutral' };
    
    const currentValue = liveData.value;
    const currentTime = new Date(liveData.time);
    const dayAgo = new Date(currentTime.getTime() - 24 * 60 * 60 * 1000);
    
    // Find data point closest to 24 hours ago, but prefer older data if available
    let bestValue = null;
    let bestTimeDiff = Infinity;
    
    for (let i = 0; i < historyData.length; i++) {
      const dataTime = new Date(historyData[i].time);
      const timeDiff = Math.abs(dataTime.getTime() - dayAgo.getTime());
      
      // Prefer data that's actually from 24 hours ago or older
      if (dataTime <= dayAgo) {
        if (timeDiff < bestTimeDiff) {
          bestTimeDiff = timeDiff;
          bestValue = historyData[i].value;
        }
      } else if (bestValue === null) {
        // If no older data found, use the closest newer data as fallback
        if (timeDiff < bestTimeDiff) {
          bestTimeDiff = timeDiff;
          bestValue = historyData[i].value;
        }
      }
    }
    
    // If still no value found, use the oldest available data
    if (bestValue === null && historyData.length > 0) {
      bestValue = historyData[0].value;
    }
    
    if (!bestValue || bestValue === currentValue) return { change: 0, changeType: 'neutral' };
    
    const change = currentValue - bestValue;
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
    <div className="space-y-4">
      {/* Header with data source note and error alert */}
      <div className="flex flex-col gap-3">
        {/* Data source note */}
        <div className="inline-flex items-center gap-2 bg-white/20 dark:bg-slate-800/30 backdrop-blur-md border border-white/30 dark:border-slate-600/40 rounded-full px-3 py-1.5 text-xs text-gray-700 dark:text-slate-300 shadow-lg dark:shadow-slate-900/20 w-fit transition-colors duration-300">
          <Info className="w-3 h-3 text-gray-600 dark:text-slate-400 transition-colors duration-300" />
          <span>
            Sumber data: Wise Rates API (live & history). Update otomatis setiap menit.
          </span>
        </div>
        
        {/* Error Alert */}
        {error && (
          <Alert 
            message={error} 
            onClose={() => setError(null)} 
            type="error" 
          />
        )}
      </div>

      {/* Main Content */}
      <div className="space-y-4">
        {/* Top Section: Controls and Current Rate */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          {/* Controls - Takes 3 columns on xl screens */}
          <div className="xl:col-span-3">
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
          
          {/* Current Rate - Takes 1 column on xl screens */}
          <div>
            <StatCard
              title="Current Rate"
              value={liveData?.value}
              change={change}
              changeType={changeType}
              loading={!liveData}
              icon={BarChart3}
              currency={targetCurrency}
            />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Chart and Converter Row */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          {/* Chart - Takes 3 columns on xl screens */}
          <div className="xl:col-span-3">
            <Chart data={displayData} loading={loading} />
          </div>
          
          {/* Currency Converter - Takes 1 column on xl screens */}
          <div>
            <Converter currencies={currencies} />
          </div>
        </div>
      </div>
    </div>
  );
}
