import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Open database
const db = new Database("apartments.db");

// Cryptographic Password Hashing Utility
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
}

function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

// Lightweight, secure, dependency-free JWT token implementation
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");

function signToken(payload: { id: number; email: string; name: string; role: string }) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const data = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 })).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${data}`).digest("base64url");
  return `${header}.${data}.${signature}`;
}

function verifyToken(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, data, signature] = parts;
    const expectedSignature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${data}`).digest("base64url");
    if (signature !== expectedSignature) return null;
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    if (payload.exp < Date.now()) return null; // Token expired
    return payload;
  } catch {
    return null;
  }
}

// Wipe & Setup complete database to establish high-fidelity Nazeel system
db.exec(`
  DROP TABLE IF EXISTS journal_items;
  DROP TABLE IF EXISTS journal_entries;
  DROP TABLE IF EXISTS accounts;
  DROP TABLE IF EXISTS transactions;
  DROP TABLE IF EXISTS bookings;
  DROP TABLE IF EXISTS apartments;
  DROP TABLE IF EXISTS housekeeping_logs;
  DROP TABLE IF EXISTS shifts;
  DROP TABLE IF EXISTS users;

  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user', -- 'admin', 'user'
    security_question TEXT,
    security_answer_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE accounts (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'Asset', 'Liability', 'Equity', 'Revenue', 'Expense'
    initial_balance REAL DEFAULT 0,
    classification TEXT DEFAULT 'Detail' -- 'Main' (رئيسي) or 'Detail' (تفصيلي)
  );

  CREATE TABLE journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    description TEXT,
    beneficiary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE journal_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL,
    account_code TEXT NOT NULL,
    debit REAL DEFAULT 0,
    credit REAL DEFAULT 0,
    description TEXT,
    FOREIGN KEY (entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
    FOREIGN KEY (account_code) REFERENCES accounts(code)
  );

  CREATE TABLE apartments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_number TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    floor INTEGER NOT NULL,
    beds_count INTEGER DEFAULT 2,
    price_per_night REAL NOT NULL,
    status TEXT DEFAULT 'available', -- 'available', 'occupied', 'dirty', 'maintenance', 'reserved'
    description TEXT
  );

  CREATE TABLE bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    apartment_id INTEGER,
    tenant_name TEXT NOT NULL,
    guest_id_type TEXT DEFAULT 'national_id', -- 'national_id', 'residency_id', 'passport'
    guest_id_number TEXT NOT NULL,
    guest_phone TEXT NOT NULL,
    guest_nationality TEXT DEFAULT 'Saudi',
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    days_count INTEGER NOT NULL,
    price_per_night REAL NOT NULL,
    subtotal REAL NOT NULL,
    vat_amount REAL NOT NULL, -- 15% VAT
    total_price REAL NOT NULL,
    paid_amount REAL DEFAULT 0,
    remaining_amount REAL DEFAULT 0,
    payment_method TEXT DEFAULT 'cash', -- 'cash', 'mada', 'credit_card', 'bank_transfer'
    status TEXT DEFAULT 'active', -- 'active', 'completed', 'cancelled'
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (apartment_id) REFERENCES apartments(id)
  );

  CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER,
    type TEXT NOT NULL, -- 'receipt_in' (سند قبض), 'voucher_out' (سند صرف)
    beneficiary TEXT, -- الجهة المستفيدة (العميل أو المورد)
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL, -- 'cash', 'mada', 'credit_card', 'bank_transfer'
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
  );

  CREATE TABLE housekeeping_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    apartment_id INTEGER,
    assigned_worker TEXT,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
    notes TEXT
  );

  CREATE TABLE shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT NOT NULL,
    opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    cash_drawer_start REAL DEFAULT 0,
    cash_drawer_end REAL,
    status TEXT DEFAULT 'open' -- 'open', 'closed'
  );
`);

// Insert Seed Data modeled directly on Saudi Furnished Apartments (نظام نزيل)
const insertApt = db.prepare(`
  INSERT INTO apartments (room_number, name, type, floor, beds_count, price_per_night, status, description)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const seedApartments = [
  // Floor 1
  ["101", "شقة مفردة 101", "غرفة وصالة", 1, 2, 250, "available", "مجهزة بالكامل، تكييف سبليت، شاشة ذكية"],
  ["102", "شقة عائلية 102", "غرفتين وصالة", 1, 4, 400, "occupied", "طلة شارع عام، مطبخ متكامل، دورتين مياه"],
  ["103", "استوديو ديلوكس 103", "ستوديو", 1, 1, 180, "dirty", "مساحة مريحة مخصصة لرجال الأعمال والمقيمين المفردين"],
  ["104", "جناح أعمال 104", "غرفة وصالة", 1, 2, 300, "available", "إنترنت فائق السرعة، موقع هادئ"],
  // Floor 2
  ["201", "شقة مفردة 201", "غرفة وصالة", 2, 2, 250, "occupied", "إضاءة طبيعية دافئة، غسالة ملابس متوفرة"],
  ["202", "شقة صيانة 202", "غرفتين وصالة", 2, 4, 380, "maintenance", "قيد صيانة التكييف المركزي وإعادة الطلاء"],
  ["203", "استوديو ديلوكس 203", "ستوديو", 2, 1, 180, "available", "إطلالة مميزة، تصميم عصري مريح"],
  ["204", "جناح عائلي 204", "ثلاث غرف وصالة", 2, 6, 600, "available", "مساحة واسعة جداً للعائلات الكبيرة مع صالة طعام"],
  // Floor 3
  ["301", "الجناح الملكي 301", "جناح ملكي فاخر", 3, 5, 1200, "available", "أعلى مستوى من الفخامة، إطلالة بانورامية كاملة للشرقية"],
  ["302", "شقة عائلية 302", "غرفتين وصالة", 3, 3, 400, "reserved", "حجز مسبق عبر الهوية الوطنية لشخص قادم غداً"],
  ["303", "استوديو 303", "ستوديو", 3, 1, 170, "dirty", "بانتظار خدمة التنظيف وغسيل المفارش"],
  ["304", "شقة مفردة 304", "غرفة وصالة", 3, 2, 260, "available", "أثاث تركي فاخر جديد بالكامل"]
];

for (const apt of seedApartments) {
  insertApt.run(...apt);
}

// Seed continuous active bookings to show calculations on startup
const insertBooking = db.prepare(`
  INSERT INTO bookings (
    apartment_id, tenant_name, guest_id_type, guest_id_number, guest_phone,
    guest_nationality, check_in, check_out, days_count, price_per_night,
    subtotal, vat_amount, total_price, paid_amount, remaining_amount, payment_method, status, notes
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Booking 1 for 102
const b1_id = insertBooking.run(
  2, "راكـان عـصام الـقحطاني", "national_id", "1098234851", "0501234567",
  "سعودي", "2026-05-20", "2026-05-25", 5, 400,
  1739.13, 260.87, 2000.0, 1500.0, 500.0, "mada", "active", "طلب سرير إضافي للأطفال"
).lastInsertRowid;

// Booking 2 for 201
const b2_id = insertBooking.run(
  5, "عبدالله محمد السبيعي", "national_id", "1104829302", "0559876543",
  "سعودي", "2026-05-21", "2026-05-24", 3, 250,
  652.17, 97.83, 750.0, 750.0, 0.0, "credit_card", "active", "قادم برحلة عمل صباحية"
).lastInsertRowid;

// Seed Transaction history for financial receipts (سندات القبض) matching Nazeel
const insertTx = db.prepare(`
  INSERT INTO transactions (booking_id, type, beneficiary, amount, payment_method, description)
  VALUES (?, ?, ?, ?, ?, ?)
`);
insertTx.run(b1_id, "receipt_in", "راكـان عـصام الـقحطاني", 1500, "mada", "دفعة مقدمة من قيمة إيجار شقة 102 بموجب العقد رقم #" + b1_id);
insertTx.run(b2_id, "receipt_in", "عبدالله محمد السبيعي", 750, "credit_card", "كامل قيمة الإيجار للشقة رقم 201 بموجب العقد رقم #" + b2_id);

// Seed manual expense (سند صرف)
insertTx.run(null, "voucher_out", "مؤسسة المنظفات المفتوحة للنمر", 120, "cash", "شراء مواد نظافة ومعطرات جو للاستقبال");

// --- SEED CHART OF ACCOUNTS ---
const seedAccounts = [
  // Assets (الأصول)
  { code: "1100", name: "النقدية والذمم المدينة المتداولة", type: "Asset", initial_balance: 0, classification: "Main" },
  { code: "1101", name: "الصندوق الرئيسي - كاش", type: "Asset", initial_balance: 500, classification: "Detail" },
  { code: "1102", name: "حساب الرياض الجاري - البنك", type: "Asset", initial_balance: 15000, classification: "Detail" },
  { code: "1103", name: "ذمم النزلاء والعملاء - مدينون", type: "Asset", initial_balance: 0, classification: "Detail" },
  
  // Liabilities (الالتزامات والخصوم)
  { code: "2100", name: "الالتزامات والمستحقات والذمم الدائنة", type: "Liability", initial_balance: 0, classification: "Main" },
  { code: "2101", name: "ضريبة القيمة المضافة المستحقة ZATCA", type: "Liability", initial_balance: 0, classification: "Detail" },
  { code: "2102", name: "ذمم الموردين والدائنين", type: "Liability", initial_balance: 0, classification: "Detail" },
  
  // Equity (حقوق الملكية)
  { code: "3100", name: "رأس المال وحقوق المساهمين بالمنشأة", type: "Equity", initial_balance: 0, classification: "Main" },
  { code: "3101", name: "رأس المال المستثمر", type: "Equity", initial_balance: 15500, classification: "Detail" },
  
  // Revenue (الإيرادات)
  { code: "4100", name: "إيرادات ومبيعات الفندق التشغيلية", type: "Revenue", initial_balance: 0, classification: "Main" },
  { code: "4101", name: "إيرادات تأجير الشقق والغرف", type: "Revenue", initial_balance: 0, classification: "Detail" },
  { code: "4102", name: "إيرادات الخدمات الإضافية والمغسلة", type: "Revenue", initial_balance: 0, classification: "Detail" },
  
  // Expenses (المصروفات)
  { code: "5100", name: "أعباء ومصروفات التشغيل الإدارية والعمومية", type: "Expense", initial_balance: 0, classification: "Main" },
  { code: "5101", name: "مصاريف النظافة والضيافة الشاملة", type: "Expense", initial_balance: 0, classification: "Detail" },
  { code: "5102", name: "مصاريف الصيانة والإصلاح", type: "Expense", initial_balance: 0, classification: "Detail" },
  { code: "5103", name: "مصاريف الفواتير والمرافق العامة", type: "Expense", initial_balance: 0, classification: "Detail" }
];

const insertCOA = db.prepare(`
  INSERT INTO accounts (code, name, type, initial_balance, classification)
  VALUES (?, ?, ?, ?, ?)
`);
for (const acc of seedAccounts) {
  insertCOA.run(acc.code, acc.name, acc.type, acc.initial_balance, acc.classification);
}

// --- SEED BALANCED DOUBLE-ENTRY JOURNAL ENTRIES ---
const insertJE = db.prepare(`
  INSERT INTO journal_entries (date, description, beneficiary)
  VALUES (?, ?, ?)
`);
const insertJI = db.prepare(`
  INSERT INTO journal_items (entry_id, account_code, debit, credit, description)
  VALUES (?, ?, ?, ?, ?)
`);

// Entry 1: Booking 1 payment
const je1_id = insertJE.run("2026-05-20", "سند قبض مقدم لعقد الشقة 102 - راكان عصام القحطاني", "راكـان عـصام الـقحطاني").lastInsertRowid;
insertJI.run(je1_id, "1102", 1500, 0, "إيداع مدى بالبنك");
insertJI.run(je1_id, "4101", 0, 1304.35, "قيمة إيجار شقة 102");
insertJI.run(je1_id, "2101", 0, 195.65, "قيمة ضريبة القيمة المضافة 15%");

// Entry 2: Booking 2 payment
const je2_id = insertJE.run("2026-05-21", "سند قبض إيجار شقة 201 - عبدالله محمد السبيعي", "عبدالله محمد السبيعي").lastInsertRowid;
insertJI.run(je2_id, "1102", 750, 0, "إيداع بطاقة ائتمانية بالبنك");
insertJI.run(je2_id, "4101", 0, 652.17, "قيمة إيجار شقة 201");
insertJI.run(je2_id, "2101", 0, 97.83, "قيمة ضريبة القيمة المضافة 15%");

// Entry 3: Expense voucher
const je3_id = insertJE.run("2026-05-22", "شراء مواد نظافة ومعطرات جو للاستقبال", "مؤسسة المنظفات المفتوحة للنمر").lastInsertRowid;
insertJI.run(je3_id, "5101", 120, 0, "شراء مطهر وأدوات تنظيف للاستقبال");
insertJI.run(je3_id, "1101", 0, 120, "صرف نقدي من صندوق الاستقبال");

// Seed Shifts
db.prepare("INSERT INTO shifts (user_name, cash_drawer_start, status) VALUES ('مدير الاستقبال المالي', 500, 'open')").run();

// Seed Default Users (Admin & Reception Staff)
const insertUser = db.prepare(`
  INSERT INTO users (email, password_hash, salt, name, role, security_question, security_answer_hash)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const adminSalt = generateSalt();
const adminHash = hashPassword("admin123", adminSalt);
const adminAnswerHash = hashPassword("الرياض", adminSalt);
insertUser.run("admin@nazeel.com", adminHash, adminSalt, "مدير النظام (راكان)", "admin", "ما هي مدينتك المفضلة؟", adminAnswerHash);

const staffSalt = generateSalt();
const staffHash = hashPassword("staff123", staffSalt);
const staffAnswerHash = hashPassword("الرياض", staffSalt);
insertUser.run("staff@nazeel.com", staffHash, staffSalt, "موظف الاستقبال (محمد)", "user", "ما هي مدينتك المفضلة؟", staffAnswerHash);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- AUTH MIDDLEWARE & UTILITIES ---
  const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "الرجاء تسجيل الدخول أولاً للوصول للخدمة" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: "جلسة العمل منتهية الصلاحية، يرجى إعادة تسجيل الدخول" });
    }

    (req as any).user = decoded;
    next();
  };

  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    authenticateToken(req, res, () => {
      if ((req as any).user.role !== "admin") {
        return res.status(403).json({ error: "عذراً، هذه العملية تتطلب صلاحيات مدير النظام" });
      }
      next();
    });
  };

  // --- API AUTHENTICATION ---
  app.post("/api/auth/register", (req, res) => {
    try {
      const { email, password, name, security_question, security_answer } = req.body;
      if (!email || !password || !name || !security_question || !security_answer) {
        return res.status(400).json({ error: "الرجاء تعبئة كافة الحقول المطلوبة للتسجيل" });
      }

      const existing = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
      if (existing) {
        return res.status(400).json({ error: "هذا البريد الإلكتروني مسجل مسبقاً في النظام" });
      }

      // Check total users count to make first user admin automatically
      const usersCount = (db.prepare("SELECT COUNT(*) as count FROM users").get() as any).count;
      const role = usersCount === 0 ? "admin" : "user";

      const salt = generateSalt();
      const password_hash = hashPassword(password, salt);
      const security_answer_hash = hashPassword(security_answer.trim(), salt);

      const result = db.prepare(`
        INSERT INTO users (email, password_hash, salt, name, role, security_question, security_answer_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(email, password_hash, salt, name, role, security_question, security_answer_hash);

      res.json({ success: true, userId: result.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "الرجاء إدخال البريد الإلكتروني وكلمة المرور" });
      }

      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
      if (!user) {
        return res.status(400).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
      }

      const hash = hashPassword(password, user.salt);
      if (hash !== user.password_hash) {
        return res.status(400).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
      }

      const token = signToken({ id: user.id, email: user.email, name: user.name, role: user.role });
      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/auth/me", authenticateToken, (req, res) => {
    try {
      const user = (req as any).user;
      const dbUser = db.prepare("SELECT id, email, name, role, security_question FROM users WHERE id = ?").get(user.id) as any;
      if (!dbUser) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }
      res.json(dbUser);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/reset-password", (req, res) => {
    try {
      const { email, security_answer, new_password } = req.body;
      if (!email || !security_answer || !new_password) {
        return res.status(400).json({ error: "الرجاء تعبئة كافة الحقول المطلوبة لاستعادة الحساب" });
      }

      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
      if (!user) {
        return res.status(400).json({ error: "البريد الإلكتروني غير مسجل بالنظام" });
      }

      const answerHash = hashPassword(security_answer.trim(), user.salt);
      if (answerHash !== user.security_answer_hash) {
        return res.status(400).json({ error: "إجابة سؤال الأمان غير صحيحة" });
      }

      const newSalt = generateSalt();
      const newHash = hashPassword(new_password, newSalt);
      const newAnswerHash = hashPassword(security_answer.trim(), newSalt);

      db.prepare(`
        UPDATE users 
        SET password_hash = ?, salt = ?, security_answer_hash = ?
        WHERE id = ?
      `).run(newHash, newSalt, newAnswerHash, user.id);

      res.json({ success: true, message: "تم تحديث كلمة المرور بنجاح" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/auth/users", requireAdmin, (req, res) => {
    try {
      const users = db.prepare("SELECT id, email, name, role, created_at FROM users ORDER BY id ASC").all();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/auth/users/:id/role", requireAdmin, (req, res) => {
    try {
      const targetId = parseInt(req.params.id);
      const { role } = req.body;
      const adminUser = (req as any).user;

      if (targetId === adminUser.id) {
        return res.status(400).json({ error: "لا يمكنك تغيير دور حسابك الحالي لتفادي فقدان الصلاحية" });
      }

      if (role !== "admin" && role !== "user") {
        return res.status(400).json({ error: "نوع الدور غير صالح" });
      }

      db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, targetId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/auth/users/:id", requireAdmin, (req, res) => {
    try {
      const targetId = parseInt(req.params.id);
      const adminUser = (req as any).user;

      if (targetId === adminUser.id) {
        return res.status(400).json({ error: "لا يمكنك حذف حسابك الحالي أثناء تسجيل الدخول" });
      }

      db.prepare("DELETE FROM users WHERE id = ?").run(targetId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- API APARTMENTS ---
  app.get("/api/apartments", authenticateToken, (req, res) => {
    try {
      const apartments = db.prepare("SELECT * FROM apartments ORDER BY floor ASC, room_number ASC").all();
      res.json(apartments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/apartments", requireAdmin, (req, res) => {
    try {
      const { room_number, name, type, floor, beds_count, price_per_night, description } = req.body;
      const result = db.prepare(`
        INSERT INTO apartments (room_number, name, type, floor, beds_count, price_per_night, status, description)
        VALUES (?, ?, ?, ?, ?, ?, 'available', ?)
      `).run(room_number, name, type, floor, beds_count || 2, price_per_night, description);
      res.json({ success: true, id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/apartments/update-status", authenticateToken, (req, res) => {
    try {
      const { id, status } = req.body;
      db.prepare("UPDATE apartments SET status = ? WHERE id = ?").run(status, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- API BOOKINGS & CONTRACTS ---
  app.get("/api/bookings", authenticateToken, (req, res) => {
    try {
      const bookings = db.prepare(`
        SELECT bookings.*, apartments.room_number, apartments.name as apartment_name, apartments.type as apartment_type
        FROM bookings
        JOIN apartments ON bookings.apartment_id = apartments.id
        ORDER BY bookings.id DESC
      `).all();
      res.json(bookings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/bookings", authenticateToken, (req, res) => {
    try {
      const {
        apartment_id, tenant_name, guest_id_type, guest_id_number, guest_phone,
        guest_nationality, check_in, check_out, days_count, price_per_night,
        paid_amount, payment_method, notes
      } = req.body;

      // Calculate taxes and totals like Saudi's strict VAT 15% rule
      const rawTotal = days_count * price_per_night;
      // standard formula to extract subtotal and 15% VAT from inclusive total
      const total_price = rawTotal;
      const subtotal = Number((rawTotal / 1.15).toFixed(2));
      const vat_amount = Number((rawTotal - subtotal).toFixed(2));
      const remaining_amount = Math.max(0, total_price - paid_amount);

      const result = db.prepare(`
        INSERT INTO bookings (
          apartment_id, tenant_name, guest_id_type, guest_id_number, guest_phone,
          guest_nationality, check_in, check_out, days_count, price_per_night,
          subtotal, vat_amount, total_price, paid_amount, remaining_amount, payment_method, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
      `).run(
        apartment_id, tenant_name, guest_id_type, guest_id_number, guest_phone,
        guest_nationality, check_in, check_out, days_count, price_per_night,
        subtotal, vat_amount, total_price, paid_amount, remaining_amount, payment_method, notes
      );

      const bookingId = result.lastInsertRowid;

      // Update apartment status to occupied
      db.prepare("UPDATE apartments SET status = 'occupied' WHERE id = ?").run(apartment_id);

      // Create initial receipt (سند القبض) automatically if guest paid any deposit
      if (paid_amount > 0) {
        db.prepare(`
          INSERT INTO transactions (booking_id, type, beneficiary, amount, payment_method, description)
          VALUES (?, 'receipt_in', ?, ?, ?, ?)
        `).run(
          bookingId, tenant_name, paid_amount, payment_method,
          `سند قبض مقدم لعقد الشقة رقم ${apartment_id} بموجب العقد رقم #${bookingId}`
        );

        // Auto-generate Balanced Accounting Journal Entry
        try {
          const jeId = db.prepare(`
            INSERT INTO journal_entries (date, description, beneficiary)
            VALUES (?, ?, ?)
          `).run(check_in, `سند قبض مقدم لعقد الشقة رقم ${apartment_id} بموجب العقد رقم #${bookingId}`, tenant_name).lastInsertRowid;
          
          const financeAcc = payment_method === 'cash' ? '1101' : '1102';
          // Debit: Cash/Bank asset account (1101 / 1102)
          db.prepare(`
            INSERT INTO journal_items (entry_id, account_code, debit, credit, description)
            VALUES (?, ?, ?, 0, ?)
          `).run(jeId, financeAcc, paid_amount, `استلام دفعة العقد رقم #${bookingId}`);

          // Credit: Room Rent Revenue (4101) & Due VAT 15% (2101)
          const bookingSubtotal = Number((paid_amount / 1.15).toFixed(2));
          const bookingVat = Number((paid_amount - bookingSubtotal).toFixed(2));

          db.prepare(`
            INSERT INTO journal_items (entry_id, account_code, debit, credit, description)
            VALUES (?, '4101', 0, ?, ?)
          `).run(jeId, bookingSubtotal, `إيراد إيجار للنزيل ${tenant_name}`);

          db.prepare(`
            INSERT INTO journal_items (entry_id, account_code, debit, credit, description)
            VALUES (?, '2101', 0, ?, ?)
          `).run(jeId, bookingVat, `ضريبة القيمة المضافة 15%`);
        } catch (acctErr) {
          console.error("Error creating matching booking journal entry", acctErr);
        }
      }

      res.json({ success: true, id: bookingId });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Checkout (إنهاء العقد وتحويل الشقة إلى متسخة)
  app.post("/api/bookings/:id/checkout", authenticateToken, (req, res) => {
    try {
      const bookingId = req.params.id;
      const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get() as any;
      if (!booking) {
        return res.status(404).json({ error: "العقد غير موجود" });
      }

      // Complete booking status
      db.prepare("UPDATE bookings SET status = 'completed' WHERE id = ?").run(bookingId);
      // Mark apartment as dirty (نظام نزيل يدرج الشقة فوراً في قائمة النظافة بعد الخروج)
      db.prepare("UPDATE apartments SET status = 'dirty' WHERE id = ?").run(booking.apartment_id);

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Cancel Booking
  app.post("/api/bookings/:id/cancel", authenticateToken, (req, res) => {
    try {
      const bookingId = req.params.id;
      const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get() as any;
      if (!booking) {
        return res.status(404).json({ error: "العقد غير موجود" });
      }

      db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(bookingId);
      db.prepare("UPDATE apartments SET status = 'available' WHERE id = ?").run(booking.apartment_id);

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Complete Payment Addition (سند قبض جديد مضاف لعقد)
  app.post("/api/bookings/:id/pay", authenticateToken, (req, res) => {
    try {
      const bookingId = req.params.id;
      const { amount, payment_method } = req.body;

      const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get() as any;
      if (!booking) return res.status(404).json({ error: "الحجز غير موجود" });

      const newPaid = booking.paid_amount + amount;
      const newRemaining = Math.max(0, booking.total_price - newPaid);

      db.prepare("UPDATE bookings SET paid_amount = ?, remaining_amount = ? WHERE id = ?").run(newPaid, newRemaining, bookingId);

      // Log transaction
      db.prepare(`
        INSERT INTO transactions (booking_id, type, beneficiary, amount, payment_method, description)
        VALUES (?, 'receipt_in', ?, ?, ?, ?)
      `).run(bookingId, booking.tenant_name, amount, payment_method, `سند قبض إضافي سداد لعجز العقد رقم #${bookingId}`);

      // Auto-generate Balanced Journal Entry
      try {
        const jeId = db.prepare(`
          INSERT INTO journal_entries (date, description, beneficiary)
          VALUES (?, ?, ?)
        `).run(new Date().toISOString().split('T')[0], `سند قبض إضافي سداد لعجز العقد رقم #${bookingId}`, booking.tenant_name).lastInsertRowid;
        
        const financeAcc = payment_method === 'cash' ? '1101' : '1102';
        // Debit: Cash/Bank asset account (1101 / 1102)
        db.prepare(`
          INSERT INTO journal_items (entry_id, account_code, debit, credit, description)
          VALUES (?, ?, ?, 0, ?)
        `).run(jeId, financeAcc, amount, `إيداع مالي إضافي للعقد #${bookingId}`);

        // Credit: Room Rent Revenue (4101) & Due VAT 15% (2101)
        const subtotal = Number((amount / 1.15).toFixed(2));
        const vat = Number((amount - subtotal).toFixed(2));

        db.prepare(`
          INSERT INTO journal_items (entry_id, account_code, debit, credit, description)
          VALUES (?, '4101', 0, ?, ?)
        `).run(jeId, subtotal, `إيراد الشقة - سداد عقد #${bookingId}`);

        db.prepare(`
          INSERT INTO journal_items (entry_id, account_code, debit, credit, description)
          VALUES (?, '2101', 0, ?, ?)
        `).run(jeId, vat, `ضريبة القيمة المضافة 15%`);
      } catch (acctErr) {
        console.error("Error creating matching incremental payment journal entry", acctErr);
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- API TRANSACTIONS (سندات الصرف والقبض اليدوية المباشرة) ---
  app.get("/api/transactions", authenticateToken, (req, res) => {
    try {
      const list = db.prepare(`
        SELECT transactions.*, bookings.tenant_name, apartments.room_number
        FROM transactions
        LEFT JOIN bookings ON transactions.booking_id = bookings.id
        LEFT JOIN apartments ON bookings.apartment_id = apartments.id
        ORDER BY transactions.id DESC
      `).all();
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/transactions/new", authenticateToken, (req, res) => {
    try {
      const { type, beneficiary, amount, payment_method, description } = req.body;
      const result = db.prepare(`
        INSERT INTO transactions (type, beneficiary, amount, payment_method, description)
        VALUES (?, ?, ?, ?, ?)
      `).run(type, beneficiary, amount, payment_method, description);
      res.json({ success: true, id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- API ACCOUNTING MODULE (شجرة الحسابات والقيود اليومية المحاسبية المزدوجة) ---
  app.get("/api/accounts", requireAdmin, (req, res) => {
    try {
      const accounts = db.prepare(`
        SELECT 
          a.code, 
          a.name, 
          a.type, 
          a.initial_balance,
          a.classification,
          COALESCE(SUM(ji.debit), 0) as total_debit, 
          COALESCE(SUM(ji.credit), 0) as total_credit
        FROM accounts a
        LEFT JOIN journal_items ji ON a.code = ji.account_code
        GROUP BY a.code
        ORDER BY a.code ASC
      `).all() as any[];

      // Compute direct balances
      accounts.forEach(acc => {
        const init = Number(acc.initial_balance || 0);
        const deb = Number(acc.total_debit || 0);
        const cred = Number(acc.total_credit || 0);
        if (acc.type === 'Asset' || acc.type === 'Expense') {
          acc.balance = init + deb - cred;
        } else {
          acc.balance = init + cred - deb;
        }
      });

      // Aggregate Detail balances under Main accounts
      accounts.forEach(mainAcc => {
        if (mainAcc.classification === 'Main') {
          let aggregatedDebit = 0;
          let aggregatedCredit = 0;
          let aggregatedBalance = 0;
          let aggregatedInit = 0;
          let hasDetails = false;

          accounts.forEach(subAcc => {
            const prefix = mainAcc.code.replace(/0+$/, '');
            if (subAcc.classification === 'Detail' && subAcc.code !== mainAcc.code && subAcc.code.startsWith(prefix)) {
              aggregatedDebit += Number(subAcc.total_debit || 0);
              aggregatedCredit += Number(subAcc.total_credit || 0);
              aggregatedBalance += Number(subAcc.balance || 0);
              aggregatedInit += Number(subAcc.initial_balance || 0);
              hasDetails = true;
            }
          });

          if (hasDetails) {
            mainAcc.total_debit = aggregatedDebit;
            mainAcc.total_credit = aggregatedCredit;
            mainAcc.balance = aggregatedBalance;
            mainAcc.initial_balance = aggregatedInit;
          }
        }
      });

      res.json(accounts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/accounts", requireAdmin, (req, res) => {
    try {
      const { code, name, type, initial_balance, classification } = req.body;
      if (!code || !name || !type) {
        return res.status(400).json({ error: "الرجاء توفير رقم الحساب، اسم الحساب، ونوع الحساب" });
      }

      // Check if account already exists
      const existing = db.prepare("SELECT * FROM accounts WHERE code = ?").get(code);
      if (existing) {
        return res.status(400).json({ error: `رقم الحساب ${code} مستخدم مسبقاً` });
      }

      db.prepare(`
        INSERT INTO accounts (code, name, type, initial_balance, classification)
        VALUES (?, ?, ?, ?, ?)
      `).run(code, name, type, Number(initial_balance || 0), classification || "Detail");

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/journal-entries", requireAdmin, (req, res) => {
    try {
      const entries = db.prepare("SELECT * FROM journal_entries ORDER BY id DESC").all() as any[];
      const items = db.prepare(`
        SELECT ji.*, a.name as account_name, a.type as account_type
        FROM journal_items ji
        JOIN accounts a ON ji.account_code = a.code
      `).all() as any[];

      entries.forEach(entry => {
        entry.items = items.filter(item => item.entry_id === entry.id);
      });

      res.json(entries);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/journal-entries", requireAdmin, (req, res) => {
    try {
      const { date, description, beneficiary, items } = req.body;

      let totalDebit = 0;
      let totalCredit = 0;
      for (const item of items) {
        totalDebit += Number(item.debit || 0);
        totalCredit += Number(item.credit || 0);
      }

      // 0.05 threshold for float point precision
      if (Math.abs(totalDebit - totalCredit) > 0.05) {
        return res.status(400).json({ error: `القيد غير متوازن! إجمالي الديون المدنية (${totalDebit.toFixed(2)}) لا يساوي الديون الدائنة (${totalCredit.toFixed(2)})` });
      }

      const executeTx = db.transaction(() => {
        const entryResult = db.prepare(`
          INSERT INTO journal_entries (date, description, beneficiary)
          VALUES (?, ?, ?)
        `).run(date, description, beneficiary);

        const entryId = entryResult.lastInsertRowid;

        const insertItem = db.prepare(`
          INSERT INTO journal_items (entry_id, account_code, debit, credit, description)
          VALUES (?, ?, ?, ?, ?)
        `);

        for (const item of items) {
          insertItem.run(entryId, item.account_code, Number(item.debit || 0), Number(item.credit || 0), item.description || description);
        }

        return entryId;
      });

      const entryId = executeTx();
      res.json({ success: true, id: entryId });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/journal-entries/voucher", requireAdmin, (req, res) => {
    try {
      const { type, ledger_account, finance_account, amount, payment_method, beneficiary, description, date } = req.body;
      const parsedAmount = Number(amount);

      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: "المبلغ المالي يجب أن يكون قيمة موجبة" });
      }

      const executeVoucherTx = db.transaction(() => {
        // Also log inside legacy transactions for reverse compatibility
        const legacyType = type === 'receipt_in' ? 'receipt_in' : 'voucher_out';
        db.prepare(`
          INSERT INTO transactions (type, beneficiary, amount, payment_method, description)
          VALUES (?, ?, ?, ?, ?)
        `).run(legacyType, beneficiary, parsedAmount, payment_method, description);

        // Record general double entry
        const entryResult = db.prepare(`
          INSERT INTO journal_entries (date, description, beneficiary)
          VALUES (?, ?, ?)
        `).run(date || new Date().toISOString().split('T')[0], description, beneficiary);

        const entryId = entryResult.lastInsertRowid;

        const insertItem = db.prepare(`
          INSERT INTO journal_items (entry_id, account_code, debit, credit, description)
          VALUES (?, ?, ?, ?, ?)
        `);

        if (type === 'receipt_in') {
          // Receipt In: Debit Cash / Bank (Finance) and Credit Revenue / Receivable / Capital (Ledger)
          insertItem.run(entryId, finance_account, parsedAmount, 0, `قيد قبض - ${payment_method}`);
          insertItem.run(entryId, ledger_account, 0, parsedAmount, description);
        } else {
          // Voucher Out: Debit Expense / Liability / Asset (Ledger) and Credit Cash / Bank (Finance)
          insertItem.run(entryId, ledger_account, parsedAmount, 0, description);
          insertItem.run(entryId, finance_account, 0, parsedAmount, `قيد دفع وصرف - ${payment_method}`);
        }

        return entryId;
      });

      const entryId = executeVoucherTx();
      res.json({ success: true, id: entryId });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- API HOUSEKEEPING & MAINTENANCE ---
  app.get("/api/housekeeping", authenticateToken, (req, res) => {
    try {
      const logs = db.prepare(`
        SELECT housekeeping_logs.*, apartments.room_number, apartments.type as apartment_type, apartments.status as room_status
        FROM housekeeping_logs
        JOIN apartments ON housekeeping_logs.apartment_id = apartments.id
        ORDER BY housekeeping_logs.id DESC
      `).all();
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/housekeeping/assign", authenticateToken, (req, res) => {
    try {
      const { apartment_id, assigned_worker, notes } = req.body;
      db.prepare(`
        INSERT INTO housekeeping_logs (apartment_id, assigned_worker, status, notes)
        VALUES (?, ?, 'in_progress', ?)
      `).run(apartment_id, assigned_worker, notes);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/housekeeping/complete", authenticateToken, (req, res) => {
    try {
      const { apartment_id } = req.body;
      // Mark dirty apartment back to available
      db.prepare("UPDATE apartments SET status = 'available' WHERE id = ?").run(apartment_id);
      db.prepare("UPDATE housekeeping_logs SET status = 'completed' WHERE apartment_id = ? AND status != 'completed'").run(apartment_id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- SHIFTS & CLOSURES ---
  app.get("/api/shifts/active", authenticateToken, (req, res) => {
    try {
      const activeShift = db.prepare("SELECT * FROM shifts WHERE status = 'open' LIMIT 1").get() as any;
      res.json(activeShift || null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/shifts/close", authenticateToken, (req, res) => {
    try {
      const { cash_drawer_end } = req.body;
      const openShift = db.prepare("SELECT * FROM shifts WHERE status = 'open' LIMIT 1").get() as any;
      if (!openShift) return res.status(400).json({ error: "لا يوجد وردية مفتوحة حالياً" });

      db.prepare("UPDATE shifts SET status = 'closed', closed_at = CURRENT_TIMESTAMP, cash_drawer_end = ? WHERE id = ?")
        .run(cash_drawer_end, openShift.id);

      // Open a fresh new shift for replacement auto
      db.prepare("INSERT INTO shifts (user_name, cash_drawer_start, status) VALUES ('مستلم الوردية الجديدة', ?, 'open')")
        .run(cash_drawer_end);

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- STATS OVERVIEW ---
  app.get("/api/stats", authenticateToken, (req, res) => {
    try {
      const totalApartments = db.prepare("SELECT COUNT(*) as count FROM apartments").get() as { count: number };
      const occupiedApartments = db.prepare("SELECT COUNT(*) as count FROM apartments WHERE status = 'occupied'").get() as { count: number };
      const dirtyApartments = db.prepare("SELECT COUNT(*) as count FROM apartments WHERE status = 'dirty'").get() as { count: number };
      const maintenanceApartments = db.prepare("SELECT COUNT(*) as count FROM apartments WHERE status = 'maintenance'").get() as { count: number };
      const reservedApartments = db.prepare("SELECT COUNT(*) as count FROM apartments WHERE status = 'reserved'").get() as { count: number };

      const totalRevenueIn = db.prepare("SELECT SUM(amount) as sum FROM transactions WHERE type = 'receipt_in'").get() as { sum: number };
      const totalExpenseOut = db.prepare("SELECT SUM(amount) as sum FROM transactions WHERE type = 'voucher_out'").get() as { sum: number };

      const revenueSum = totalRevenueIn.sum || 0;
      const expenseSum = totalExpenseOut.sum || 0;

      res.json({
        total: totalApartments.count,
        occupied: occupiedApartments.count,
        dirty: dirtyApartments.count,
        maintenance: maintenanceApartments.count,
        reserved: reservedApartments.count,
        revenue: revenueSum,
        expenses: expenseSum,
        netRevenue: revenueSum - expenseSum,
        occupancyRate: totalApartments.count > 0 ? (occupiedApartments.count / totalApartments.count) * 100 : 0
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite development vs static client serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Nazeel PMS Engine active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
