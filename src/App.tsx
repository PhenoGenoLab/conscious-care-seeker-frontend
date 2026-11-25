import { Navigate, Route, Routes } from "react-router";
import { Layout } from "@/components/layout";
import { ChatPage } from "@/pages/chat";
import { LibraryPage } from "@/pages/library";
import { SearchPage } from "@/pages/search";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ChatPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
