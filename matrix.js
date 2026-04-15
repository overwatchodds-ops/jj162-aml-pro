// ─── AUSTRAC TASK MATRIX ─────────────────────────────────────────────────────
// Source: AUSTRAC Table 6 mapped to accounting firm services.
// 57 rows: 34 IN, 22 OUT, 1 GREY ZONE.
// table6_items: extracted item numbers for risk pattern lookup.
// explicit: true = synonyms from spreadsheet, false = derived from task name.
// Update only when AUSTRAC releases new rules.

export const MATRIX = [
  {
    "id": 0,
    "category": "1. Corporate Secretarial & Entity Setup",
    "task": "Company Incorporation",
    "table6": "Item 7 (Formation Agent)",
    "table6_items": [
      7
    ],
    "status": "IN",
    "synonyms": [
      "set up company",
      "register company",
      "incorporate pty ltd",
      "new company registration",
      "asic company setup"
    ],
    "explicit": true
  },
  {
    "id": 1,
    "category": "1. Corporate Secretarial & Entity Setup",
    "task": "Trust Deed Establishment (Family, Unit, etc.)",
    "table6": "Item 7 (Formation Agent)",
    "table6_items": [
      7
    ],
    "status": "IN",
    "synonyms": [
      "set up trust",
      "create trust",
      "establish family trust",
      "unit trust setup",
      "draft trust deed"
    ],
    "explicit": true
  },
  {
    "id": 2,
    "category": "1. Corporate Secretarial & Entity Setup",
    "task": "Providing a Registered Office Address",
    "table6": "Item 9 (Registered Office)",
    "table6_items": [
      9
    ],
    "status": "IN",
    "synonyms": [
      "registered office",
      "use our address",
      "company registered address",
      "asic address"
    ],
    "explicit": true
  },
  {
    "id": 3,
    "category": "1. Corporate Secretarial & Entity Setup",
    "task": "Providing a Business Correspondence Address",
    "table6": "Item 9 (Registered Office)",
    "table6_items": [
      9
    ],
    "status": "IN",
    "synonyms": [
      "mailing address",
      "business address",
      "correspondence address",
      "virtual office address"
    ],
    "explicit": true
  },
  {
    "id": 4,
    "category": "1. Corporate Secretarial & Entity Setup",
    "task": "Acting as Company Secretary",
    "table6": "Item 8 (Nominee/Specified Roles)",
    "table6_items": [
      8
    ],
    "status": "IN",
    "synonyms": [
      "company secretarial role",
      "corporate secretary",
      "act as cosec",
      "secretarial services"
    ],
    "explicit": true
  },
  {
    "id": 5,
    "category": "1. Corporate Secretarial & Entity Setup",
    "task": "Appointing a Nominee Director/Shareholder",
    "table6": "Item 8 (Nominee/Specified Roles)",
    "table6_items": [
      8
    ],
    "status": "IN",
    "synonyms": [
      "nominee director",
      "nominee shareholder",
      "straw director",
      "third party director"
    ],
    "explicit": true
  },
  {
    "id": 6,
    "category": "1. Corporate Secretarial & Entity Setup",
    "task": "Updating ASIC Records (Share transfers, director changes, etc.)",
    "table6": "Item 6 (Managing Entities)",
    "table6_items": [
      6
    ],
    "status": "IN",
    "synonyms": [
      "asic updates",
      "change director",
      "share transfer",
      "update company details",
      "form 484"
    ],
    "explicit": true
  },
  {
    "id": 7,
    "category": "1. Corporate Secretarial & Entity Setup",
    "task": "Drafting Shareholder Agreements",
    "table6": "Item 6 (Managing Entities)",
    "table6_items": [
      6
    ],
    "status": "IN",
    "synonyms": [
      "shareholder agreement",
      "sha drafting",
      "owners agreement",
      "equity agreement"
    ],
    "explicit": true
  },
  {
    "id": 8,
    "category": "1. Corporate Secretarial & Entity Setup",
    "task": "Drafting Director Resolutions",
    "table6": "Item 6 (Managing Entities)",
    "table6_items": [
      6
    ],
    "status": "IN",
    "synonyms": [
      "director resolution",
      "board resolution",
      "minutes drafting",
      "company minutes"
    ],
    "explicit": true
  },
  {
    "id": 9,
    "category": "1. Corporate Secretarial & Entity Setup",
    "task": "Changing Company Constitution",
    "table6": "Item 6 (Managing Entities)",
    "table6_items": [
      6
    ],
    "status": "IN",
    "synonyms": [
      "amend constitution",
      "update constitution",
      "replace constitution"
    ],
    "explicit": true
  },
  {
    "id": 10,
    "category": "1. Corporate Secretarial & Entity Setup",
    "task": "Filing ASIC Forms (officeholder updates, annual review)",
    "table6": "Item 6 (Managing Entities)",
    "table6_items": [
      6
    ],
    "status": "IN",
    "synonyms": [
      "asic",
      "forms",
      "officeholder",
      "updates",
      "annual",
      "review"
    ],
    "explicit": false
  },
  {
    "id": 11,
    "category": "1. Corporate Secretarial & Entity Setup",
    "task": "Drafting Trust Amendments / Variations",
    "table6": "Item 6 (Managing Entities)",
    "table6_items": [
      6
    ],
    "status": "IN",
    "synonyms": [
      "amendments",
      "variations"
    ],
    "explicit": false
  },
  {
    "id": 12,
    "category": "2. Daily Bookkeeping & Treasury",
    "task": "Signatory on Client Bank Account",
    "table6": "Item 4 (Managing Accounts)",
    "table6_items": [
      4
    ],
    "status": "IN",
    "synonyms": [
      "bank signatory",
      "payment authority",
      "bank access",
      "operate bank account"
    ],
    "explicit": true
  },
  {
    "id": 13,
    "category": "2. Daily Bookkeeping & Treasury",
    "task": "Processing Payroll Payments (ABA upload / auth)",
    "table6": "Item 4 (Managing Accounts)",
    "table6_items": [
      4
    ],
    "status": "IN",
    "synonyms": [
      "payroll aba",
      "upload aba",
      "pay wages",
      "process payroll payments",
      "payroll payments",
      "aba upload",
      "pay staff"
    ],
    "explicit": true
  },
  {
    "id": 14,
    "category": "2. Daily Bookkeeping & Treasury",
    "task": "Paying Supplier Invoices (Authority to spend)",
    "table6": "Item 4 (Managing Accounts)",
    "table6_items": [
      4
    ],
    "status": "IN",
    "synonyms": [
      "pay bills",
      "supplier payments",
      "accounts payable payments",
      "aba creditors"
    ],
    "explicit": true
  },
  {
    "id": 15,
    "category": "2. Daily Bookkeeping & Treasury",
    "task": "Managing a Trust Account",
    "table6": "Item 3 (Managing Assets)",
    "table6_items": [
      3
    ],
    "status": "IN",
    "synonyms": [
      "trust account handling",
      "hold client funds",
      "operate trust account"
    ],
    "explicit": true
  },
  {
    "id": 16,
    "category": "2. Daily Bookkeeping & Treasury",
    "task": "Petty Cash Management (Cash on Hand)",
    "table6": "Item 3 (Managing Assets)",
    "table6_items": [
      3
    ],
    "status": "IN",
    "synonyms": [
      "petty",
      "cash",
      "management",
      "cash",
      "hand"
    ],
    "explicit": false
  },
  {
    "id": 17,
    "category": "2. Daily Bookkeeping & Treasury",
    "task": "Credit Card Payments on Client Behalf",
    "table6": "Item 4 (Managing Accounts)",
    "table6_items": [
      4
    ],
    "status": "IN",
    "synonyms": [
      "credit card payments",
      "pay with credit card",
      "credit card on behalf"
    ],
    "explicit": true
  },
  {
    "id": 18,
    "category": "2. Daily Bookkeeping & Treasury",
    "task": "Reconciling Loan / Financing Accounts",
    "table6": "Item 3 (Managing Assets)",
    "table6_items": [
      3
    ],
    "status": "IN",
    "synonyms": [
      "loan",
      "financing",
      "accounts"
    ],
    "explicit": false
  },
  {
    "id": 19,
    "category": "2. Daily Bookkeeping & Treasury",
    "task": "Authorising Payment Runs (Client Funds)",
    "table6": "Item 4 (Managing Accounts)",
    "table6_items": [
      4
    ],
    "status": "IN",
    "synonyms": [
      "authorise payment runs",
      "authorize payment runs",
      "payment run authorisation",
      "approve payment runs"
    ],
    "explicit": true
  },
  {
    "id": 20,
    "category": "2. Daily Bookkeeping & Treasury",
    "task": "Processing Refunds / Rebates",
    "table6": "Item 4 (Managing Accounts)",
    "table6_items": [
      4
    ],
    "status": "IN",
    "synonyms": [
      "refunds",
      "rebates"
    ],
    "explicit": false
  },
  {
    "id": 21,
    "category": "2. Daily Bookkeeping & Treasury",
    "task": "Bank Reconciliations (Read-only access)",
    "table6": "",
    "table6_items": [],
    "status": "OUT",
    "synonyms": [
      "bank recs",
      "reconcile bank",
      "bank reconciliation work"
    ],
    "explicit": true
  },
  {
    "id": 22,
    "category": "2. Daily Bookkeeping & Treasury",
    "task": "Data Entry / Accounts Receivable (Invoicing only)",
    "table6": "",
    "table6_items": [],
    "status": "OUT",
    "synonyms": [
      "invoicing",
      "raise invoices",
      "accounts receivable entry",
      "debtor entry"
    ],
    "explicit": true
  },
  {
    "id": 23,
    "category": "2. Daily Bookkeeping & Treasury",
    "task": "Generating Reports (Read-only)",
    "table6": "",
    "table6_items": [],
    "status": "OUT",
    "synonyms": [
      "read"
    ],
    "explicit": false
  },
  {
    "id": 24,
    "category": "2. Daily Bookkeeping & Treasury",
    "task": "Payroll Processing without fund movement",
    "table6": "",
    "table6_items": [],
    "status": "OUT",
    "synonyms": [
      "payroll",
      "movement"
    ],
    "explicit": false
  },
  {
    "id": 25,
    "category": "2. Daily Bookkeeping & Treasury",
    "task": "BAS / GST Calculation (no payment authority)",
    "table6": "",
    "table6_items": [],
    "status": "OUT",
    "synonyms": [
      "calculation",
      "payment",
      "authority"
    ],
    "explicit": false
  },
  {
    "id": 26,
    "category": "3. Advisory & Business Transactions",
    "task": "Assisting in a Business Sale (M&A)",
    "table6": "Item 2 (Buying/Selling Entities)",
    "table6_items": [
      2
    ],
    "status": "IN",
    "synonyms": [
      "sell business",
      "m&a support",
      "business disposal",
      "sale mandate"
    ],
    "explicit": true
  },
  {
    "id": 27,
    "category": "3. Advisory & Business Transactions",
    "task": "Helping a Client Buy a Business / Trust",
    "table6": "Item 2 (Buying/Selling Entities)",
    "table6_items": [
      2
    ],
    "status": "IN",
    "synonyms": [],
    "explicit": false
  },
  {
    "id": 28,
    "category": "3. Advisory & Business Transactions",
    "task": "Organizing Debt / Equity Funding (Capital raising)",
    "table6": "Item 5 (Contributions / Financing)",
    "table6_items": [
      5
    ],
    "status": "IN",
    "synonyms": [
      "debt",
      "equity",
      "funding",
      "capital",
      "raising"
    ],
    "explicit": false
  },
  {
    "id": 29,
    "category": "3. Advisory & Business Transactions",
    "task": "Assisting in Property Settlement / Transfer",
    "table6": "Item 1 (Real Estate Transactions)",
    "table6_items": [
      1
    ],
    "status": "IN",
    "synonyms": [
      "property",
      "settlement",
      "transfer"
    ],
    "explicit": false
  },
  {
    "id": 30,
    "category": "3. Advisory & Business Transactions",
    "task": "Drafting Deeds / Legal Documents for Transactions",
    "table6": "Item 6 / 7 (Managing Entities / Formation Agent)",
    "table6_items": [
      6
    ],
    "status": "IN",
    "synonyms": [
      "deeds",
      "legal",
      "documents",
      "transactions"
    ],
    "explicit": false
  },
  {
    "id": 31,
    "category": "3. Advisory & Business Transactions",
    "task": "Facilitating Client Signatures / Execution of Documents",
    "table6": "Item 7 (Formation Agent)",
    "table6_items": [
      7
    ],
    "status": "IN",
    "synonyms": [
      "signatures",
      "documents"
    ],
    "explicit": false
  },
  {
    "id": 32,
    "category": "3. Advisory & Business Transactions",
    "task": "Valuation Reports – Tax/Internal Reporting Only",
    "table6": "",
    "table6_items": [],
    "status": "OUT",
    "synonyms": [
      "valuation",
      "reporting"
    ],
    "explicit": false
  },
  {
    "id": 33,
    "category": "3. Advisory & Business Transactions",
    "task": "Valuation Reports – Transaction Execution (part of deal)",
    "table6": "Item 2 (Buying/Selling Entities)",
    "table6_items": [
      2
    ],
    "status": "GREY ZONE / IN (context dependent)",
    "synonyms": [
      "valuation",
      "transaction"
    ],
    "explicit": false
  },
  {
    "id": 34,
    "category": "3. Advisory & Business Transactions",
    "task": "General Strategic Advice (No implementation)",
    "table6": "",
    "table6_items": [],
    "status": "OUT",
    "synonyms": [
      "advisory only",
      "strategy advice",
      "consulting only",
      "no implementation"
    ],
    "explicit": true
  },
  {
    "id": 35,
    "category": "3. Advisory & Business Transactions",
    "task": "Business Valuation (Stand-alone report)",
    "table6": "",
    "table6_items": [],
    "status": "OUT",
    "synonyms": [
      "valuation report",
      "business appraisal",
      "company valuation",
      "valuation certificate"
    ],
    "explicit": true
  },
  {
    "id": 36,
    "category": "3. Advisory & Business Transactions",
    "task": "Advising on Structuring a New Company / Trust (No execution)",
    "table6": "",
    "table6_items": [],
    "status": "OUT",
    "synonyms": [
      "structuring"
    ],
    "explicit": false
  },
  {
    "id": 37,
    "category": "3. Advisory & Business Transactions",
    "task": "Preparing Loan / Funding Agreements (Execution)",
    "table6": "Item 5 (Contributions / Financing)",
    "table6_items": [
      5
    ],
    "status": "IN",
    "synonyms": [
      "loan",
      "funding",
      "agreements"
    ],
    "explicit": false
  },
  {
    "id": 38,
    "category": "3. Advisory & Business Transactions",
    "task": "Negotiating Contracts on Client’s Behalf",
    "table6": "Item 2 (Buying/Selling Entities)",
    "table6_items": [
      2
    ],
    "status": "IN",
    "synonyms": [
      "contracts",
      "client’s",
      "behalf"
    ],
    "explicit": false
  },
  {
    "id": 39,
    "category": "4. General Compliance (Safe Zone)",
    "task": "Income Tax Return Preparation (ITR)",
    "table6": "",
    "table6_items": [],
    "status": "OUT",
    "synonyms": [
      "tax return",
      "itr prep",
      "lodge tax return",
      "tax compliance"
    ],
    "explicit": true
  },
  {
    "id": 40,
    "category": "4. General Compliance (Safe Zone)",
    "task": "BAS / IAS Preparation & Lodgement",
    "table6": "",
    "table6_items": [],
    "status": "OUT",
    "synonyms": [
      "bas prep",
      "ias prep",
      "bas lodge",
      "gst reporting"
    ],
    "explicit": true
  },
  {
    "id": 41,
    "category": "4. General Compliance (Safe Zone)",
    "task": "FBT / Payroll Tax Compliance (Reporting only)",
    "table6": "",
    "table6_items": [],
    "status": "OUT",
    "synonyms": [
      "fbt return",
      "payroll tax return",
      "state tax compliance"
    ],
    "explicit": true
  },
  {
    "id": 42,
    "category": "4. General Compliance (Safe Zone)",
    "task": "Financial Statement Preparation",
    "table6": "",
    "table6_items": [],
    "status": "OUT",
    "synonyms": [
      "prepare financials",
      "annual accounts",
      "financial reports"
    ],
    "explicit": true
  },
  {
    "id": 43,
    "category": "4. General Compliance (Safe Zone)",
    "task": "External Audit / SMSF Audit",
    "table6": "",
    "table6_items": [],
    "status": "OUT",
    "synonyms": [
      "audit services",
      "smsf audit",
      "independent audit"
    ],
    "explicit": true
  },
  {
    "id": 44,
    "category": "4. General Compliance (Safe Zone)",
    "task": "Bookkeeping / Accounting for Reporting Only",
    "table6": "",
    "table6_items": [],
    "status": "OUT",
    "synonyms": [
      "bookkeeping",
      "accounting",
      "reporting"
    ],
    "explicit": false
  },
  {
    "id": 45,
    "category": "4. General Compliance (Safe Zone)",
    "task": "Advisory on Tax Planning / Structuring (no execution)",
    "table6": "",
    "table6_items": [],
    "status": "OUT",
    "synonyms": [
      "advisory",
      "planning",
      "structuring"
    ],
    "explicit": false
  },
  {
    "id": 46,
    "category": "4. General Compliance (Safe Zone)",
    "task": "Preparing Compliance Checklists & Reports",
    "table6": "",
    "table6_items": [],
    "status": "OUT",
    "synonyms": [
      "compliance",
      "checklists"
    ],
    "explicit": false
  },
  {
    "id": 47,
    "category": "4. General Compliance (Safe Zone)",
    "task": "Payroll Calculations Only (no payments)",
    "table6": "",
    "table6_items": [],
    "status": "OUT",
    "synonyms": [
      "payroll",
      "calculations",
      "payments"
    ],
    "explicit": false
  },
  {
    "id": 48,
    "category": "4. General Compliance (Safe Zone)",
    "task": "Superannuation Compliance (employer reporting only)",
    "table6": "",
    "table6_items": [],
    "status": "OUT",
    "synonyms": [
      "superannuation",
      "compliance",
      "employer",
      "reporting"
    ],
    "explicit": false
  },
  {
    "id": 49,
    "category": "4. General Compliance (Safe Zone)",
    "task": "FBT / Payroll Tax Reporting Only",
    "table6": "",
    "table6_items": [],
    "status": "OUT",
    "synonyms": [
      "payroll",
      "reporting"
    ],
    "explicit": false
  },
  {
    "id": 50,
    "category": "4. General Compliance (Safe Zone)",
    "task": "Insolvency Advisory / Reporting (Non-Court)",
    "table6": "",
    "table6_items": [],
    "status": "OUT",
    "synonyms": [
      "insolvency",
      "advisory",
      "reporting",
      "court"
    ],
    "explicit": false
  },
  {
    "id": 51,
    "category": "5. Entity / Trust Administration",
    "task": "Acting as Court-appointed Trustee / Receiver",
    "table6": "Item 3 (Managing Assets)",
    "table6_items": [
      3
    ],
    "status": "IN",
    "synonyms": [
      "court",
      "appointed",
      "trustee",
      "receiver"
    ],
    "explicit": false
  },
  {
    "id": 52,
    "category": "5. Entity / Trust Administration",
    "task": "Acting as Voluntary Liquidator / External Administrator (fund control)",
    "table6": "Item 3 (Managing Assets)",
    "table6_items": [
      3
    ],
    "status": "IN",
    "synonyms": [
      "voluntary",
      "liquidator",
      "administrator",
      "control"
    ],
    "explicit": false
  },
  {
    "id": 53,
    "category": "5. Entity / Trust Administration",
    "task": "Administering Client Trust Funds (Execution authority)",
    "table6": "Item 3 (Managing Assets)",
    "table6_items": [
      3
    ],
    "status": "IN",
    "synonyms": [
      "administer trust funds",
      "execution authority trust",
      "manage trust funds",
      "disburse trust funds"
    ],
    "explicit": true
  },
  {
    "id": 54,
    "category": "5. Entity / Trust Administration",
    "task": "Signing Contracts or Authorizing Payments on Behalf of Clients",
    "table6": "Item 4 (Managing Accounts)",
    "table6_items": [
      4
    ],
    "status": "IN",
    "synonyms": [
      "sign contracts on behalf",
      "signing contracts client",
      "authorise payments behalf",
      "authorize payments behalf",
      "sign on behalf of client"
    ],
    "explicit": true
  },
  {
    "id": 55,
    "category": "5. Entity / Trust Administration",
    "task": "Holding Securities or Assets for Clients",
    "table6": "Item 3 (Managing Assets)",
    "table6_items": [
      3
    ],
    "status": "IN",
    "synonyms": [
      "securities",
      "assets"
    ],
    "explicit": false
  },
  {
    "id": 56,
    "category": "5. Entity / Trust Administration",
    "task": "Preparing Reports Only (No fund control)",
    "table6": "",
    "table6_items": [],
    "status": "OUT",
    "synonyms": [
      "control"
    ],
    "explicit": false
  }
];

// ─── TABLE 6 RISK PATTERNS ────────────────────────────────────────────────────
// One risk pattern per Table 6 item (1–9).
// Keyed by item number. Used after classification to render ML/TF risk screen.
export const TABLE6_RISKS = {
  "1": "Your firm may be used as a trusted referrer to introduce clients to financial, legal or corporate services in a way that distances the client from scrutiny and enables placement or layering of illicit funds through third parties.",
  "2": "Your firm may be involved in transactions where ownership of businesses or entities is transferred in a way that disguises the origin of funds, inflates or deflates valuations, or facilitates the integration of illicit funds into legitimate commercial structures.",
  "3": "Your firm may be used to move, hold, or disburse funds on behalf of clients, creating opportunities for layering, obscuring transaction trails, or transferring illicit funds under the cover of legitimate accounting activity.",
  "4": "Your firm may be relied upon to administer payments, payroll, expenses, or financial obligations that could be used to transfer value, settle illicit obligations, or disguise the true purpose and destination of funds.",
  "5": "Your firm may be involved in property transactions that enable the placement or integration of illicit funds into real assets, particularly where ownership structures or sources of funds are not transparent.",
  "6": "Your firm may act in a capacity that obscures the identity of the true beneficial owner or controller of assets, companies, or trusts, enabling anonymity and concealment of illicit interests.",
  "7": "Your firm may create legal structures that can be used as shell entities or complex ownership arrangements designed to conceal beneficial ownership, layer transactions, or distance individuals from illicit funds.",
  "8": "Your firm may provide legitimacy and an administrative presence to entities that are used to disguise true control, maintain anonymity, or facilitate ongoing illicit financial activity.",
  "9": "Your firm's address or business presence may be used to lend credibility to entities that exist primarily to obscure ownership, create false legitimacy, or support illicit financial flows."
};

// ─── TABLE 6 LABELS ───────────────────────────────────────────────────────────
// Human-readable label per Table 6 item for display.
export const TABLE6_LABELS = {
  "1": "Item 1 \u2014 Arranging introductions for designated services",
  "2": "Item 2 \u2014 Assisting in the sale or purchase of a business or company",
  "3": "Item 3 \u2014 Opening or operating accounts, managing client money",
  "4": "Item 4 \u2014 Managing client assets, payments, payroll or financial affairs",
  "5": "Item 5 \u2014 Buying or selling real estate on behalf of a client",
  "6": "Item 6 \u2014 Acting as trustee, nominee shareholder, or similar role",
  "7": "Item 7 \u2014 Forming companies, trusts, partnerships or other legal persons",
  "8": "Item 8 \u2014 Acting as company secretary, registered office, or similar position",
  "9": "Item 9 \u2014 Providing a registered office or business address"
};
