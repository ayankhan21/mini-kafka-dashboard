/* eslint-disable @typescript-eslint/no-unused-vars */
import { Box } from "@mui/material";
import "../App.css";

type Component = {
  component: string;
  healthCheck: boolean;
};

const HealthCheckBox = ({ componentsList }: { componentsList: Component[] }) => {
  return (
    <Box className="health-check-component">
      <span>Health Check</span>
      {componentsList.map((component: Component) => (
        <Box
          key={component.component}
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
          />
          <Box>{component.component}</Box>
        </Box>
      ))}
    </Box>
  );
};

export default HealthCheckBox;