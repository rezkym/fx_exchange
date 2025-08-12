import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

const Chart = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="bg-white/20 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/10">
        <div className="animate-pulse">
          <div className="h-4 bg-white/30 backdrop-blur-sm rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-white/20 backdrop-blur-sm rounded border border-white/30"></div>
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
        <div className="bg-white/80 backdrop-blur-lg border border-white/50 rounded-xl shadow-xl p-3 ring-1 ring-white/20">
          <p className="text-sm font-medium text-gray-900">
            {format(new Date(label), 'MMM dd, yyyy HH:mm')}
          </p>
          <p className="text-sm text-blue-600">
            Rate: <span className="font-semibold">{payload[0].value.toFixed(6)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white/20 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 ring-1 ring-white/10 h-fit">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">Exchange Rate History</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 24, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
            <XAxis 
              dataKey="time"
              type="number"
              scale="time"
              domain={[firstTick ?? 'dataMin', lastTick ?? 'dataMax']}
              ticks={firstTick !== null && lastTick !== null ? [firstTick, lastTick] : undefined}
              interval={0}
              tickFormatter={(value) => format(new Date(value), 'MMM dd')}
              stroke="#6b7280"
              fontSize={12}
              tickMargin={8}
              tickLine={false}
            />
            <YAxis 
              domain={[dataMin => dataMin * 0.999, dataMax => dataMax * 1.001]}
              tickFormatter={(value) => value.toFixed(4)}
              stroke="#6b7280"
              fontSize={12}
              width={80}
              tickMargin={8}
            />
            <Tooltip content={<CustomTooltip />} formatter={(val) => Number(val).toLocaleString('en-US', { maximumFractionDigits: 4 })} />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 2 }}
              activeDot={{ r: 5, fill: '#1d4ed8' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Chart;