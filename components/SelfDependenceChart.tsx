import React from 'react';

interface TransitionEvolutionChartProps {
    title: string;
    timeSteps: (string|number)[];
    data: { [fromState: string]: (number|null)[] };
    states: (string|number)[];
}

const generatePastelColor = (seed: number, total: number) => {
    // Generate evenly spaced hues for better color distinction
    const hue = (seed * (360 / (total + 1))) % 360;
    return `hsl(${hue}, 70%, 70%)`;
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


export const SelfDependenceChart: React.FC<TransitionEvolutionChartProps> = ({ title, timeSteps, data, states }) => {
    const width = 600;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 50, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const numTicks = 5;

    const fromStates = Object.keys(data);
    const stateColorMap = new Map(states.map((s, i) => [String(s), generatePastelColor(i, states.length)]));
    
    // Y domain is always 0 to 1 for probabilities
    const yDomainMax = 1.0;
    
    const xScale = (index: number) => (index / (timeSteps.length - 1)) * chartWidth;
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
                                        {val.toFixed(1)}
                                    </text>
                                </g>
                            );
                        })}
                        <text transform={`translate(${-margin.left + 15}, ${chartHeight / 2}) rotate(-90)`} textAnchor="middle" fontSize="12" fill="currentColor">
                            Probability
                        </text>

                        {/* X-Axis */}
                        {timeSteps.map((tick, i) => {
                            // Only show a subset of ticks if there are many
                             if (timeSteps.length > 10 && i % Math.floor(timeSteps.length / 5) !== 0 && i !== timeSteps.length -1) return null;
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
                        {fromStates.map(fromState => (
                             <path key={fromState} d={getPathData(data[fromState], xScale, yScale)} fill="none" stroke={stateColorMap.get(fromState)} strokeWidth="2" />
                        ))}

                        {/* Frame */}
                        <rect x="0" y="0" width={chartWidth} height={chartHeight} fill="none" stroke="#4B5563" strokeWidth="1" />
                    </g>
                </svg>
                <div className="w-full md:w-48 text-sm space-y-2 pl-4">
                    <p className="font-semibold text-gray-400 text-xs mb-2 uppercase">From State (Xt-1)</p>
                    {fromStates.map(fromState => (
                        <div key={fromState} className="flex items-center">
                            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: stateColorMap.get(fromState) }} />
                            <span className="text-gray-300 font-mono text-xs">{fromState}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};