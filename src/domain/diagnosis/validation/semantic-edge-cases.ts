// Semantik edge case'ler — motorun cümlenin MÜHENDİSLİK ANLAMINI okuyup
// okumadığını sınar. Bunlar karar kurallarını değil, ayrıştırma (parser)
// katmanını hedefler: yüzeysel anahtar kelime eşlemesi burada tuzağa düşer.
//
// Örnek tuzak: "standart doküman var ama kimse uygulamıyor" cümlesindeki
// 'standart ... var' ifadesini standardWorkEstablished = true diye okumak,
// gerçekte standardın FİİLEN olmadığı bir vakada SDCA'yı bastırır.

import type { SemanticCase } from "./types";

export const SEMANTIC_CASES: SemanticCase[] = [
  {
    id: "SEM1-standard-exists-but-unused",
    title: "Standart doküman var ama uygulanmıyor",
    text: "Montaj hattında standart iş talimatı var ama kimse uygulamıyor; her operatör kendi yöntemiyle çalışıyor.",
    mustExtract: { standardWorkEstablished: false },
    mustNotExtract: { standardWorkEstablished: true },
    trap:
      "Dokümanın varlığı standardın YERLEŞİK olduğu anlamına gelmez. Yüzeysel okuma SDCA'yı bastırır ve iyileştirmeyi olmayan bir tabanın üzerine kurar.",
  },
  {
    id: "SEM2-constraint-not-breakdown",
    title: "Arızalar olmasa da yetmiyor",
    text: "Bu makine hattın en düşük kapasiteli prosesi; arızalar olmasa da talebi karşılamıyor.",
    mustExtract: { bottleneckThroughput: true },
    mustNotExtract: { equipmentBreakdown: true },
    trap:
      "'Arızalar olmasa da' bir karşı-olgusal ifadedir, bildirilmiş bir arıza değil. Güvenilirlik kaybı ile yapısal kapasite kısıtı burada ayrılmalı.",
  },
  {
    id: "SEM3-risk-not-defect",
    title: "Henüz hata yok, sadece risk",
    text: "Henüz bir hata oluşmadı, sadece risk var. Yeni bir proses parametresi devreye alınacak.",
    mustExtract: { defectOccurred: false },
    mustNotExtract: { defectOccurred: true },
    trap: "'Hata' kelimesinin geçmesi hatanın gerçekleştiği anlamına gelmez; reaktif yöntemler boşta çalışır.",
  },
  {
    id: "SEM4-no-customer-complaint",
    title: "Müşteri şikâyeti gelmedi",
    text: "İç kontrolde yakaladık, müşteri şikâyeti gelmedi ve sevkiyat durdurulmadı.",
    mustExtract: { customerAffected: false },
    mustNotExtract: { customerAffected: true },
    trap: "'Müşteri' kelimesinin geçmesi müşterinin etkilendiği anlamına gelmez; 8D gereksiz yere tetiklenir.",
  },
  {
    id: "SEM5-investment-choice-not-breakdown",
    title: "Tezgâh yatırımı seçimi",
    text: "Yeni tezgâh yatırımı için üç teklif arasından seçim yapacağız; hangi tezgâhı alacağımıza karar vereceğiz.",
    mustExtract: { decisionBetweenOptions: true },
    mustNotExtract: { equipmentBreakdown: true, defectOccurred: true },
    trap:
      "'Tezgâh' geçtiği için ekipman arızası, 'yatırım' geçtiği için problem sanılmamalı. Bu bir teşhis değil, seçim problemidir.",
  },
  {
    id: "SEM6-cause-found",
    title: "Kök neden bulundu",
    text: "Kök nedenin ne olduğunu biliyoruz: fikstür aşınmış, ölçümle doğrulandı.",
    mustExtract: { rootCauseKnown: true },
    mustNotExtract: { rootCauseKnown: false },
    trap:
      "'Kök neden' ifadesinin geçmesi nedenin BİLİNMEDİĞİ anlamına gelmez. Yanlış okuma, biten bir analizi yeniden başlatır.",
  },
];
