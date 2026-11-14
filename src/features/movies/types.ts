export type Movie = {
  id: string;
  title: string;
  description: string | null;
  poster_url: string | null;
  video_url: string;
  category: string;
  year: number | null;
  duration_min: number | null;
  views: number;
  director: string | null;
  cast_names: string[] | null;
  rating: number | null;
  age_rating: string | null;
};

/** Posição salva de um filme para o usuário (histórico / continuar assistindo). */
export type MovieProgress = { pos: number; dur: number; at: string };
