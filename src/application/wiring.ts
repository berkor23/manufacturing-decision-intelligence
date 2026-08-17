// Composition root — bağımlılıkları bir araya getirir (tek yer).
// Next dev HMR'de tekrar tekrar oluşmasın diye globalThis singleton.
// Servisler AYNI repository örneklerini paylaşır (in-memory tutarlılığı için).

import { DiagnosisService } from "./diagnosis-service";
import { ReportService } from "./report-service";
import { WorkspaceService } from "./workspace-service";
import { GuideService } from "./guide-service";
import { InMemoryConversationRepository } from "@/infrastructure/persistence/in-memory-conversation-repository";
import { InMemoryRcaRepository } from "@/infrastructure/persistence/in-memory-rca-repository";
import { InMemoryMethodologyWorkspaceRepository } from "@/infrastructure/persistence/in-memory-methodology-workspace-repository";
import { PrismaConversationRepository } from "@/infrastructure/persistence/prisma-conversation-repository";
import { PrismaRcaRepository } from "@/infrastructure/persistence/prisma-rca-repository";
import { PrismaMethodologyWorkspaceRepository } from "@/infrastructure/persistence/prisma-methodology-workspace-repository";
import { createAIProvider } from "@/infrastructure/ai/provider-factory";
import { createProblemParser } from "@/infrastructure/parser/parser-factory";
import { FileKnowledgeRepository } from "@/infrastructure/knowledge/file-knowledge-repository";
import { createAttachmentStorage } from "@/infrastructure/storage/storage-factory";
import { AccountService } from "./account-service";
import { PrismaAccountRepository } from "@/infrastructure/persistence/prisma-account-repository";
import { ScryptPasswordHasher } from "@/infrastructure/auth/scrypt-password-hasher";
import { WebhookEmailSender } from "@/infrastructure/email/webhook-email-sender";
import type { IConversationRepository } from "./ports/conversation-repository";
import type { IRcaRepository } from "./ports/rca-repository";
import type { IAttachmentStorage } from "./ports/attachment-storage";
import type { IProblemParser } from "./ports/problem-parser";

interface Container {
  conversationRepo: IConversationRepository;
  rcaRepo: IRcaRepository;
  diagnosisService: DiagnosisService;
  reportService: ReportService;
  workspaceService: WorkspaceService;
  guideService: GuideService;
  attachmentStorage: IAttachmentStorage;
  accountService: AccountService;
  problemParser: IProblemParser;
}

const g = globalThis as unknown as { __mdiContainer?: Container };

function container(): Container {
  if (!g.__mdiContainer) {
    const ai = createAIProvider();
    const parser = createProblemParser(ai);
    // Kalıcılık seçimi: PERSISTENCE=prisma (Postgres) | memory (varsayılan)
    const usePrisma = (process.env.PERSISTENCE ?? "memory").toLowerCase() === "prisma";
    // Kiracılık sahiplik sütunlarına dayanır; bunlar yalnız Postgres'te vardır.
    // Bellek kalıcılığıyla hesap sistemi açılırsa kayıt bellekte oluşur ama
    // sahiplik/erişim kontrolü Postgres'te aranır: her kayıt sahipsiz görünür
    // ve oluşturma uçları hata verir. Sessiz yanlışlık yerine açık hata.
    if (!usePrisma && process.env.ACCOUNT_AUTH_ENABLED === "1") {
      throw new Error(
        "ACCOUNT_AUTH_ENABLED=1 için PERSISTENCE=prisma gerekir: hesap ve kiracılık verisi bellek kalıcılığında tutulamaz.",
      );
    }
    const conversationRepo = usePrisma
      ? new PrismaConversationRepository()
      : new InMemoryConversationRepository();
    const rcaRepo = usePrisma ? new PrismaRcaRepository() : new InMemoryRcaRepository();
    const workspaceRepo = usePrisma
      ? new PrismaMethodologyWorkspaceRepository()
      : new InMemoryMethodologyWorkspaceRepository();
    const knowledge = new FileKnowledgeRepository();

    g.__mdiContainer = {
      conversationRepo,
      rcaRepo,
      diagnosisService: new DiagnosisService(conversationRepo, parser),
      reportService: new ReportService(conversationRepo, knowledge, ai),
      workspaceService: new WorkspaceService(workspaceRepo, knowledge, ai),
      guideService: new GuideService(ai, knowledge),
      attachmentStorage: createAttachmentStorage(),
      // Hesap akışları yalnız Postgres'te anlamlıdır; bellek kalıcılığıyla
      // birlikte hesap sistemi zaten yukarıda reddediliyor.
      accountService: new AccountService(
        new PrismaAccountRepository(),
        new ScryptPasswordHasher(),
        new WebhookEmailSender(),
      ),
      problemParser: parser,
    };
  }
  return g.__mdiContainer;
}

export const getDiagnosisService = () => container().diagnosisService;
export const getReportService = () => container().reportService;
export const getRcaRepository = () => container().rcaRepo;
export const getWorkspaceService = () => container().workspaceService;
export const getGuideService = () => container().guideService;
export const getAttachmentStorage = () => container().attachmentStorage;
export const getAccountService = () => container().accountService;
export const getProblemParser = () => container().problemParser;
