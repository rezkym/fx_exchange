import { useState, useEffect, useCallback, useMemo } from 'react';
import { getCurrencies, getLive, getHistory } from '../services/api';
import Chart from '../components/Chart';
import Alert from '../components/Alert';
import DashboardHero from '../components/DashboardHero';
import QuickTools from '../components/QuickTools';
import RefreshButton from '../components/RefreshButton';
import StatusIndicator from '../components/StatusIndicator';
import AnalyticsCharts from '../components/AnalyticsCharts';

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
    
    // Look backwards to find the first different value
    for (let i = historyData.length - 1; i >= 0; i--) {
      if (historyData[i].value !== currentValue) {
        const change = currentValue - historyData[i].value;
        const changeType = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
        return { change, changeType };
      }
    }
    
    return { change: 0, changeType: 'neutral' };
  };

  const { change, changeType } = calculateChange();

  // Calculate 24h change
  const calculate24hChange = () => {
    if (!liveData || historyData.length < 2) return { change: 0, changeType: 'neutral' };
    
    const currentValue = liveData.value;
    
    // Always compare with the oldest available data in the current dataset
    if (historyData.length > 0) {
      const firstValue = historyData[0].value;
      
      // Also try to find a value that's actually different from current for more meaningful change
      let comparisonValue = firstValue;
      
      // Look for the earliest different value
      for (let i = 0; i < historyData.length; i++) {
        if (historyData[i].value !== currentValue) {
          comparisonValue = historyData[i].value;
          break;
        }
      }
      
      const change = currentValue - comparisonValue;
      const changeType = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
      
      return { change, changeType };
    }
    
    return { change: 0, changeType: 'neutral' };
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
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-3">
        {/* Data source note */}
        <div className="flex items-center justify-between">
          <StatusIndicator 
            isOnline={!error && !loading}
            lastUpdate={liveData?.time}
            error={!!error}
          />
          <RefreshButton onRefresh={handleRefresh} loading={loading} />
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

      {/* Hero Section - All key metrics in one compact card */}
      <DashboardHero
        liveData={liveData}
        loading={loading}
        currencies={currencies}
        sourceCurrency={sourceCurrency}
        targetCurrency={targetCurrency}
        timeRange={timeRange}
        change={change}
        changeType={changeType}
        change24h={change24h}
        changeType24h={changeType24h}
        onSourceChange={setSourceCurrency}
        onTargetChange={setTargetCurrency}
        onTimeRangeChange={setTimeRange}
        onRefresh={handleRefresh}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Chart Section - Takes 3 columns */}
        <div className="xl:col-span-3">
          <Chart data={displayData} loading={loading} />
        </div>
        
        {/* Quick Tools Sidebar - Takes 1 column */}
        <div className="xl:col-span-1">
          <QuickTools 
            currencies={currencies} 
            onRefresh={handleRefresh}
            loading={loading}
          />
        </div>
      </div>

      {/* Analytics Section */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Analytics Dashboard</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-blue-500/50 to-purple-500/50"></div>
        </div>
        <AnalyticsCharts />
      </div>
    </div>
  );
}

