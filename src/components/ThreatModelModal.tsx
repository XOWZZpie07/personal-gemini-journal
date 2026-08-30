import React from "react";
import { ShieldCheck, Lock, Database, Cpu, Globe, Server, X } from "lucide-react";
import { ThreatSummaryItem } from "../types";

interface ThreatModelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const THREAT_MODEL_DATA: ThreatSummaryItem[] = [
  {
    zone: "1. Input Surfaces",
    risk: "Malicious prompt payloads, oversized buffers, script injection in journal text.",
    countermeasure: "Strict Express payload size limits (2MB), prompt string type validation, HTML escaping via React & React-Markdown sanitization.",
    status: "Enforced",
  },
  {
    zone: "2. Planning & Reasoning",
    risk: "Prompt injection attempting to override system instructions or extract keys.",
    countermeasure: "Rigid system prompt boundary encapsulation, role separation (system vs user/model parts), and deterministic mode definitions.",
    status: "Enforced",
  },
  {
    zone: "3. Tool & AI Execution",
    risk: "Single model downtime, rate limits, or unexpected API deprecation/outages.",
    countermeasure: "Multi-Model Fallback Ladder (gemini-2.5-flash -> gemini-3.6-flash -> gemini-3.1-flash-lite -> gemini-flash-latest -> gemini-3.7-flash) with error handling.",
    status: "Enforced",
  },
  {
    zone: "4. Memory & State (Firestore)",
    risk: "Cross-user data leakage, unauthenticated reads/writes, unauthorized entry modifications.",
    countermeasure: "Firestore Security Rules enforcing strict path isolation (/users/{userId}/entries/{entryId}) verified via request.auth.uid == userId.",
    status: "Enforced",
  },
  {
    zone: "5. Inter-System & Secrets",
    risk: "Exposure of GEMINI_API_KEY in client bundle or source control.",
    countermeasure: "Zero client-side secrets. Gemini SDK initialized exclusively server-side in Node.js/Express, consuming GEMINI_API_KEY from environment variables.",
    status: "Enforced",
  },
];

export const ThreatModelModal: React.FC<ThreatModelModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div id="modal-threat-model-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-[#E9ECEF] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[#E9ECEF] flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E7F3FF] border border-[#4A90E2]/20 flex items-center justify-center text-[#4A90E2]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#1A1C1E]">Agentic Threat Modeling & Security Architecture</h2>
              <p className="text-xs text-[#6C757D]">Defense-in-depth verification across the 5 Core Threat Zones</p>
            </div>
          </div>
          <button
            id="btn-close-threat-modal"
            onClick={onClose}
            className="p-2 rounded-lg text-[#6C757D] hover:text-[#1A1C1E] hover:bg-[#F1F3F5] transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#E9ECEF] flex items-start gap-3">
              <Lock className="w-5 h-5 text-[#4A90E2] shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-[#1A1C1E] uppercase tracking-wider">User Isolation</div>
                <div className="text-xs text-[#6C757D] mt-1">Firestore paths strictly checked by auth UID. Cross-tenant reads are blocked at database engine level.</div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#E9ECEF] flex items-start gap-3">
              <Server className="w-5 h-5 text-[#10B981] shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-[#1A1C1E] uppercase tracking-wider">Zero-Leak Backend</div>
                <div className="text-xs text-[#6C757D] mt-1">Gemini API keys never reach the browser. All inferences run through authenticated Node.js proxy.</div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#E9ECEF] flex items-start gap-3">
              <Cpu className="w-5 h-5 text-[#E67E22] shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-[#1A1C1E] uppercase tracking-wider">AI Fallback Ladder</div>
                <div className="text-xs text-[#6C757D] mt-1">Automatic failover across 5 Gemini models ensures high availability during transient spikes.</div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden border border-[#E9ECEF] rounded-xl bg-white">
            <table className="w-full text-left text-xs text-[#2D3436]">
              <thead className="bg-[#F8F9FA] text-[#6C757D] uppercase text-[10px] tracking-wider border-b border-[#E9ECEF]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Threat Zone</th>
                  <th className="py-3 px-4 font-semibold">Identified Risk</th>
                  <th className="py-3 px-4 font-semibold">Implemented Countermeasure</th>
                  <th className="py-3 px-4 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9ECEF]">
                {THREAT_MODEL_DATA.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#F8F9FA]/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-[#1A1C1E] whitespace-nowrap align-top">
                      {item.zone}
                    </td>
                    <td className="py-3.5 px-4 text-[#495057] align-top max-w-[220px]">
                      {item.risk}
                    </td>
                    <td className="py-3.5 px-4 text-[#6C757D] align-top">
                      {item.countermeasure}
                    </td>
                    <td className="py-3.5 px-4 text-right align-top whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-[#10B981] border border-emerald-200">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E9ECEF] bg-[#F8F9FA] flex items-center justify-between">
          <div className="text-[11px] text-[#6C757D]">
            Compliant with OWASP Top 10 for LLM Applications
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-white bg-[#4A90E2] hover:bg-[#357ABD] rounded-lg transition-colors shadow-2xs"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
