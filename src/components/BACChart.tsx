/* File: src/components/BACChart.tsx */
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface BACChartProps {
  data: { time: Date; bac: number }[];
}

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const time = new Date(label);
    const bac = payload[0].value;

    return (
      <div className="bg-white p-2 border border-gray-200 rounded shadow-sm">
        <p className="text-sm font-medium">
          {`${time.getHours().toString().padStart(2, "0")}:${time
            .getMinutes()
            .toString()
            .padStart(2, "0")}`}
        </p>
        <p className="text-sm text-gray-600">{`${bac.toFixed(3)} g/L`}</p>
      </div>
    );
  }
  return null;
};

export function BACChart({ data }: BACChartProps) {
  const filteredData = data.filter((entry) => entry.bac > 0);

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer>
        <LineChart
          data={filteredData.map((entry) => ({
            ...entry,
            timestamp: entry.time.getTime(),
          }))}
          margin={{ top: 5, right: 40, bottom: 5, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatTime}
            type="number"
            scale="time"
            domain={["auto", "auto"]}
            minTickGap={50}
          />
          <YAxis domain={[0, "auto"]} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={0.5}
            stroke="#EF4444"
            strokeDasharray="3 3"
            label={{ value: "0.5", position: "right", offset: 10 }}
          />
          <Line
            type="monotone"
            dataKey="bac"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
