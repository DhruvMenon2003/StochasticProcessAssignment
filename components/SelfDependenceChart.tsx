import React from 'react';
import { TimeSeriesPlotData } from '../types';

interface SelfDependenceChartProps {
    title: string;
    data: TimeSeriesPlotData;
}

const COLORS = {
  unconditional: '#10B981', // Green-500
  firstOrder: '#8B5CF6',    // Violet-500
  secondOrder: '#EC4899',   // Pink-500
  fullPast: '#F97316',      // Orange-500
};

const LABELS = {
  unconditional: 'P(Xt)',
  firstOrder: 'P(Xt|Xt-1)',
  secondOrder: 'P(Xt|Xt-1,Xt-2)',
  fullPast: 'P(Xt|X1...Xt-1)',
};

const getPathData = (series: (number | null)[], xScale: (i: number) => number, yScale: (p: number) => number): string => {
    let path = '';
    let isPenDown = false;
    series.forEach((point, i) => {
        if (point !== null && isFinite(point)) {
            const x = xScale(i);
            const y = yScale(point);
            if (!isPenDown) {
                path += `M${x},${y}`;
                isPenDown = true;
            } else {
                path += `L${x},${y}`;
            }
        } else {
            isPenDown = false;
        }
    });
    return path;
};


export const SelfDependenceChart: React.FC<SelfDependenceChartProps> = ({ title, data }) => {
    const width = 600;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 50, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const numTicks = 5;

    const allProbs = [
        ...data.unconditional,
        ...data.firstOrder,
        ...data.secondOrder,
        ...data.fullPast,
    ].filter(p => p !== null) as number[];
    
    const maxY = allProbs.length > 0 ? Math.max(...allProbs) : 1;
    const yDomainMax = Math.min(1, Math.ceil(maxY * 10) / 10); // Round up to next 0.1, max 1
    
    const xScale = (index: number) => (index / (data.time.length - 1)) * chartWidth;
    const yScale = (prob: number) => chartHeight - (prob / yDomainMax) * chartHeight;

    return (
        <div>
            <h4 className="font-semibold text-lg text-gray-200 mb-4">{title}</h4>
            <div className="flex flex-col md:flex-row items-center gap-4">
                <svg width="100%" viewBox={`0 0 ${width} ${height}`}>
                    <g transform={`translate(${margin.left}, ${margin.top})`}>
                        {/* Y-Axis */}
                        {Array.from({ length: numTicks + 1 }).map((_, i) => {
                            const val = (yDomainMax / numTicks) * i;
                            const y = yScale(val);
                            return (
                                <g key={i} className="text-gray-400">
                                    <line x1={0} y1={y} x2={chartWidth} y2={y} stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" />
                                    <text x={-10} y={y + 4} textAnchor="end" fontSize="10" fill="currentColor">
                                        {val.toFixed(2)}
                                    </text>
                                </g>
                            );
                        })}
                        <text transform={`translate(${-margin.left + 15}, ${chartHeight / 2}) rotate(-90)`} textAnchor="middle" fontSize="12" fill="currentColor">
                            Probability
                        </text>

                        {/* X-Axis */}
                        {data.time.map((tick, i) => {
                             if (data.time.length > 10 && i % Math.floor(data.time.length / 5) !== 0 && i !== data.time.length -1) return null;
                            const x = xScale(i);
                            return (
                                <g key={i} className="text-gray-400">
                                    <line x1={x} y1={chartHeight} x2={x} y2={chartHeight + 5} stroke="currentColor" strokeWidth="1" />
                                    <text x={x} y={chartHeight + 20} textAnchor="middle" fontSize="10" fill="currentColor">
                                        {tick}
                                    </text>
                                </g>
                            );
                        })}
                         <text x={chartWidth/2} y={chartHeight + 40} textAnchor="middle" fontSize="12" fill="currentColor">
                            Time
                        </text>

                        {/* Lines */}
                        <path d={getPathData(data.unconditional, xScale, yScale)} fill="none" stroke={COLORS.unconditional} strokeWidth="2" />
                        <path d={getPathData(data.firstOrder, xScale, yScale)} fill="none" stroke={COLORS.firstOrder} strokeWidth="2" />
                        <path d={getPathData(data.secondOrder, xScale, yScale)} fill="none" stroke={COLORS.secondOrder} strokeWidth="2" />
                        <path d={getPathData(data.fullPast, xScale, yScale)} fill="none" stroke={COLORS.fullPast} strokeWidth="2.5" />

                        {/* Frame */}
                        <rect x="0" y="0" width={chartWidth} height={chartHeight} fill="none" stroke="#4B5563" strokeWidth="1" />
                    </g>
                </svg>
                <div className="w-full md:w-48 text-sm space-y-2 pl-4">
                    {Object.entries(LABELS).map(([key, label]) => (
                        <div key={key} className="flex items-center">
                            <div className="w-4 h-1 mr-2" style={{ backgroundColor: COLORS[key] }} />
                            <span className="text-gray-300 font-mono text-xs">{label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
