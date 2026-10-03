/**
 * Pix "Copia e Cola" (BR Code / EMV® QRCPS-MPM).
 *
 * Gerado 100% no navegador: nenhuma API externa, nenhum segredo exposto.
 * O valor já vai embutido no código, então o cliente não precisa digitar nada.
 */

export const PIX_KEY = "billiealieshsilva@gmail.com";

/** Nome e cidade do recebedor (ASCII, sem acentos — exigência do BR Code). */
export const PIX_MERCHANT_NAME = "CATROGO";
export const PIX_MERCHANT_CITY = "BELEM";

function ascii(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
}

/** Campo EMV: id (2) + tamanho (2) + valor. */
function field(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

/** CRC16/CCITT-FALSE, exigido no fim do payload. */
function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function buildPixPayload({
  key = PIX_KEY,
  amount,
  txid = "CTRGOS",
  merchant = PIX_MERCHANT_NAME,
  city = PIX_MERCHANT_CITY,
}: {
  key?: string;
  amount?: number;
  txid?: string;
  merchant?: string;
  city?: string;
} = {}) {
  const account = field("00", "br.gov.bcb.pix") + field("01", key);

  const payload =
    field("00", "01") +
    field("26", account) +
    field("52", "0000") +
    field("53", "986") +
    (amount && amount > 0 ? field("54", amount.toFixed(2)) : "") +
    field("58", "BR") +
    field("59", ascii(merchant).slice(0, 25)) +
    field("60", ascii(city).slice(0, 15)) +
    (txid ? field("62", field("05", ascii(txid).slice(0, 25))) : "") +
    "6304";

  return payload + crc16(payload);
}
