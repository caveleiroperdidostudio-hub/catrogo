export type EventMission = {
  key: string;
  title: string;
  description: string;
  coins: number;
  grantsMod?: boolean;
  cost?: number; // se > 0, é "comprada" em vez de concluída (usa moedas)
};

export const CHRISTMAS_MISSIONS: EventMission[] = [
  { key: "xmas_welcome", title: "Boas-vindas natalinas", description: "Entre no evento e ganhe moedas festivas.", coins: 100 },
  { key: "xmas_share", title: "Espírito de Natal", description: "Compartilhe a magia do evento com a galáxia.", coins: 150 },
  { key: "xmas_explorer", title: "Explorador polar", description: "Visite os módulos do app durante o evento.", coins: 200 },
  { key: "xmas_exclusive", title: "Presente Exclusivo 🎁", description: "Resgate o Mod Exclusivo de Natal, indisponível fora do evento.", coins: 0, grantsMod: true },
  { key: "xmas_premium", title: "Pacote Premium Natalino", description: "Compre um lote extra de recompensas festivas.", coins: 500, cost: 250 },
];
