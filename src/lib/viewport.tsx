import { createContext, useContext, useEffect, useMemo, useState } from "react";

/**
 * Camada global de layout responsivo do CatroGo.
 * Mede a viewport real (incluindo visualViewport / teclado virtual),
 * publica variáveis CSS e expõe os breakpoints para qualquer tela.
 */
export type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl" | "ultra";

export type ViewportInfo = {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean
  isDesktop: boolean;
  isLandscape: boolean;
  keyboardOpen: boolean;
  /** Altura ocupada pelo teclado virtual, em px. */
  keyboardInset: number;
};

const FALLBACK: ViewportInfo = {
  width: 390,
  height: 844,
  breakpoint: "xs",
  isMobile: true,
  isTablet: false,
  isDesktop: false,
  isLandscape: false,
  keyboardOpen: false,
  keyboardInset: 0,
};

function bpOf(w: number): Breakpoint {
  if (w < 380) return "xs";
  if (w < 640) return "sm";
  if (w < 1024) return "md";
  if (w < 1440) return "lg";
  if (w < 1920) return "xl";
  return "ultra";
}

function measure(): ViewportInfo {
  const vv = window.visualViewport;
  const width = Math.round(vv?.width ?? window.innerWidth);
  const height = Math.round(vv?.height ?? window.innerHeight);
  const layoutHeight = window.innerHeight;
  const keyboardInset = Math.max(0, Math.round(layoutHeight - height - (vv?.offsetTop ?? 0)));
  const breakpoint = bpOf(width);
  return {
    width,
    height,
    breakpoint,
    isMobile: width < 640,
    isTablet: width >= 640 && width < 1024,
    isDesktop: width >= 1024,
    isLandscape: width > height,
    keyboardOpen: keyboardInset > 120,
    keyboardInset,
  };
}

const ViewportContext = createContext<ViewportInfo>(FALLBACK);

export function ViewportProvider({ children }: { children: React.ReactNode }) {
  const [info, setInfo] = useState<ViewportInfo>(FALLBACK);

  useEffect(() => {
    const apply = () => {
      const next = measure();
      setInfo(next);
      const root = document.documentElement;
      root.style.setProperty("--app-vw", `${next.width}px`);
      root.style.setProperty("--app-vh", `${next.height}px`);
      root.style.setProperty("--app-kb", `${next.keyboardOpen ? next.keyboardInset : 0}px`);
      root.dataset.bp = next.breakpoint;
      root.dataset.orientation = next.isLandscape ? "landscape" : "portrait";
    };
    apply();
    const vv = window.visualViewport;
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    vv?.addEventListener("resize", apply);
    vv?.addEventListener("scroll", apply);
    return () => {
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      vv?.removeEventListener("resize", apply);
      vv?.removeEventListener("scroll", apply);
    };
  }, []);

  return <ViewportContext.Provider value={info}>{children}</ViewportContext.Provider>;
}

export function useViewport() {
  return useContext(ViewportContext);
}

/** Número de colunas ideal para grades de mídia na largura atual. */
export function useMediaColumns() {
  const { width } = useViewport();
  return useMemo(() => {
    if (width < 380) return 2;
    if (width < 640) return 2;
    if (width < 900) return 3;
    if (width < 1280) return 4;
    if (width < 1700) return 5;
    return 7;
  }, [width]);
}
