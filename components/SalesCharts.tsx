import React from 'react';
import { ResponsiveContainer, LineChart, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line, Bar } from 'recharts';
import Card from './common/Card';
import Button from './common/Button';
import { TrendingUp, UserCheck, Users } from 'lucide-react';
import { formatIndianCurrency, formatIndianCurrencyShort, formatIndianNumber, formatDateDDMMYYYY } from '../utils/formatting';

// Props for the new component
interface SalesChartsProps {
  salesData: any;
  chartGranularity: 'daily' | 'monthly' | 'quarterly' | 'yearly';
  setChartGranularity: (granularity: 'daily' | 'monthly' | 'quarterly' | 'yearly') => void;
  showAov: boolean;
  setShowAov: (show: boolean) => void;
  topProductsCount: 5 | 10;
  setTopProductsCount: (count: 5 | 10) => void;
}

// Tooltips and constants from SalesPage
const CustomSalesTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-card p-3 border rounded-lg shadow-lg text-sm">
                <p className="font-bold mb-1 text-content">{label.includes('-') ? formatDateDDMMYYYY(label) : label}</p>
                {payload.map((pld: any) => (
                    <p key={pld.name} style={{ color: pld.color || pld.stroke }}>
                        {`${pld.name}: ${formatIndianCurrency(pld.value)}`}
                    </p>
                ))}
                {data.quantity > 0 && <p className="text-contentSecondary text-xs mt-1">Units Sold: {formatIndianNumber(data.quantity)}</p>}
                {data.orderCount > 0 && <p className="text-contentSecondary text-xs mt-1">from {data.orderCount} order(s)</p>}
            </div>
        );
    }
    return null;
};

const CustomProductTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-card p-3 border rounded-lg shadow-lg text-sm">
                <p className="font-bold mb-1 text-content">{label}</p>
                <p className="text-blue-600">Paid Units: {formatIndianNumber(data.paid)}</p>
                <p className="text-green-600">Free Units: {formatIndianNumber(data.free)}</p>
                <div className="mt-2 pt-2 border-t">
                    <p className="font-semibold text-content">Sales Value: {formatIndianCurrency(data.salesValue)}</p>
                </div>
            </div>
        );
    }
    return null;
};

const EXEC_COLORS = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042',
    '#a4de6c', '#d0ed57', '#8dd1e1', '#83a6ed', '#8e44ad', '#16a085', '#f1c40f',
    '#e67e22', '#e74c3c', '#3498db', '#2ecc71'
];

const CustomExecutiveTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const chartData = payload[0].payload;
        return (
            <div className="bg-card p-3 border rounded-lg shadow-lg text-sm max-w-xs">
                <p className="font-bold mb-2 text-content">{label}</p>
                <ul className="space-y-1">
                    {payload.sort((a:any, b:any) => b.value - a.value).map((entry: any) => {
                        const execName = entry.name;
                        const qty = chartData[`${execName}_qty`];
                        return (
                            <li key={entry.dataKey} className="flex justify-between items-center">
                                <span className="flex items-center">
                                    <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: entry.color }}></span>
                                    {execName}
                                </span>
                                <span className="font-semibold ml-4">
                                    {formatIndianCurrency(entry.value)}
                                    {qty > 0 && <span className="text-xs font-normal text-contentSecondary ml-1">({formatIndianNumber(qty)} units)</span>}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </div>
        );
    }
    return null;
};

const SalesCharts: React.FC<SalesChartsProps> = ({
  salesData,
  chartGranularity,
  setChartGranularity,
  showAov,
  setShowAov,
  topProductsCount,
  setTopProductsCount,
}) => {
  return (
    <>
      <Card>
        <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
            <h3 className="text-lg font-semibold text-content flex items-center"><TrendingUp size={20} className="mr-2 text-primary" /> Sales Trend</h3>
            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="showAov"
                        checked={showAov}
                        onChange={() => setShowAov(!showAov)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="showAov" className="text-sm text-contentSecondary cursor-pointer">
                        Show Avg. Order Value
                    </label>
                </div>
                <div className="flex gap-1 p-1 bg-background rounded-lg border border-border">
                    {(['daily', 'monthly', 'quarterly', 'yearly'] as ('daily' | 'monthly' | 'quarterly' | 'yearly')[]).map(g => (
                        <Button key={g} variant={chartGranularity === g ? 'primary' : 'secondary'} size="sm" onClick={() => setChartGranularity(g)} className={`capitalize ${chartGranularity !== g ? '!bg-transparent border-none shadow-none !text-contentSecondary hover:!bg-slate-200' : 'shadow'}`}>{g}</Button>
                    ))}
                </div>
            </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData.salesTrendData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(tick) => tick.includes('-') ? formatDateDDMMYYYY(tick) : tick} />
                <YAxis yAxisId="left" tickFormatter={(value) => formatIndianCurrencyShort(value as number)} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => formatIndianCurrencyShort(value as number)} />
                <Tooltip content={<CustomSalesTooltip />} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="sales" stroke="#4f46e5" strokeWidth={2} name="Sales" />
                {showAov && (
                    <Line yAxisId="right" type="monotone" dataKey="aov" stroke="#f97316" strokeDasharray="5 5" name="Avg. Order Value" />
                )}
            </LineChart>
        </ResponsiveContainer>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
              <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-content">Top {topProductsCount} Products by Volume</h3>
                  <div className="flex gap-1 p-1 bg-background rounded-lg border border-border">
                      <Button variant={topProductsCount === 5 ? 'primary' : 'secondary'} size="sm" onClick={() => setTopProductsCount(5)} className={`${topProductsCount !== 5 ? '!bg-transparent border-none shadow-none !text-contentSecondary hover:!bg-slate-200' : 'shadow'}`}>Top 5</Button>
                      <Button variant={topProductsCount === 10 ? 'primary' : 'secondary'} size="sm" onClick={() => setTopProductsCount(10)} className={`${topProductsCount !== 10 ? '!bg-transparent border-none shadow-none !text-contentSecondary hover:!bg-slate-200' : 'shadow'}`}>Top 10</Button>
                  </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                  <RechartsBarChart data={salesData.topProductsData.slice(0, topProductsCount)} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="skuName" type="category" width={80} />
                      <Tooltip content={<CustomProductTooltip />} />
                      <Legend />
                      <Bar dataKey="paid" stackId="a" fill="#3b82f6" name="Paid Units" />
                      <Bar dataKey="free" stackId="a" fill="#16a34a" name="Free Units" />
                  </RechartsBarChart>
              </ResponsiveContainer>
          </Card>
          <Card>
              <h3 className="text-lg font-semibold text-content mb-4 flex items-center"><UserCheck size={20} className="mr-2 text-primary"/> Sales by ASM</h3>
              <ResponsiveContainer width="100%" height={300}>
                  <RechartsBarChart data={salesData.salesByAsmData} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(value) => formatIndianCurrencyShort(value as number)} />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip content={<CustomSalesTooltip />} />
                      <Bar dataKey="value" fill="#8b5cf6" name="Total Sales" />
                  </RechartsBarChart>
              </ResponsiveContainer>
          </Card>
      </div>

      <Card>
          <h3 className="text-lg font-semibold text-content mb-4 flex items-center"><Users size={20} className="mr-2 text-primary"/> Executive Performance by ASM</h3>
          <ResponsiveContainer width="100%" height={400}>
              <RechartsBarChart
                  data={salesData.salesByExecutiveChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 30, bottom: 5 }}
              >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => formatIndianCurrencyShort(value as number)} />
                  <YAxis dataKey="asmName" type="category" width={150} />
                  <Tooltip content={<CustomExecutiveTooltip />} cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}/>
                  <Legend />
                  {salesData.uniqueExecutives.map((execName: string, index: number) => (
                      <Bar
                          key={execName}
                          dataKey={`${execName}_sales`}
                          stackId="a"
                          name={execName}
                          fill={EXEC_COLORS[index % EXEC_COLORS.length]}
                      />
                  ))}
              </RechartsBarChart>
          </ResponsiveContainer>
      </Card>
    </>
  );
};

export default SalesCharts;
