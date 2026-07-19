// Problem Parser PORTU — serbest metni yapılandırılmış teşhis alanlarına çevirir.
// İLKE: uydurma yasak. Metinde açık delil yoksa alan null bırakılır (=> sorulur).

import { DiagnosticFeatureKey, Ternary } from "@/domain/diagnosis";

export interface InitialParse {
  processName: string | null;
  problemDescription: string | null;
  /** Yalnızca metinden GÜVENLE çıkarılan alanlar; gerisi yok (null kabul edilir). */
  features: Partial<Record<DiagnosticFeatureKey, Ternary>>;
}

export interface InterpretAnswerInput {
  featureKey: DiagnosticFeatureKey;
  questionTheme: string;
  answerText: string;
}

export interface IProblemParser {
  readonly name: string;
  /** İlk serbest metni yapılandırır. */
  parseInitial(text: string): Promise<InitialParse>;
  /** Bir soruya verilen serbest cevabı ilgili alanın değerine (true/false/null) çevirir. */
  interpretAnswer(input: InterpretAnswerInput): Promise<Ternary>;
}
