/**
 * Gerador de BR Code (PIX Copia e Cola) — padrão EMV do Banco Central.
 * Gera a string "00020126..." que o usuário cola no app do banco.
 */

/** Calcula o CRC16/CCITT-False exigido pelo padrão PIX. */
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Monta um campo TLV (id + length + value). */
function field(id: string, value: string): string {
  return `${id}${value.length.toString().padStart(2, "0")}${value}`;
}

/** Remove acentos e normaliza para ASCII (nomes de cidade/comerciário no PIX). */
function normalize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .toUpperCase();
}

export function generatePixBrCode(params: {
  pixKey: string;
  amount?: number;
  merchantName: string;
  merchantCity: string;
  txid?: string;
  description?: string;
}): string {
  const { pixKey, amount, merchantName, merchantCity, txid = "***", description } = params;

  // ID 26 — Merchant Account Information (GUI + chave PIX)
  let merchantAccount = field("00", "br.gov.bcb.pix") + field("01", pixKey);
  if (description) {
    merchantAccount += field("02", normalize(description).slice(0, 72));
  }

  // ID 62 — Additional Data Field (txid)
  const additionalData = field("05", txid.slice(0, 25));

  // Monta o payload (sem o CRC ainda)
  let payload = "";
  payload += field("00", "01"); // Payload Format Indicator
  payload += field("01", "12"); // Point of Initiation — estático
  payload += field("26", merchantAccount);
  payload += field("52", "0000"); // Merchant Category Code
  payload += field("53", "986"); // Moeda = BRL
  if (amount !== undefined && amount > 0) {
    payload += field("54", amount.toFixed(2));
  }
  payload += field("58", "BR"); // País
  payload += field("59", normalize(merchantName).slice(0, 25) || "CATROGO");
  payload += field("60", normalize(merchantCity).slice(0, 15) || "SAO PAULO");
  payload += field("62", additionalData);
  payload += "6304"; // ID + length do CRC (placeholder — o valor é calculado abaixo)

  const crc = crc16(payload);
  return payload + crc;
}
