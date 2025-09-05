import React, { useMemo, useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { motion } from "framer-motion";
import { Search, ShieldCheck, ShieldAlert, QrCode, Factory, Calendar, Building2, Layers, RefreshCw, Printer, ScanLine, CheckCircle2, TriangleAlert } from "lucide-react";

// --- Mock "blockchain" ledger (for demo) ---
// In production, these rows would be on-chain events; here we simulate immutable records.
const mockLedger = [
  {
    id: "MED-001",
    name: "Paracetamol 500mg (10 tabs)",
    batch: "B456789",
    mfg: "2025-09-01",
    exp: "2027-08-31",
    manufacturer: "XYZ Pharma Pvt Ltd",
    supplier: "Sunrise Distributors",
    shop: "Sahil Medicals (Chembur)",
    checksum: "f9a2",
    status: "active",
  },
  {
    id: "MED-002",
    name: "Amoxicillin 250mg (10 caps)",
    batch: "B984321",
    mfg: "2025-08-12",
    exp: "2027-07-31",
    manufacturer: "HealthCore Labs",
    supplier: "MedRoute Logistics",
    shop: "Sahil Medicals (Chembur)",
    checksum: "7c3d",
    status: "active",
  },
  {
    id: "MED-003",
    name: "Cetirizine 10mg (10 tabs)",
    batch: "C772210",
    mfg: "2025-07-05",
    exp: "2027-06-30",
    manufacturer: "Allied Remedies",
    supplier: "TrustMed Supply Co.",
    shop: "Sahil Medicals (Chembur)",
    checksum: "11be",
    status: "active",
  },
  {
    id: "MED-004",
    name: "Ibuprofen 200mg (10 tabs)",
    batch: "I220015",
    mfg: "2025-06-18",
    exp: "2027-06-17",
    manufacturer: "NovaRx Industries",
    supplier: "Lifeline Distributors",
    shop: "Sahil Medicals (Chembur)",
    checksum: "c0de",
    status: "recalled", // demonstrate a recall/tamper scenario
  },
];

// Encode a compact token that goes into QR (simulate signed payload)
function encodeToken(row) {
  // payload contains minimal fields; checksum simulates a signature fragment
  const payload = {
    t: "REDSTEEP-DEMO",
    id: row.id,
    b: row.batch,
    c: row.checksum,
  };
  return btoa(JSON.stringify(payload));
}

function decodeToken(token) {
  try {
    const json = JSON.parse(atob(token));
    if (!json || json.t !== "REDSTEEP-DEMO") return null;
    return json;
  } catch (e) {
    return null;
  }
}

// Simple in-memory duplicate scan detection (for demo only)
const scanned = new Set();

export default function RedsteepMedicineAuthPrototype() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [verifyInput, setVerifyInput] = useState("");
  const [verifyResult, setVerifyResult] = useState(null);
  const [duplicateFlag, setDuplicateFlag] = useState(false);

  const ledger = useMemo(() => {
    const rows = mockLedger.map((r) => ({ ...r, token: encodeToken(r) }));
    return rows.filter((r) => {
      const matchesText =
        query.trim().length === 0 ||
        r.name.toLowerCase().includes(query.toLowerCase()) ||
        r.id.toLowerCase().includes(query.toLowerCase()) ||
        r.batch.toLowerCase().includes(query.toLowerCase());
      const matchesFilter = filter === "all" ? true : r.status === filter;
      return matchesText && matchesFilter;
    });
  }, [query, filter]);

  function handleVerify(token) {
    setDuplicateFlag(false);
    const decoded = decodeToken(token.trim());
    if (!decoded) {
      setVerifyResult({ ok: false, reason: "Invalid or corrupted QR payload." });
      return;
    }
    const match = mockLedger.find(
      (r) => r.id === decoded.id && r.batch === decoded.b && r.checksum === decoded.c
    );
    if (!match) {
      setVerifyResult({ ok: false, reason: "No matching batch on ledger (possible counterfeit)." });
      return;
    }
    // Simulate duplicate scan detection
    const key = `${decoded.id}-${decoded.b}-${decoded.c}`;
    if (scanned.has(key)) {
      setDuplicateFlag(true);
    } else {
      scanned.add(key);
    }

    // Business rules: if recalled/expired -> not OK
    const now = new Date();
    const exp = new Date(match.exp + "T23:59:59");
    const isExpired = now > exp;
    if (match.status === "recalled") {
      setVerifyResult({ ok: false, reason: "Batch is recalled by manufacturer." , data: match});
      return;
    }
    if (isExpired) {
      setVerifyResult({ ok: false, reason: "Medicine is expired." , data: match});
      return;
    }

    setVerifyResult({ ok: true, data: match });
  }

  useEffect(() => {
    // Autofill verify box with first item's token for quick demo
    if (ledger.length && !verifyInput) setVerifyInput(ledger[0].token);
  }, [ledger]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Redsteep — Medicine Authenticity (Demo)</h1>
            <p className="text-gray-600 mt-1">Lightweight blockchain-style prototype with QR verification for your medical shop.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl shadow bg-white">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl shadow bg-white print:hidden">
              <Printer className="w-4 h-4" /> Print QR Labels
            </button>
          </div>
        </header>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="col-span-2 flex items-center gap-3 bg-white rounded-2xl p-3 shadow">
            <Search className="w-5 h-5 text-gray-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, ID, or batch..."
              className="w-full outline-none"
            />
          </div>
          <div className="bg-white rounded-2xl p-3 shadow flex items-center justify-between">
            <span className="text-sm text-gray-600">Filter</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="recalled">Recalled</option>
            </select>
          </div>
        </div>

        {/* Ledger grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 print:grid-cols-2">
          {ledger.map((row) => (
            <motion.div
              key={row.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow p-4 space-y-3 break-inside-avoid"
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold text-lg flex items-center gap-2"><Layers className="w-4 h-4" /> {row.name}</div>
                {row.status === "active" ? (
                  <span className="inline-flex items-center gap-1 text-sm text-green-700 bg-green-50 px-2 py-1 rounded-xl"><ShieldCheck className="w-4 h-4"/> Active</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-sm text-red-700 bg-red-50 px-2 py-1 rounded-xl"><ShieldAlert className="w-4 h-4"/> Recalled</span>
                )}
              </div>

              <div className="text-sm grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 text-gray-700"><Factory className="w-4 h-4"/> {row.manufacturer}</div>
                <div className="flex items-center gap-2 text-gray-700"><Building2 className="w-4 h-4"/> {row.supplier}</div>
                <div className="flex items-center gap-2 text-gray-700"><Calendar className="w-4 h-4"/> MFG {row.mfg}</div>
                <div className="flex items-center gap-2 text-gray-700"><Calendar className="w-4 h-4"/> EXP {row.exp}</div>
                <div className="text-gray-700">ID: {row.id}</div>
                <div className="text-gray-700">Batch: {row.batch}</div>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-gray-50 rounded-xl p-2 w-fit">
                  <QRCodeCanvas value={row.token} size={120} includeMargin={true} />
                </div>
                <div className="text-xs text-gray-600 break-all">
                  <div className="font-medium">QR Payload</div>
                  <code className="text-[11px]">{row.token}</code>
                </div>
              </div>

              <div className="text-xs text-gray-500">Shop: {row.shop}</div>
            </motion.div>
          ))}
        </section>

        {/* Verification box */}
        <section className="bg-white rounded-2xl shadow p-5 space-y-4">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5"/>
            <h2 className="text-xl font-semibold">Verify a Medicine</h2>
          </div>
          <p className="text-gray-600 text-sm">Paste a scanned QR payload here (or use one shown above). This simulates on-chain verification and business rules (recall/expiry + duplicate scan alerts).</p>

          <div className="flex flex-col md:flex-row gap-3">
            <input
              value={verifyInput}
              onChange={(e) => setVerifyInput(e.target.value)}
              placeholder="Paste QR payload (base64)..."
              className="flex-1 px-3 py-2 rounded-xl border"
            />
            <button onClick={() => handleVerify(verifyInput)} className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-black text-white">
              <ScanLine className="w-4 h-4"/> Verify
            </button>
          </div>

          {verifyResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`rounded-2xl p-4 border ${verifyResult.ok ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
            >
              {verifyResult.ok ? (
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6"/>
                  <div>
                    <div className="font-semibold">Authentic Medicine</div>
                    <div className="text-sm text-gray-700">Verified on ledger with matching ID, batch and signature fragment.</div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-800">
                      <div><span className="text-gray-500">Name:</span> {verifyResult.data.name}</div>
                      <div><span className="text-gray-500">Batch:</span> {verifyResult.data.batch}</div>
                      <div><span className="text-gray-500">Manufacturer:</span> {verifyResult.data.manufacturer}</div>
                      <div><span className="text-gray-500">Supplier:</span> {verifyResult.data.supplier}</div>
                      <div><span className="text-gray-500">MFG:</span> {verifyResult.data.mfg}</div>
                      <div><span className="text-gray-500">EXP:</span> {verifyResult.data.exp}</div>
                    </div>
                    {duplicateFlag && (
                      <div className="mt-3 inline-flex items-center gap-2 text-amber-800 bg-amber-100 px-2 py-1 rounded-xl text-xs">
                        <TriangleAlert className="w-4 h-4"/> Duplicate scan detected — consider checking for label reuse.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-6 h-6"/>
                  <div>
                    <div className="font-semibold">Verification Failed</div>
                    <div className="text-sm text-gray-700">{verifyResult.reason}</div>
                    {verifyResult.data && (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-800">
                        <div><span className="text-gray-500">Name:</span> {verifyResult.data.name}</div>
                        <div><span className="text-gray-500">Batch:</span> {verifyResult.data.batch}</div>
                        <div><span className="text-gray-500">Status:</span> {verifyResult.data.status}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </section>

        {/* Implementation notes */}
        <section className="text-sm text-gray-600">
          <h3 className="font-semibold mb-2">Implementation Notes (What goes on-chain?)</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li><span className="font-medium">On-chain:</span> Batch hash (ID+batch+manufacturer+exp), status events (minted, transferred, received, recalled), and a short signature fragment.</li>
            <li><span className="font-medium">Off-chain:</span> Human-readable details (name, mfg/exp dates), QR image, and analytics. Hash links ensure tamper-evidence.</li>
            <li><span className="font-medium">Security:</span> Each QR maps to a unique token; duplicate scans raise alerts. Revocation events (recall/expiry) flip verification instantly.</li>
            <li><span className="font-medium">Next steps:</span> Connect to a testnet (e.g., Polygon/Arbitrum), add wallet-based signing for batch creation, and role-based access (Manufacturer/Distributor/Shop).</li>
          </ul>
        </section>
      </div>

      <style>{`
        @media print {
          header, .print\\:hidden, section:not(:first-of-type) { display: none !important; }
          section { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
