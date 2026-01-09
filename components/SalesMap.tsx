import React, { useState, useMemo, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { scaleQuantile } from 'd3-scale';
import { Tooltip } from 'react-tooltip';
import { formatIndianCurrency, formatIndianNumber } from '../utils/formatting';
import Card from './common/Card';
import { Map as MapIcon, RotateCcw, Info, Trophy, Crown } from 'lucide-react';
import Button from './common/Button';

// TopoJSON URL for India with states - using a verified working source
const INDIA_TOPO_JSON = 'https://raw.githubusercontent.com/udit-001/india-maps-data/main/topojson/india.json';

interface AreaData {
    name: string;
    value: number;
}

interface StateData {
    name: string;
    value: number; // Total Sales
    areas: AreaData[];
}

interface TopPerformer {
    name: string;
    value: number; // total sales (currency)
    units: number;
    location: string;
}

interface SalesMapProps {
    data: StateData[];
    onDistrictClick?: (stateName: string, districtName: string) => void;
    topPerformers?: {
        national: TopPerformer | null;
        state: Record<string, TopPerformer>;
    };
}

const PROJECTION_CONFIG = {
    scale: 1000,
    center: [78.9629, 22.5937] as [number, number] // Center of India
};

const SalesMap: React.FC<SalesMapProps> = ({ data, onDistrictClick, topPerformers }) => {
    const [topology, setTopology] = useState<any>(null);
    const [view, setView] = useState<'nation' | 'state'>('nation');
    const [selectedState, setSelectedState] = useState<string | null>(null);
    const [tooltipContent, setTooltipContent] = useState<string>('');

    useEffect(() => {
        console.log("Fetching Map Data from:", INDIA_TOPO_JSON);
        fetch(INDIA_TOPO_JSON)
            .then(response => {
                console.log("Map Data Fetch Response:", response.status);
                return response.json();
            })
            .then(topo => {
                console.log("Map Data Loaded:", topo);
                console.log("Objects Keys:", topo.objects ? Object.keys(topo.objects) : 'NO OBJECTS');
                setTopology(topo);
            })
            .catch(err => console.error('Failed to load map data', err));
    }, []);

    // Normalize state names to handle variations between data sources
    const normalizeStateName = (name: string): string => {
        if (!name) return '';
        let normalized = name.toLowerCase().trim();
        // Common state name variations mapping
        const stateNameMap: Record<string, string> = {
            'andhra pradesh': 'andhra pradesh',
            'arunachal pradesh': 'arunachal pradesh',
            'delhi': 'nct of delhi',
            'nct of delhi': 'nct of delhi',
            'national capital territory of delhi': 'nct of delhi',
            'odisha': 'odisha',
            'orissa': 'odisha',
            'uttaranchal': 'uttarakhand',
            'uttarakhand': 'uttarakhand',
            'telangana': 'telangana',
            'dadra and nagar haveli': 'dadra and nagar haveli and daman and diu',
            'daman and diu': 'dadra and nagar haveli and daman and diu',
        };
        return stateNameMap[normalized] || normalized;
    };

    const { stateSalesMap, districtSalesMap, maxStateSales, maxDistrictSales } = useMemo(() => {
        const sMap = new Map<string, number>();
        const dMap = new Map<string, number>();
        let maxS = 0;
        let maxD = 0;

        // Debug: Log incoming sales data
        if (data.length > 0) {
            console.log('[SalesMap] Sales data states:', data.map(s => s.name));
        }

        data.forEach(state => {
            // Normalize state name for matching
            const normalizedName = normalizeStateName(state.name);
            sMap.set(normalizedName, state.value);
            if (state.value > maxS) maxS = state.value;

            state.areas.forEach(area => {
                const key = `${normalizedName}_${area.name.toLowerCase().trim()}`;
                dMap.set(key, area.value);
                if (area.value > maxD) maxD = area.value;
            });
        });

        console.log('[SalesMap] Processed states:', Array.from(sMap.keys()));
        console.log('[SalesMap] Max state sales:', maxS);

        return { stateSalesMap: sMap, districtSalesMap: dMap, maxStateSales: maxS, maxDistrictSales: maxD };
    }, [data]);

    const colorScale = scaleQuantile<string>()
        .domain([0, maxStateSales])
        .range([
            '#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af'
        ]);

    const districtColorScale = scaleQuantile<string>()
        .domain([0, maxDistrictSales])
        .range([
            '#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534'
        ]);

    const handleStateClick = (geo: any) => {
        if (view === 'nation') {
            const stateName = geo.properties.st_nm;
            setSelectedState(stateName);
            setView('state');
        }
    };

    const handleReset = () => {
        setView('nation');
        setSelectedState(null);
    };

    if (!topology) return <div className="p-8 text-center text-slate-500">Loading Map Data...</div>;

    return (
        <Card className="w-full overflow-hidden">
            <div className="flex justify-between items-center mb-4 border-b pb-4">
                <div>
                    <h3 className="text-lg font-semibold text-content flex items-center gap-2">
                        <MapIcon size={20} className="text-primary" />
                        Geographic Sales Distribution
                    </h3>
                    <p className="text-sm text-contentSecondary">
                        {view === 'nation' ? 'Nationwide Overview' : `State Focus: ${selectedState}`}
                    </p>
                </div>
                <div className="flex gap-2">
                    {view === 'state' && (
                        <Button onClick={handleReset} variant="secondary" size="sm" className="flex items-center gap-1">
                            <RotateCcw size={14} /> Back to Nation
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Map Container */}
                <div className="flex-1 h-[500px] border rounded-lg bg-slate-50 relative overflow-hidden" data-tooltip-id="map-tooltip">
                    <ComposableMap
                        projection="geoMercator"
                        projectionConfig={view === 'nation' ? PROJECTION_CONFIG : { scale: 1000, center: [78.9629, 22.5937] }}
                        width={800}
                        height={600}
                    >
                        <ZoomableGroup center={[78.9629, 22.5937]} zoom={1.2}>
                            <Geographies geography={topology}>
                                {({ geographies }) => {
                                    if (!geographies || geographies.length === 0) console.warn("No geographies found!");
                                    else if (geographies[0]?.properties) console.log("First Geo Props:", geographies[0].properties);

                                    return geographies.map(geo => {
                                        // Handle different TopoJSON property naming conventions
                                        const props = geo.properties;
                                        const curState = props.st_nm || props.NAME || props.name || props.ST_NM || props.state_name || props.state || '';
                                        const curDistrict = props.district || props.DISTRICT || props.District || props.dt_name || '';

                                        const isSelectedState = selectedState === curState;
                                        const isHidden = view === 'state' && !isSelectedState;

                                        if (isHidden) return null;

                                        const stateSales = stateSalesMap.get(normalizeStateName(curState || '')) || 0;
                                        const districtKey = `${normalizeStateName(curState || '')}_${curDistrict?.toLowerCase().trim()}`;
                                        const districtSales = districtSalesMap.get(districtKey) || 0;

                                        let fillColor = '#F1F5F9';
                                        let strokeColor = '#CBD5E1';
                                        let hoverColor = '#E2E8F0';

                                        if (view === 'nation') {
                                            strokeColor = '#FFFFFF';
                                            fillColor = stateSales > 0 ? (colorScale(stateSales) as string) : '#F1F5F9';
                                            hoverColor = '#F472B6';
                                        } else {
                                            fillColor = districtSales > 0 ? (districtColorScale(districtSales) as string) : '#F1F5F9';
                                            hoverColor = '#F472B6';
                                            strokeColor = '#94A3B8';
                                        }

                                        return (
                                            <Geography
                                                key={geo.rsmKey}
                                                geography={geo}
                                                fill={fillColor}
                                                stroke={strokeColor}
                                                strokeWidth={0.5}
                                                style={{
                                                    default: { outline: 'none' },
                                                    hover: { fill: hoverColor, outline: 'none', cursor: 'pointer' },
                                                    pressed: { outline: 'none' },
                                                }}
                                                onClick={() => {
                                                    if (view === 'nation') {
                                                        handleStateClick(geo);
                                                    } else if (onDistrictClick) {
                                                        onDistrictClick(curState, curDistrict);
                                                    }
                                                }}
                                                onMouseEnter={() => {
                                                    if (view === 'nation') {
                                                        setTooltipContent(`${curState} | Sales: ${formatIndianCurrency(stateSales)}`);
                                                    } else {
                                                        setTooltipContent(`${curDistrict}, ${curState} | Sales: ${formatIndianCurrency(districtSales)}`);
                                                    }
                                                }}
                                                onMouseLeave={() => {
                                                    setTooltipContent('');
                                                }}
                                            />
                                        );
                                    });
                                }}
                            </Geographies>
                        </ZoomableGroup>
                    </ComposableMap>
                    <Tooltip id="map-tooltip" content={tooltipContent} float place="top" className="z-50 font-sans text-sm font-semibold shadow-xl" />
                </div>

                {/* Stats Panel */}
                <div className="w-full lg:w-80 space-y-4">
                    <div className="p-4 bg-slate-50 rounded-lg border">
                        <h4 className="font-bold text-slate-700 mb-2 flex items-center justify-between">
                            Coverage Stats
                            <Info size={16} className="text-slate-400" />
                        </h4>
                        {view === 'nation' ? (
                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs text-slate-500">States Covered</p>
                                    <p className="text-2xl font-bold text-primary">
                                        {data.filter(s => s.value > 0).length} <span className="text-sm font-normal text-slate-400">/ {data.length}</span>
                                    </p>
                                </div>
                                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary transition-all duration-500" style={{ width: `${(data.filter(s => s.value > 0).length / Math.max(data.length, 1)) * 100}%` }}></div>
                                </div>
                                <p className="text-xs text-slate-500 text-right">{((data.filter(s => s.value > 0).length / Math.max(data.length, 1)) * 100).toFixed(1)}% National Coverage</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs text-slate-500">Districts Covered in {selectedState}</p>
                                    {(() => {
                                        const stateRec = data.find(s => s.name.toLowerCase() === selectedState?.toLowerCase());
                                        const activeDistricts = stateRec ? stateRec.areas.filter(a => a.value > 0).length : 0;
                                        // Robust calculation for total districts
                                        let totalDistricts = 1;
                                        if (topology && topology.objects) {
                                            // Try to find the first object key which usually contains the geometries
                                            const key = Object.keys(topology.objects)[0];
                                            if (key && topology.objects[key].geometries) {
                                                totalDistricts = topology.objects[key].geometries.filter((g: any) => g.properties.st_nm === selectedState).length;
                                            }
                                        }

                                        return (
                                            <>
                                                <p className="text-2xl font-bold text-green-600">
                                                    {activeDistricts} <span className="text-sm font-normal text-slate-400">/ {totalDistricts}</span>
                                                </p>
                                                <div className="h-2 bg-slate-200 rounded-full overflow-hidden mt-2">
                                                    <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${(activeDistricts / Math.max(totalDistricts, 1)) * 100}%` }}></div>
                                                </div>
                                                <p className="text-xs text-slate-500 text-right">{((activeDistricts / Math.max(totalDistricts, 1)) * 100).toFixed(1)}% State Coverage</p>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-white rounded-lg border shadow-sm">
                        <h4 className="font-bold text-slate-800 mb-3">Top Performing {view === 'nation' ? 'States' : 'Districts'}</h4>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {view === 'nation' ? (
                                data.sort((a, b) => b.value - a.value).slice(0, 10).map((s, i) => (
                                    <div key={s.name} className="flex justify-between items-center text-sm p-2 hover:bg-slate-50 rounded">
                                        <div className="flex items-center gap-3">
                                            <span className="w-5 h-5 flex items-center justify-center bg-slate-100 rounded text-xs font-bold text-slate-500">{i + 1}</span>
                                            <span className="font-medium text-slate-700">{s.name}</span>
                                        </div>
                                        <span className="font-bold text-slate-900">{formatIndianNumber(s.value)}</span>
                                    </div>
                                ))
                            ) : (
                                data.find(s => s.name.toLowerCase() === selectedState?.toLowerCase())?.areas.sort((a, b) => b.value - a.value).slice(0, 10).map((a, i) => (
                                    <div key={a.name} className="flex justify-between items-center text-sm p-2 hover:bg-slate-50 rounded">
                                        <div className="flex items-center gap-3">
                                            <span className="w-5 h-5 flex items-center justify-center bg-slate-100 rounded text-xs font-bold text-slate-500">{i + 1}</span>
                                            <span className="font-medium text-slate-700">{a.name}</span>
                                        </div>
                                        <span className="font-bold text-slate-900">{formatIndianNumber(a.value)}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Top Performer Card */}
                    {topPerformers && (
                        <div className="p-4 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg border border-yellow-200 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                                <Trophy size={64} className="text-yellow-600" />
                            </div>

                            <h4 className="font-bold text-yellow-800 mb-3 flex items-center gap-2 relative z-10">
                                <Crown size={18} className="text-yellow-600 fill-yellow-600" />
                                {view === 'nation' ? 'National Top Performer' : 'State Top Performer'}
                            </h4>

                            {(() => {
                                const performer = view === 'nation'
                                    ? topPerformers.national
                                    : (selectedState ? topPerformers.state[normalizeStateName(selectedState)] : null);

                                if (!performer) return <p className="text-sm text-slate-500 italic">No Data Available</p>;

                                return (
                                    <div className="relative z-10">
                                        <p className="font-bold text-lg text-slate-900 leading-tight mb-1">{performer.name}</p>
                                        <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                                            <MapIcon size={12} /> {performer.location}
                                        </p>

                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div className="bg-white/60 p-2 rounded border border-yellow-100">
                                                <p className="text-[10px] text-slate-500 uppercase font-bold">Sales</p>
                                                <p className="font-bold text-slate-800">{formatIndianCurrency(performer.value)}</p>
                                            </div>
                                            <div className="bg-white/60 p-2 rounded border border-yellow-100">
                                                <p className="text-[10px] text-slate-500 uppercase font-bold">Units</p>
                                                <p className="font-bold text-slate-800">{formatIndianNumber(performer.units)}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
};

export default SalesMap;
