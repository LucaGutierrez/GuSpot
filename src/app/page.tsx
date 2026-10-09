import { Suspense } from "react";
import { SearchFallback, SearchView } from "@/components/explore/mobile-explore";

// La búsqueda en el mapa es la pantalla principal: en celulares, mapa a
// pantalla completa; en escritorio, lista + mapa. La búsqueda vive en la query
// (?zona=…&fecha=…); sin zona se usa la última buscada o CABA.
export default function Home() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchView />
    </Suspense>
  );
}
