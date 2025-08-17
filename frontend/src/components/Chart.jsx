import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

const Chart = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="bg-white/20 dark:bg-slate-800/30 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 rounded-2xl shadow-xl dark:shadow-slate-900/20 p-6 ring-1 ring-white/10 dark:ring-slate-700/20 transition-colors duration-300">
        <div className="animate-pulse">
          <div className="h-4 bg-white/30 dark:bg-slate-600/30 backdrop-blur-sm rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-white/20 dark:bg-slate-700/20 backdrop-blur-sm rounded border border-white/30 dark:border-slate-600/30"></div>
        </div>
      </div>
    );
  }

  // Format data untuk chart
  const chartData = data.map(item => ({
    ...item,
    time: new Date(item.time).getTime(),
    formattedTime: format(new Date(item.time), 'MMM dd, HH:mm')
  }));

  // Hanya tampilkan label tanggal paling awal dan paling akhir
  const firstTick = chartData.length ? chartData[0].time : null;
  const lastTick = chartData.length ? chartData[chartData.length - 1].time : null;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/80 dark:bg-slate-800/90 backdrop-blur-lg border border-white/50 dark:border-slate-600/50 rounded-xl shadow-xl dark:shadow-slate-900/40 p-3 ring-1 ring-white/20 dark:ring-slate-700/30 transition-colors duration-300">
          <p className="text-sm font-medium text-gray-900 dark:text-slate-100 transition-colors duration-300">
            {format(new Date(label), 'MMM dd, yyyy HH:mm')}
          </p>
          <p className="text-sm text-purple-600 dark:text-purple-400 transition-colors duration-300">
            Rate: <span className="font-semibold">{payload[0].value.toFixed(6)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const minValue = Math.min(...chartData.map(d => d.value));
  const maxValue = Math.max(...chartData.map(d => d.value));
  const valueRange = maxValue - minValue;
  const avgValue = chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length;

  return (
    <div className="bg-white/20 dark:bg-slate-800/30 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 rounded-2xl shadow-xl dark:shadow-slate-900/20 p-6 ring-1 ring-white/10 dark:ring-slate-700/20 h-fit transition-colors duration-300">
      {/* Header with embedded stats */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 transition-colors duration-300">Exchange Rate History</h3>
        <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-slate-400">
          <div className="text-center">
            <div className="text-gray-500 dark:text-slate-500">Range</div>
            <div className="font-medium">±{valueRange.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500 dark:text-slate-500">Avg</div>
            <div className="font-medium">{avgValue.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500 dark:text-slate-500">Points</div>
            <div className="font-medium">{chartData.length}</div>
          </div>
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 24, bottom: 8, left: 8 }}>
            <defs>
              <linearGradient id="colorUv" x1="0" y1="0" x2="1" y2="0">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={1}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-slate-600" opacity={0.5} />
            <XAxis 
              dataKey="time"
              type="number"
              scale="time"
              domain={[firstTick ?? 'dataMin', lastTick ?? 'dataMax']}
              ticks={firstTick !== null && lastTick !== null ? [firstTick, lastTick] : undefined}
              interval={0}
              tickFormatter={(value) => format(new Date(value), 'MMM dd')}
              stroke="#6b7280"
              className="dark:stroke-slate-400"
              fontSize={12}
              tickMargin={8}
              tickLine={false}
            />
            <YAxis 
              domain={[dataMin => dataMin * 0.999, dataMax => dataMax * 1.001]}
              tickFormatter={(value) => value.toFixed(4)}
              stroke="#6b7280"
              className="dark:stroke-slate-400"
              fontSize={12}
              width={80}
              tickMargin={8}
            />
            <Tooltip content={<CustomTooltip />} formatter={(val) => Number(val).toLocaleString('en-US', { maximumFractionDigits: 4 })} />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="url(#colorUv)" 
              strokeWidth={3}
              dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 6, fill: '#7c3aed', stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Chart;