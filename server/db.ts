import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import 'dotenv/config';
import { User, Patient, Doctor, QueueSettings, AnalyticsSummary } from '../src/types';

const DB_FILE = path.join(process.cwd(), 'data', 'database.json');

// --- MONGOOSE SCHEMAS AND CONFIG ---
const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  role: { type: String, required: true, default: 'receptionist' },
});

const PasswordSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
});

const PatientSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  tokenNumber: { type: String, required: true },
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  phone: { type: String, required: true },
  doctorId: { type: String, required: true },
  doctorName: { type: String, required: true },
  reason: { type: String, required: true },
  priority: { type: String, required: true },
  status: { type: String, required: true },
  createdAt: { type: String, required: true },
  calledAt: { type: String, default: null },
  completedAt: { type: String, default: null },
  consultationMinutes: { type: Number, default: null },
});

const DoctorSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  specialty: { type: String, required: true },
  room: { type: String, required: true },
  availability: { type: String, required: true },
  currentPatientToken: { type: String, default: null },
  avgConsultationMinutes: { type: Number, required: true },
});

const SettingsSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  clinicName: { type: String, required: true },
  avgConsultationTime: { type: Number, required: true },
  resetTime: { type: String, required: true },
});

// Cache mongoose model instances correctly to avoid overwrite compiling errors
const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
const PasswordModel = mongoose.models.Password || mongoose.model('Password', PasswordSchema);
const PatientModel = mongoose.models.Patient || mongoose.model('Patient', PatientSchema);
const DoctorModel = mongoose.models.Doctor || mongoose.model('Doctor', DoctorSchema);
const SettingsModel = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);

let isMongoConnected = false;
let mongoConnectionError: string | null = null;

interface Schema {
  users: User[];
  passwords: Record<string, string>; // userId -> hashed_password
  patients: Patient[];
  doctors: Doctor[];
  settings: QueueSettings;
}

// Helper to ensure local backup data directory exists
function ensureDirExists() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Initial seed data
const DEFAULT_SETTINGS: QueueSettings = {
  id: 'global_settings',
  clinicName: 'St. Jude Health Center',
  avgConsultationTime: 10,
  resetTime: '00:00',
};

const DEFAULT_DOCTORS: Doctor[] = [
  {
    id: 'doc-1',
    name: 'Dr. Sarah Jenkins',
    specialty: 'Cardiology',
    room: 'Room 101',
    availability: 'active',
    currentPatientToken: null,
    avgConsultationMinutes: 12,
  },
  {
    id: 'doc-2',
    name: 'Dr. Aaron Patel',
    specialty: 'Pediatrics',
    room: 'Room 102',
    availability: 'active',
    currentPatientToken: null,
    avgConsultationMinutes: 8,
  },
  {
    id: 'doc-3',
    name: 'Dr. Lisa Warren',
    specialty: 'Dermatology',
    room: 'Room 103',
    availability: 'on-break',
    currentPatientToken: null,
    avgConsultationMinutes: 10,
  },
  {
    id: 'doc-4',
    name: 'Dr. Marcus Vance',
    specialty: 'General Medicine',
    room: 'Room 104',
    availability: 'active',
    currentPatientToken: null,
    avgConsultationMinutes: 6,
  },
];

const DEFAULT_PATIENTS: Patient[] = [
  {
    id: 'p-1',
    tokenNumber: 'A-012',
    name: 'Eleanor Vance',
    age: 45,
    gender: 'Female',
    phone: '555-0192',
    doctorId: 'doc-4',
    doctorName: 'Dr. Marcus Vance',
    reason: 'Follow-up on laboratory results',
    priority: 'normal',
    status: 'completed',
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    calledAt: new Date(Date.now() - 2.8 * 3600 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 2.7 * 3600 * 1000).toISOString(),
    consultationMinutes: 6,
  },
  {
    id: 'p-2',
    tokenNumber: 'A-013',
    name: 'George Miller',
    age: 62,
    gender: 'Male',
    phone: '555-0143',
    doctorId: 'doc-1',
    doctorName: 'Dr. Sarah Jenkins',
    reason: 'Mild exertional dyspnea evaluation',
    priority: 'urgent',
    status: 'completed',
    createdAt: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString(),
    calledAt: new Date(Date.now() - 2.2 * 3600 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 2.0 * 3600 * 1000).toISOString(),
    consultationMinutes: 12,
  },
  {
    id: 'p-3',
    tokenNumber: 'A-014',
    name: 'Liam Henderson',
    age: 8,
    gender: 'Male',
    phone: '555-0111',
    doctorId: 'doc-2',
    doctorName: 'Dr. Aaron Patel',
    reason: 'Persistent seasonal dry cough',
    priority: 'normal',
    status: 'in-consultation',
    createdAt: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString(),
    calledAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    completedAt: null,
    consultationMinutes: null,
  },
  {
    id: 'p-4',
    tokenNumber: 'A-015',
    name: 'Clara Oswald',
    age: 28,
    gender: 'Female',
    phone: '555-0122',
    doctorId: 'doc-4',
    doctorName: 'Dr. Marcus Vance',
    reason: 'Prescription renewal',
    priority: 'normal',
    status: 'waiting',
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    calledAt: null,
    completedAt: null,
    consultationMinutes: null,
  },
  {
    id: 'p-5',
    tokenNumber: 'A-016',
    name: 'Arthur Pendragon',
    age: 33,
    gender: 'Male',
    phone: '555-0158',
    doctorId: 'doc-1',
    doctorName: 'Dr. Sarah Jenkins',
    reason: 'Hypertension monitoring',
    priority: 'urgent',
    status: 'waiting',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    calledAt: null,
    completedAt: null,
    consultationMinutes: null,
  },
  {
    id: 'p-6',
    tokenNumber: 'A-017',
    name: 'Diana Prince',
    age: 31,
    gender: 'Female',
    phone: '555-3847',
    doctorId: 'doc-3',
    doctorName: 'Dr. Lisa Warren',
    reason: 'Atopic dermatitis review',
    priority: 'normal',
    status: 'waiting',
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    calledAt: null,
    completedAt: null,
    consultationMinutes: null,
  },
  {
    id: 'p-7',
    tokenNumber: 'A-018',
    name: 'Bruce Wayne',
    age: 40,
    gender: 'Male',
    phone: '555-1939',
    doctorId: 'doc-4',
    doctorName: 'Dr. Marcus Vance',
    reason: 'Acute post-traumatic body pain',
    priority: 'emergency',
    status: 'waiting',
    createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    calledAt: null,
    completedAt: null,
    consultationMinutes: null,
  },
];

// Seed default databases in connected MongoDB ifcollections are empty
async function seedMongoIfEmpty() {
  try {
    const settingsCount = await SettingsModel.countDocuments();
    if (settingsCount === 0) {
      await SettingsModel.create(DEFAULT_SETTINGS);
      console.log('🌱 Seeded default clinic settings in MongoDB.');
    }

    const doctorsCount = await DoctorModel.countDocuments();
    if (doctorsCount === 0) {
      await DoctorModel.insertMany(DEFAULT_DOCTORS);
      console.log('🌱 Seeded default doctor profiles in MongoDB.');
    }

    const patientsCount = await PatientModel.countDocuments();
    if (patientsCount === 0) {
      await PatientModel.insertMany(DEFAULT_PATIENTS);
      console.log('🌱 Seeded default patient list in MongoDB.');
    }

    const usersCount = await UserModel.countDocuments();
    if (usersCount === 0) {
      const demoUserId = 'demo-receptionist';
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync('Password123', salt);

      await UserModel.create({
        id: demoUserId,
        name: 'Patricia Campbell',
        email: 'demo@queuecure.com',
        role: 'receptionist',
      });
      await PasswordModel.create({
        userId: demoUserId,
        passwordHash: hashedPassword,
      });
      console.log('🌱 Seeded demo receptionist account in MongoDB.');
    }
  } catch (err) {
    console.error('⚠️ Could not complete MongoDB seeding:', err);
  }
}

// Convert Mongoose collection results to memory schema format
async function fetchAllFromMongo(): Promise<Schema> {
  const users = (await UserModel.find().lean()) as any[];
  const passwordsList = (await PasswordModel.find().lean()) as any[];
  const patients = (await PatientModel.find().lean()) as any[];
  const doctors = (await DoctorModel.find().lean()) as any[];
  const settingsDoc = await (SettingsModel as any).findOne({ id: 'global_settings' }).lean() as any;

  const passwords: Record<string, string> = {};
  passwordsList.forEach((pw) => {
    passwords[pw.userId] = pw.passwordHash;
  });

  return {
    users: users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role })),
    passwords,
    patients: patients.map(p => ({
      id: p.id,
      tokenNumber: p.tokenNumber,
      name: p.name,
      age: p.age,
      gender: p.gender,
      phone: p.phone,
      doctorId: p.doctorId,
      doctorName: p.doctorName,
      reason: p.reason,
      priority: p.priority,
      status: p.status,
      createdAt: p.createdAt,
      calledAt: p.calledAt,
      completedAt: p.completedAt,
      consultationMinutes: p.consultationMinutes,
    })),
    doctors: doctors.map(d => ({
      id: d.id,
      name: d.name,
      specialty: d.specialty,
      room: d.room,
      availability: d.availability,
      currentPatientToken: d.currentPatientToken,
      avgConsultationMinutes: d.avgConsultationMinutes,
    })),
    settings: settingsDoc ? {
      id: settingsDoc.id,
      clinicName: settingsDoc.clinicName,
      avgConsultationTime: settingsDoc.avgConsultationTime,
      resetTime: settingsDoc.resetTime,
    } : DEFAULT_SETTINGS,
  };
}

// Async connection launcher that fails fast on unreachable URI or local test offline states
async function connectMongo(): Promise<boolean> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('📌 MONGODB_URI is not set. Maintaining local JSON file database backup.');
    return false;
  }

  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000,
    });
    isMongoConnected = true;
    mongoConnectionError = null;
    console.log('✅ MongoDB connected successfully!');
    await seedMongoIfEmpty();
    return true;
  } catch (error: any) {
    console.error('❌ Failed to connect to MongoDB:', error);
    mongoConnectionError = error?.message || String(error);
    console.log('📌 Falling back to local JSON database (/data/database.json).');
    isMongoConnected = false;
    return false;
  }
}

export class DB {
  private static cachedData: Schema | null = null;
  private static isConnecting = false;

  static async startMongoConnectionLoop() {
    if (isMongoConnected || this.isConnecting) return;
    this.isConnecting = true;

    const connected = await connectMongo();
    this.isConnecting = false;

    if (connected) {
      try {
        console.log('🔄 Syncing server cache with MongoDB data payload...');
        const mongoData = await fetchAllFromMongo();
        this.cachedData = mongoData;
        console.log('✅ Synchronized internal cached server state with live MongoDB collection.');
      } catch (err) {
        console.error('⚠️ Could not fetch from MongoDB, keeping local standby state:', err);
      }
    } else {
      console.log('⏳ Will retry connecting to MongoDB in 15 seconds...');
      setTimeout(() => {
        this.startMongoConnectionLoop();
      }, 15000);
    }
  }

  static load(): Schema {
    if (this.cachedData) return this.cachedData;

    ensureDirExists();
    
    // 1. Build and cache local filesystem database as instant bootloader standby
    let fileSchema: Schema;
    if (!fs.existsSync(DB_FILE)) {
      const demoUserId = 'demo-receptionist';
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync('Password123', salt);

      const initialSchema: Schema = {
        users: [
          {
            id: demoUserId,
            name: 'Patricia Campbell',
            email: 'demo@queuecure.com',
            role: 'receptionist',
          },
        ],
        passwords: {
          [demoUserId]: hashedPassword,
        },
        patients: DEFAULT_PATIENTS,
        doctors: DEFAULT_DOCTORS,
        settings: DEFAULT_SETTINGS,
      };

      initialSchema.doctors[1].currentPatientToken = 'A-014'; // Liam

      this.saveLocalBackup(initialSchema);
      fileSchema = initialSchema;
    } else {
      try {
        const data = fs.readFileSync(DB_FILE, 'utf-8');
        fileSchema = JSON.parse(data);
      } catch (e) {
        console.error('Error reading JSON DB, resolving defaults', e);
        const demoUserId = 'demo-receptionist';
        const salt = bcrypt.genSaltSync(10);
        fileSchema = {
          users: [{ id: demoUserId, name: 'Patricia Campbell', email: 'demo@queuecure.com', role: 'receptionist' }],
          passwords: { [demoUserId]: bcrypt.hashSync('Password123', salt) },
          patients: DEFAULT_PATIENTS,
          doctors: DEFAULT_DOCTORS,
          settings: DEFAULT_SETTINGS,
        };
      }
    }

    // Set memory singleton to the instant file system load
    this.cachedData = fileSchema;

    // 2. Trigger async background Mongo connection loop
    this.startMongoConnectionLoop();

    return this.cachedData;
  }

  static isMongoConnected(): boolean {
    return isMongoConnected;
  }

  static getMongoConnectionError(): string | null {
    return mongoConnectionError;
  }

  // Standby local json writing
  private static saveLocalBackup(data: Schema) {
    ensureDirExists();
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('⚠️ Local filesytem storage backup save failed:', e);
    }
  }

  // Dynamic persistence router
  static save(data: Schema) {
    this.cachedData = data;
    this.saveLocalBackup(data);
  }

  // --- Users API ---
  static getUsers(): User[] {
    return this.load().users;
  }

  static getUserByEmail(email: string): User | undefined {
    return this.load().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  static getUserPassword(userId: string): string | undefined {
    return this.load().passwords[userId];
  }

  static createUser(user: User, passwordPlain: string): User {
    const data = this.load();
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(passwordPlain, salt);
    
    data.users.push(user);
    data.passwords[user.id] = hash;
    this.save(data);

    // Persist to MongoDB asynchronously if connected
    if (isMongoConnected) {
      UserModel.create(user as any).catch(err => console.error('MongoDB async user creation error:', err));

      PasswordModel.create({
        userId: user.id,
        passwordHash: hash
      } as any).catch(err => console.error('MongoDB async password creation error:', err));
    }

    return user;
  }

  // --- Patients / Queue ---
  static getPatients(): Patient[] {
    return this.load().patients;
  }

  static getPatient(id: string): Patient | undefined {
    return this.load().patients.find((p) => p.id === id);
  }

  static addPatient(patient: Patient): Patient {
    const data = this.load();
    data.patients.push(patient);
    this.save(data);

    // Persist to MongoDB asynchronously if connected
    if (isMongoConnected) {
      PatientModel.create(patient as any).catch(err =>
        console.error('MongoDB async patient intake failed:', err)
      );
    }

    return patient;
  }

  static updatePatient(id: string, updates: Partial<Patient>): Patient | undefined {
    const data = this.load();
    const index = data.patients.findIndex((p) => p.id === id);
    if (index === -1) return undefined;

    const updated = { ...data.patients[index], ...updates };
    data.patients[index] = updated as Patient;
    this.save(data);

    // Persist to MongoDB asynchronously if connected
    if (isMongoConnected) {
      PatientModel.updateOne({ id } as any, { $set: updates } as any).catch(err =>
        console.error('MongoDB async patient update failed:', err)
      );
    }

    return updated;
  }

  static deletePatient(id: string): boolean {
    const data = this.load();
    const lengthBefore = data.patients.length;
    data.patients = data.patients.filter((p) => p.id !== id);
    if (data.patients.length < lengthBefore) {
      this.save(data);

      // Persist to MongoDB asynchronously if connected
      if (isMongoConnected) {
        PatientModel.deleteOne({ id } as any).catch(err =>
          console.error('MongoDB async patient delete failed:', err)
        );
      }
      return true;
    }
    return false;
  }

  // --- Doctors API ---
  static getDoctors(): Doctor[] {
    return this.load().doctors;
  }

  static getDoctor(id: string): Doctor | undefined {
    return this.load().doctors.find((d) => d.id === id);
  }

  static updateDoctor(id: string, updates: Partial<Doctor>): Doctor | undefined {
    const data = this.load();
    const index = data.doctors.findIndex((d) => d.id === id);
    if (index === -1) return undefined;

    const updated = { ...data.doctors[index], ...updates };
    data.doctors[index] = updated;
    this.save(data);

    // Persist to MongoDB asynchronously if connected
    if (isMongoConnected) {
      DoctorModel.updateOne({ id } as any, { $set: updates } as any).catch(err =>
        console.error('MongoDB async doctor status update failed:', err)
      );
    }

    return updated;
  }

  static addDoctor(doctor: Doctor): Doctor {
    const data = this.load();
    data.doctors.push(doctor);
    this.save(data);

    // Persist to MongoDB asynchronously if connected
    if (isMongoConnected) {
      DoctorModel.create(doctor as any).catch(err =>
        console.error('MongoDB async doctor additions failed:', err)
      );
    }

    return doctor;
  }

  // --- Settings API ---
  static getSettings(): QueueSettings {
    return this.load().settings;
  }

  static updateSettings(updates: Partial<QueueSettings>): QueueSettings {
    const data = this.load();
    data.settings = { ...data.settings, ...updates };
    this.save(data);

    // Persist to MongoDB asynchronously if connected
    if (isMongoConnected) {
      SettingsModel.updateOne({ id: 'global_settings' } as any, { $set: updates } as any, { upsert: true } as any).catch(err =>
        console.error('MongoDB async configuration update failed:', err)
      );
    }

    return data.settings;
  }

  // --- Complex state mutation routines ---
  static resetAllQueues() {
    const data = this.load();
    data.patients = data.patients.map((p) => {
      if (p.status === 'waiting' || p.status === 'called' || p.status === 'in-consultation') {
        return {
          ...p,
          status: 'cancelled',
          completedAt: new Date().toISOString(),
        } as Patient;
      }
      return p;
    });

    data.doctors = data.doctors.map((d) => ({
      ...d,
      currentPatientToken: null,
    }));

    this.save(data);

    // Persist to MongoDB asynchronously if connected
    if (isMongoConnected) {
      PatientModel.updateMany(
        { status: { $in: ['waiting', 'called', 'in-consultation'] } } as any,
        { $set: { status: 'cancelled', completedAt: new Date().toISOString() } } as any
      ).catch(err => console.error('MongoDB async queue reset failed (Patients):', err));

      DoctorModel.updateMany({} as any, { $set: { currentPatientToken: null } } as any).catch(err =>
        console.error('MongoDB async queue reset failed (Doctors):', err)
      );
    }
  }

  // --- Analytics compilation ---
  static getAnalytics(): AnalyticsSummary {
    const data = this.load();
    const patients = data.patients;

    const now = new Date();
    const todayStr = now.toDateString();

    const patientsToday = patients.filter((p) => new Date(p.createdAt).toDateString() === todayStr);

    const patientsWaiting = patientsToday.filter((p) => p.status === 'waiting').length;
    const patientsServedToday = patientsToday.filter((p) => p.status === 'completed').length;
    
    const totalTodayCount = patientsToday.length;
    const efficiencyPercent = totalTodayCount > 0 
      ? Math.round((patientsServedToday / totalTodayCount) * 100) 
      : 100;

    const activeCalling = patientsToday.find((p) => p.status === 'called' || p.status === 'in-consultation');
    const currentServingToken = activeCalling ? activeCalling.tokenNumber : null;

    const servedOrInConsult = patientsToday.filter(
      (p) => (p.calledAt !== null)
    );
    let totalWaitTimeMs = 0;
    servedOrInConsult.forEach((p) => {
      const waitTime = new Date(p.calledAt!).getTime() - new Date(p.createdAt).getTime();
      totalWaitTimeMs += waitTime;
    });
    const averageWaitTimeMinutes = servedOrInConsult.length > 0
      ? Math.max(1, Math.round(totalWaitTimeMs / (servedOrInConsult.length * 60 * 1000)))
      : data.settings.avgConsultationTime;

    const activeDoctorsCount = data.doctors.filter((d) => d.availability === 'active').length;

    const patientsPerHour: Array<{ hour: string; count: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setHours(d.getHours() - i);
      const hourName = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const count = patients.filter((p) => {
        const pDate = new Date(p.createdAt);
        return pDate.getHours() === d.getHours() && pDate.toDateString() === d.toDateString();
      }).length;
      patientsPerHour.push({ hour: hourName, count });
    }

    const patientsPerDay: Array<{ day: string; count: number }> = [];
    const daysArr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = daysArr[d.getDay()];
      const count = patients.filter((p) => {
        const pDate = new Date(p.createdAt);
        return pDate.toDateString() === d.toDateString();
      }).length;
      patientsPerDay.push({ day: dayName, count });
    }

    const doctorEfficiencyList = data.doctors.map((doc) => {
      const docPatients = patients.filter((p) => p.doctorId === doc.id && p.status === 'completed');
      let totalMinutes = 0;
      docPatients.forEach((p) => {
        if (p.consultationMinutes) {
          totalMinutes += p.consultationMinutes;
        } else if (p.completedAt && p.calledAt) {
          const duration = (new Date(p.completedAt).getTime() - new Date(p.calledAt).getTime()) / (60 * 1000);
          totalMinutes += Math.max(1, Math.round(duration));
        }
      });
      const avgTime = docPatients.length > 0 ? parseFloat((totalMinutes / docPatients.length).toFixed(1)) : doc.avgConsultationMinutes;
      return {
        name: doc.name,
        avgTime,
        served: docPatients.length,
      };
    });

    return {
      patientsWaiting,
      currentServingToken,
      patientsServedToday,
      averageWaitTimeMinutes,
      efficiencyPercent,
      activeDoctorsCount,
      patientsPerHour,
      patientsPerDay,
      doctorEfficiencyList,
    };
  }
}
