import { Routes, Route, Navigate } from "react-router-dom";

import Home from "./game/home/home";
import Info from "./game/info/info";
import Race from "./game/race/race";

const NotFound = () => <div>404</div>;

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/info" element={<Info />} />
      <Route path="/race" element={<Race />} />

      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
