/* eslint-disable @typescript-eslint/no-unused-vars */
import { Box } from "@mui/material";
import { useState } from "react";
import "../App.css";

type Component = {
  component: string;
  healthCheck: boolean;
};

const HealthCheckBox = () => {
  const [componentsList, setComponentsList] = useState<Component[]>([
    { component: "PAYMENTS-SERVICE-PRODUCER", healthCheck: false },
    { component: "MINI-KAFKA-BROKER", healthCheck: false },
    { component: "ORDERS-SERVICE-CONSUMER", healthCheck: true },
    { component: "NOTIFICATIONS-SERVICE-CONSUMER", healthCheck: false },
    { component: "DATA-ANALYTICS-SERVICE-CONSUMER", healthCheck: false },
    { component: "EVENTS-AGGREGATOR-SERVICE", healthCheck: false },
  ]);
  return (
    <Box className="health-check-component">
      <span>Health Check</span>
      {componentsList.map((component: Component) => (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: "8px",
          }}
        >
          <Box
            className={
              component.healthCheck ? "health-check-pass" : "health-check-fail"
            }
          ></Box>
          <Box>{component.component}</Box>
        </Box>
      ))}
    </Box>
  );
};

export default HealthCheckBox;
