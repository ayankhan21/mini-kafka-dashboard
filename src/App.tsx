/* eslint-disable @typescript-eslint/no-explicit-any */
import { Box } from "@mui/material";
import "./App.css";
import { LineChart } from "@mui/x-charts";
import { axisClasses } from "@mui/x-charts/ChartsAxis";
import { useEffect, useState, useRef } from "react";
import HealthCheckBox from "./producer/HealthCheckBox";

const AGGREGATOR_URL = "http://localhost:3000";
const BROKER_URL = "http://localhost:8080";
const PRODUCER_URL = "http://localhost:8084";

// Map consumer names to their SSE keys
const CONSUMER_KEYS: Record<string, string> = {
  Orders: "orders-service",
  Notifications: "notifications-service",
  "Data Analytics": "analytics-service",
};

// Shared SSE data type
type PartitionMetric = {
  partition: number;
  offset: number;
  eventsConsumed: number;
};

type ConsumerMetric = {
  consumerName: string;
  totalEventsConsumed: number;
  partitions: PartitionMetric[];
  error?: string;
};

type SSEPayload = {
  timestamp: number;
  consumers: Record<string, ConsumerMetric>;
};

function App() {
  const [sseData, setSseData] = useState<SSEPayload | null>(null);
  const [partitions, setPartitions] = useState<number>(3);

  const [eventsPerSecond, setEventsPerSecond] = useState<number>(100);
  const [duration, setDuration] = useState<number>(60);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Connect to SSE stream once on mount
  useEffect(() => {
    const es = new EventSource(`${AGGREGATOR_URL}/stream`);
    es.onmessage = (e) => {
      const data: SSEPayload = JSON.parse(e.data);
      setSseData(data);
    };
    es.onerror = () => console.error("SSE connection error");
    return () => es.close();
  }, []);

  const handleStart = async () => {
    console.log("Starting with:", { eventsPerSecond, duration, partitions });

    // Remove the broker config call from here
    // Partition config should only be set when partition count changes via +/-

    await fetch(`${PRODUCER_URL}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventsPerSecond, durationSeconds: duration }),
    });

    setIsRunning(true);
    setTimeout(() => setIsRunning(false), duration * 1000);
  };

  const handleStop = async () => {
    await fetch(`${PRODUCER_URL}/stop`, { method: "POST" });
    setIsRunning(false);
  };

  const handleReset = async () => {
    await fetch(`${PRODUCER_URL}/stop`, { method: "POST" });
  };

  const handleAddPartition = async () => {
    const next = Math.min(partitions + 1, 5);
    setPartitions(next);
    await fetch(`${BROKER_URL}/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partitionCount: next }),
    });
  };

  const handleRemovePartition = async () => {
    const next = Math.max(partitions - 1, 1);
    setPartitions(next);
    await fetch(`${BROKER_URL}/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partitionCount: next }),
    });
  };

  // Derive health check from SSE data
  const healthChecks = [
    { component: "PAYMENTS-SERVICE-PRODUCER", healthCheck: sseData !== null },
    {
      component: "MINI-KAFKA-BROKER",
      healthCheck:
        sseData !== null &&
        Object.values(sseData.consumers).some((c) => !c.error),
    },
    {
      component: "ORDERS-SERVICE-CONSUMER",
      healthCheck: !sseData?.consumers["orders-service"]?.error,
    },
    {
      component: "NOTIFICATIONS-SERVICE-CONSUMER",
      healthCheck: !sseData?.consumers["notifications-service"]?.error,
    },
    {
      component: "ANALYTICS-SERVICE-CONSUMER",
      healthCheck: !sseData?.consumers["analytics-service"]?.error,
    },
    {
      component: "EVENTS-AGGREGATOR-SERVICE",
      healthCheck: sseData !== null,
    },
  ];

  return (
    <Box className="main-container">
      <Box className="producer-component">
        <HealthCheckBox componentsList={healthChecks} />
        <Box
          sx={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            color: "azure",
            fontSize: "12px",
          }}
        >
          <span>EPS:</span>
          <input
            type="number"
            value={eventsPerSecond}
            min={10}
            max={1700}
            disabled={isRunning}
            onChange={(e) => setEventsPerSecond(Number(e.target.value))}
            style={{
              width: "60px",
              background: "#1e1e1e",
              color: "white",
              border: "1px solid #333",
              borderRadius: "4px",
              padding: "4px",
            }}
          />
          <span>Duration (s):</span>
          <input
            type="number"
            value={duration}
            min={10}
            max={60}
            disabled={isRunning}
            onChange={(e) => setDuration(Number(e.target.value))}
            style={{
              width: "60px",
              background: "#1e1e1e",
              color: "white",
              border: "1px solid #333",
              borderRadius: "4px",
              padding: "4px",
            }}
          />
        </Box>
        <Box sx={{ display: "flex", gap: "24px" }}>
          <CustomButton
            buttonName="Start"
            onClick={handleStart}
            disabled={isRunning}
          />
          <CustomButton
            buttonName="Stop"
            onClick={handleStop}
            disabled={isRunning}
          />
          <CustomButton
            buttonName="Reset"
            onClick={handleReset}
            disabled={isRunning}
          />
        </Box>
        <ProducerConfig
          partitions={partitions}
          onAdd={handleAddPartition}
          onRemove={handleRemovePartition}
        />
      </Box>
      <Box className="consumer-group">
        {["Orders", "Notifications", "Data Analytics"].map((name) => (
          <IndividualConsumerComponent
            key={name}
            consumerName={name}
            metrics={sseData?.consumers[CONSUMER_KEYS[name]] ?? null}
          />
        ))}
      </Box>
    </Box>
  );
}

export default App;

// ---

const IndividualConsumerComponent = ({
  consumerName,
  metrics,
}: {
  consumerName: string;
  metrics: ConsumerMetric | null;
}) => {
  // Keep a rolling history of totalEventsConsumed for the line chart
  const [totalHistory, setTotalHistory] = useState<number[]>([]);
  const prevTotal = useRef<number>(0);

  useEffect(() => {
    if (!metrics || metrics.error) return;
    const total = metrics.totalEventsConsumed;
    if (total !== prevTotal.current) {
      prevTotal.current = total;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTotalHistory((prev) => {
        const next = [...prev, total];
        return next.length > 50 ? next.slice(-50) : next; // keep last 50 points
      });
    }
  }, [metrics]);

  const xData = totalHistory.map((_, i) => i + 1);
  const partitionData = metrics?.partitions ?? [];

  return (
    <Box className="individual-consumer-component">
      <Box sx={{ marginBottom: "8px" }}>{consumerName}</Box>

      {/* Total events consumed over time */}
      <LineChart
        xAxis={[{ data: xData.length > 0 ? xData : [0], label: "Time" }]}
        series={[
          {
            data: totalHistory.length > 0 ? totalHistory : [0],
            color: "white",
            showMark: false,
            label: "Total",
          },
        ]}
        yAxis={[{ label: "Total Events" }]}
        height={160}
        sx={chartSx}
      />

      {/* Per partition breakdown */}
      {partitionData.length > 0 && (
        <Box sx={{ display: "flex", gap: "8px", marginTop: "8px" }}>
          {partitionData.map((p) => (
            <Box
              key={p.partition}
              sx={{
                flex: 1,
                background: "#1e1e1e",
                border: "1px solid #333",
                borderRadius: "4px",
                padding: "6px",
                fontSize: "10px",
                color: "azure",
              }}
            >
              <Box>P{p.partition}</Box>
              <Box>offset: {p.offset}</Box>
              <Box>consumed: {p.eventsConsumed}</Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

// ---

const chartSx = {
  color: "white",
  padding: 0,
  [`& .${axisClasses.line}`]: { stroke: "white" },
  [`& .${axisClasses.tick}`]: { stroke: "white" },
  [`& .${axisClasses.tickLabel}`]: { fill: "white" },
  ".MuiChartsLegend-root": { fill: "white" },
  ".MuiChartsAxis-label": { fill: "white" },
  backgroundColor: "#303030",
  borderRadius: "8px",
};

// ---

const CustomButton = ({
  buttonName,
  onClick,
  disabled = false,
}: {
  buttonName: string;
  onClick: () => any;
  disabled: boolean;
}) => {
  return (
    <Box
      className={`custom-button ${disabled ? "custom-button-disabled" : ""}`}
      onClick={disabled ? undefined : onClick}
    >
      {buttonName}
    </Box>
  );
};

// ---

const ProducerConfig = ({
  partitions,
  onAdd,
  onRemove,
  disabled = false,
}: {
  partitions: number;
  onAdd: () => void;
  onRemove: () => void;
  disabled?: boolean;
}) => {
  const handleAdd = () => {
    if (!disabled) onAdd();
  };
  const handleRemove = () => {
    if (!disabled) onRemove();
  };
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <Box sx={{ display: "flex", gap: "4px" }}>
        {Array.from({ length: partitions }).map((_, index) => (
          <Box className="custom-button" key={index}>
            Partition {index + 1}
          </Box>
        ))}
      </Box>
      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Box
          sx={{
            border: "1px solid white",
            width: "25px",
            borderRadius: "4px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            cursor: "pointer",
          }}
          onClick={handleRemove}
        >
          -
        </Box>
        <Box
          sx={{
            border: "1px solid white",
            width: "25px",
            borderRadius: "4px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            cursor: "pointer",
          }}
          onClick={handleAdd}
        >
          +
        </Box>
      </Box>
    </Box>
  );
};
