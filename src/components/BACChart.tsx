/* File: src/components/BACChart.tsx */
import React, { useState, useEffect, useRef } from "react";
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
  const chartRef = useRef<HTMLDivElement>(null);
  const [windowStart, setWindowStart] = useState<number>(() => {
    const now = Date.now();
    return now - 8 * 60 * 60 * 1000; // 8 heures en arrière
  });
  const [windowEnd, setWindowEnd] = useState<number>(() => {
    const now = Date.now();
    return now + 4 * 60 * 60 * 1000; // 4 heures dans le futur
  });

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartX = useRef<number>(0);
  const initialWindowStart = useRef<number>(0);
  const initialWindowEnd = useRef<number>(0);

  // Filtrer les données selon la fenêtre actuelle
  const filteredData = data
    .map((entry) => ({
      ...entry,
      timestamp: entry.time.getTime(),
    }))
    .filter(
      (entry) => entry.timestamp >= windowStart && entry.timestamp <= windowEnd
    )
    .map((entry) => ({
      ...entry,
      time: entry.timestamp,
    }));

  // Ajouter des points avec BAC=0 au-delà de windowEnd
  if (filteredData.length > 0) {
    const lastEntry = filteredData[filteredData.length - 1];
    if (lastEntry.timestamp < windowEnd) {
      filteredData.push({ time: windowEnd, bac: 0 });
    }
  }

  // Handlers pour le glisser-déplacer
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartX.current = e.clientX;
    initialWindowStart.current = windowStart;
    initialWindowEnd.current = windowEnd;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartX.current;
    const chartWidth = chartRef.current
      ? chartRef.current.clientWidth
      : window.innerWidth;

    // Calculer le décalage en millisecondes
    const timeDelta = (deltaX / chartWidth) * (windowEnd - windowStart);

    // Mettre à jour la fenêtre en décalant
    setWindowStart(initialWindowStart.current - timeDelta);
    setWindowEnd(initialWindowEnd.current - timeDelta);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Ajouter des écouteurs d'événements globaux pour gérer le glisser-déplacer en dehors du chart
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging && chartRef.current?.contains(e.target as Node)) {
        // Do nothing, handled by onMouseMove in chart
      }
    };

    const onMouseUpGlobal = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove as any);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove as any);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Initialisation de la fenêtre basée sur les données
  useEffect(() => {
    if (data.length > 0) {
      const earliest = data[0].time.getTime();
      const latest = data[data.length - 1].time.getTime();

      // Assurer que windowStart et windowEnd sont dans les limites des données
      setWindowStart((prev) => Math.max(prev, earliest));
      setWindowEnd((prev) => Math.min(prev, latest));
    }
  }, [data]);

  return (
    <div
      className="w-full h-[300px] cursor-grab"
      ref={chartRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <ResponsiveContainer>
        <LineChart
          data={filteredData}
          margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
          <XAxis
            dataKey="time"
            tickFormatter={formatTime}
            domain={[windowStart, windowEnd]}
            type="number"
            scale="time"
            minTickGap={50}
          />
          <YAxis domain={[0, "auto"]} />
          <Tooltip content={<CustomTooltip />} />
          {/* Limite légale à 0.5 g/L */}
          <ReferenceLine
            y={0.5}
            stroke="#EF4444"
            strokeDasharray="3 3"
            label={{ value: "0.5", position: "right" }}
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
