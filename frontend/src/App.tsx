import { Route, Routes } from "react-router";
import Layout from "./components/Layout";
import Inicio from "./pages/Inicio";
import Catalogo from "./pages/Catalogo";
import NoEncontrada from "./pages/NoEncontrada";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        <Route path="catalogo" element={<Catalogo />} />
        <Route path="*" element={<NoEncontrada />} />
      </Route>
    </Routes>
  );
}
