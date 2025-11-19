/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// import { useState } from "react";

import { Box } from "@mui/material";
import "./App.css";
import { LineChart } from "@mui/x-charts";
import { axisClasses } from "@mui/x-charts/ChartsAxis";
import { useEffect, useState } from "react";
import HealthCheckBox from "./producer/HealthCheckBox";

function App() {
  return (
    <Box className="main-container">
      <Box className="producer-component">
        <HealthCheckBox />
        <Box
          sx={{
            display: "flex",
            gap: "24px",
          }}
        >
          <CustomButton buttonName="Start" onClick={() => {}} />
          <CustomButton buttonName="Stop" onClick={() => {}} />
          <CustomButton buttonName="Reset" onClick={() => {}} />
        </Box>
        <ProducerConfig />
      </Box>
      <Box className="consumer-group">
        <IndividualConsumerComponent consumerName="Orders" />
        <IndividualConsumerComponent consumerName="Notifications" />
        <IndividualConsumerComponent consumerName="Data Anaytics" />
      </Box>
    </Box>
  );
}

export default App;

const IndividualConsumerComponent = ({
  consumerName,
}: {
  consumerName: string;
}) => {
  const [uData, setUData] = useState<number[]>([]);
  const [starting, setStarting] = useState<number>(250);

  useEffect(() => {
    const interval = setInterval(() => {
      setStarting((prevStarting) => {
        // Smaller range → smoother changes
        const change = Math.floor(Math.random() * 40) + 10; // 10–50
        const direction = Math.random() < 0.45 ? -1 : 1; // 45% chance of going down
        const increment = direction * change;

        const nextValue = prevStarting + increment;
        setUData((prevData) => {
          if (prevData.length >= 100) {
            clearInterval(interval); // stop adding points
            return prevData;
          }
          return [...prevData, nextValue];
        });
        return nextValue;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <Box className="individual-consumer-component">
      {consumerName}

      <Box className="consumer-chart-area">
        <LineChart
          xAxis={[{ data: [1, 2, 3, 5, 8, 10], label: "Time" }]}
          series={[{ data: uData, color: "white", showMark: false }]}
          yAxis={[{ label: "Events Handled" }]}
          height={280}
          sx={{
            color: "white",
            padding: 0,
            // Style axis lines
            [`& .${axisClasses.line}`]: {
              stroke: "white",
            },
            // Style axis ticks
            [`& .${axisClasses.tick}`]: {
              stroke: "white",
            },
            // Style axis tick labels (font)
            [`& .${axisClasses.tickLabel}`]: {
              fill: "white",
            },
            // Ensure the background is dark for contrast if not already
            // This is a common practice when making elements white
            // A full background change might be done at a higher level (e.g., in main.css or theme)
            // but for a quick demo, we can set a dark background for the chart itself.
            ".MuiChartsLegend-root": {
              fill: "white", // If there's a legend, make its text white
            },
            ".MuiChartsAxis-label": {
              fill: "white", // If axis labels are present
            },
            backgroundColor: "#303030", // A dark background to make white visible
            borderRadius: "8px",
          }}
        />
      </Box>
    </Box>
  );
};

const CustomButton = ({
  buttonName,
  onClick,
  icon,
}: {
  buttonName: string;
  onClick: () => any;
  icon?: any;
}) => {
  return (
    <Box className="custom-button" onClick={onClick}>
      {buttonName}
    </Box>
  );
};

const ProducerConfig = () => {
  const [partitions, setPartitions] = useState<number>(3);
  const addPartition = () => {
    setPartitions((prevState: number) => {
      if (prevState < 5) return prevState + 1;
      return prevState;
    });
  };

  const removePartition = () => {
    setPartitions((prevState: number) => {
      if (prevState > 1) return prevState - 1;
      return prevState;
    });
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <Box
        sx={{
          display: "flex",
          gap: "4px",
        }}
      >
        {Array.from({ length: partitions }).map((_, index: number) => (
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
          onClick={removePartition}
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
          onClick={addPartition}
        >
          +
        </Box>
      </Box>
    </Box>
  );
};
