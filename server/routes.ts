import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Server as SocketServer } from 'socket.io';
import { DB } from './db';
import { Patient, Doctor, Priority, PatientStatus } from '../src/types';

const JWT_SECRET = process.env.JWT_SECRET || 'queue-cure-secret-2026-key';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// Authentication Middleware
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing or invalid' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
}

export function createRouter(io: SocketServer): Router {
  const router = Router();

  // Helper helper to broadcast updated queue data to all socket clients
  const broadcastQueueUpdate = () => {
    const patients = DB.getPatients();
    const doctors = DB.getDoctors();
    io.emit('queue:updated', { patients, doctors });
    
    // Also notify analytics has refreshed
    const analytics = DB.getAnalytics();
    io.emit('analytics:updated', analytics);
  };

  // Helper to generate the next token sequence auto-incrementing by prefix (e.g. A-001)
  const generateTokenNumber = (priority: Priority): string => {
    const prefix = priority === 'emergency' ? 'E' : priority === 'urgent' ? 'U' : 'A';
    const patients = DB.getPatients();
    
    // Filter patients created today with the same prefix to find the max number
    const todayStr = new Date().toDateString();
    const todaysTokens = patients.filter(
      p => new Date(p.createdAt).toDateString() === todayStr && p.tokenNumber.startsWith(prefix + '-')
    );

    let maxNum = 0;
    todaysTokens.forEach(p => {
      const parts = p.tokenNumber.split('-');
      if (parts.length === 2) {
        const num = parseInt(parts[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    const nextNum = maxNum + 1;
    return `${prefix}-${nextNum.toString().padStart(3, '0')}`;
  };

  // ==========================================
  // AUTH ROUTING
  // ==========================================

  // POST /api/auth/register
  router.post('/auth/register', (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Missing required registration parameters' });
    }

    const existing = DB.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const assignedRole = role === 'doctor' || role === 'admin' ? role : 'receptionist';
    const newUser = {
      id: 'usr-' + Math.random().toString(36).substr(2, 9),
      name,
      email: email.toLowerCase(),
      role: assignedRole,
    };

    DB.createUser(newUser, password);

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({ token, user: newUser });
  });

  // POST /api/auth/login
  router.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = DB.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const storedHash = DB.getUserPassword(user.id);
    if (!storedHash) {
      return res.status(500).json({ message: 'Authentication error occurred' });
    }

    const isMatch = bcrypt.compareSync(password, storedHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, user });
  });

  // GET /api/auth/profile
  router.get('/auth/profile', authenticate, (req: AuthenticatedRequest, res) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthenticated' });
    const user = DB.getUsers().find(u => u.id === req.user!.id);
    if (!user) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    res.json({ user });
  });

  // ==========================================
  // PATIENT ROUTING
  // ==========================================

  // GET /api/patients -> get patient list
  router.get('/patients', (req, res) => {
    res.json(DB.getPatients());
  });

  // GET /api/patients/:id -> get specific patient
  router.get('/patients/:id', (req, res) => {
    const patient = DB.getPatient(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient);
  });

  // POST /api/patients -> create or queue new patient
  router.post('/patients', (req, res) => {
    const { name, age, gender, phone, doctorId, reason, priority } = req.body;

    if (!name || !age || !gender || !phone || !doctorId) {
      return res.status(400).json({ message: 'Required patient details are missing' });
    }

    const doctor = DB.getDoctor(doctorId);
    if (!doctor) {
      return res.status(400).json({ message: 'Assigned doctor not found' });
    }

    const selectedPriority = (priority as Priority) || 'normal';
    const token = generateTokenNumber(selectedPriority);

    const newPatient: Patient = {
      id: 'pat-' + Math.random().toString(36).substr(2, 9),
      tokenNumber: token,
      name,
      age: Number(age),
      gender,
      phone,
      doctorId,
      doctorName: doctor.name,
      reason: reason || 'General check-up',
      priority: selectedPriority,
      status: 'waiting',
      createdAt: new Date().toISOString(),
      calledAt: null,
      completedAt: null,
      consultationMinutes: null,
    };

    DB.addPatient(newPatient);
    broadcastQueueUpdate();

    io.emit('toast:notify', {
      message: `Patient ${name} has been added to Queue with Token ${token}`,
      type: 'success'
    });

    res.status(201).json(newPatient);
  });

  // PUT /api/patients/:id -> update patient details
  router.put('/patients/:id', (req, res) => {
    const updated = DB.updatePatient(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: 'Patient not found' });

    broadcastQueueUpdate();
    res.json(updated);
  });

  // DELETE /api/patients/:id -> cancel token / remove patient
  router.delete('/patients/:id', (req, res) => {
    const patient = DB.getPatient(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    // Cancel patient status instead of hard deleting, so we preserve analytics
    DB.updatePatient(req.params.id, { status: 'cancelled' });

    // Release doctor index if that doctor was examining this patient
    const doctor = DB.getDoctors().find(d => d.currentPatientToken === patient.tokenNumber);
    if (doctor) {
      DB.updateDoctor(doctor.id, { currentPatientToken: null });
    }

    broadcastQueueUpdate();
    res.json({ message: 'Token cancelled successfully' });
  });

  // ==========================================
  // QUEUE STRATEGIC OPERATIONS
  // ==========================================

  // POST /api/queue/call-next
  router.post('/queue/call-next', (req, res) => {
    const { doctorId } = req.body;
    if (!doctorId) return res.status(400).json({ message: 'Doctor ID is required' });

    const doctor = DB.getDoctor(doctorId);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    // Find next waiting patient for this doctor. Sort by priority and creation time:
    // Emergency -> Urgent -> Normal
    const patients = DB.getPatients();
    const doctorPatients = patients.filter(
      p => p.doctorId === doctorId && p.status === 'waiting'
    );

    if (doctorPatients.length === 0) {
      return res.status(400).json({ message: 'No patient currently waiting for this doctor' });
    }

    // Sort: emergency first, then urgent, then normal
    const priorityWeight = { emergency: 3, urgent: 2, normal: 1 };
    doctorPatients.sort((a, b) => {
      const weightA = priorityWeight[a.priority];
      const weightB = priorityWeight[b.priority];
      if (weightA !== weightB) return weightB - weightA; // Higher weight first
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); // First in, first out
    });

    const nextPatient = doctorPatients[0];

    // If doctor has a current patient remaining, mark them completed/skipped first
    if (doctor.currentPatientToken) {
      const activePat = patients.find(p => p.tokenNumber === doctor.currentPatientToken && (p.status === 'called' || p.status === 'in-consultation'));
      if (activePat) {
        DB.updatePatient(activePat.id, {
          status: 'completed',
          completedAt: new Date().toISOString(),
          consultationMinutes: Math.max(1, Math.round((Date.now() - new Date(activePat.calledAt!).getTime()) / 60000)),
        });
      }
    }

    // Update new active patient status
    DB.updatePatient(nextPatient.id, {
      status: 'called',
      calledAt: new Date().toISOString(),
    });

    // Update doctor's current active patient token
    DB.updateDoctor(doctorId, { currentPatientToken: nextPatient.tokenNumber });

    broadcastQueueUpdate();

    io.emit('patient:called', { patient: nextPatient });
    io.emit('toast:notify', {
      message: `Token ${nextPatient.tokenNumber} (${nextPatient.name}) is next up for ${doctor.name}!`,
      type: 'info'
    });

    res.json({ patient: nextPatient, doctor });
  });

  // POST /api/queue/skip
  router.post('/queue/skip', (req, res) => {
    const { patientId } = req.body;
    if (!patientId) return res.status(400).json({ message: 'Patient ID is required' });

    const patient = DB.getPatient(patientId);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    // Mark patient status as skipped
    DB.updatePatient(patientId, { status: 'skipped' });

    // Release physician current token if they were processing
    const doctor = DB.getDoctors().find(d => d.id === patient.doctorId);
    if (doctor && doctor.currentPatientToken === patient.tokenNumber) {
      DB.updateDoctor(doctor.id, { currentPatientToken: null });
    }

    broadcastQueueUpdate();
    io.emit('toast:notify', {
      message: `Token ${patient.tokenNumber} (${patient.name}) marked as skipped.`,
      type: 'warning'
    });
    res.json({ message: 'Token skipped safely' });
  });

  // POST /api/queue/complete
  router.post('/queue/complete', (req, res) => {
    const { patientId, consultationTimeMinutes } = req.body;
    if (!patientId) return res.status(400).json({ message: 'Patient ID is required' });

    const patient = DB.getPatient(patientId);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const callTime = patient.calledAt ? new Date(patient.calledAt).getTime() : Date.now() - 5 * 60000;
    const computedDuration = Math.max(1, Math.round((Date.now() - callTime) / 60000));
    const duration = consultationTimeMinutes ? Number(consultationTimeMinutes) : computedDuration;

    DB.updatePatient(patientId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      consultationMinutes: duration,
    });

    // Release doctor
    const doctor = DB.getDoctors().find(d => d.id === patient.doctorId);
    if (doctor) {
      // Calculate dynamic doctor consultation average
      const completed = DB.getPatients().filter(p => p.doctorId === doctor.id && p.status === 'completed');
      let total = 0;
      completed.forEach(p => total += (p.consultationMinutes || 5));
      const avgMinutes = completed.length > 0 ? Math.round(total / completed.length) : doctor.avgConsultationMinutes;

      DB.updateDoctor(doctor.id, {
        currentPatientToken: null,
        avgConsultationMinutes: Math.max(3, avgMinutes)
      });
    }

    broadcastQueueUpdate();
    io.emit('toast:notify', {
      message: `Consultation completed for Token ${patient.tokenNumber}.`,
      type: 'success'
    });
    res.json({ message: 'Consultation completed successfully' });
  });

  // POST /api/queue/reset
  router.post('/queue/reset', (req, res) => {
    DB.resetAllQueues();
    broadcastQueueUpdate();
    io.emit('toast:notify', {
      message: `Attention: The active clinic queue has been reset!`,
      type: 'warning'
    });
    res.json({ message: 'Queue reset completed. All waiting panels cleared.' });
  });

  // ==========================================
  // CONFIG & OTHER METRICS
  // ==========================================

  // GET /api/settings
  router.get('/settings', (req, res) => {
    res.json(DB.getSettings());
  });

  // PUT /api/settings
  router.put('/settings', (req, res) => {
    const updated = DB.updateSettings(req.body);
    broadcastQueueUpdate();
    res.json(updated);
  });

  // GET /api/doctors
  router.get('/doctors', (req, res) => {
    res.json(DB.getDoctors());
  });

  // POST /api/doctors
  router.post('/doctors', (req, res) => {
    const { name, specialty, room, avgConsultationMinutes } = req.body;
    if (!name || !specialty || !room) {
      return res.status(400).json({ message: 'Doctor credentials and rooms are required' });
    }

    const newDoc: Doctor = {
      id: 'doc-' + Math.random().toString(36).substr(2, 9),
      name,
      specialty,
      room,
      availability: 'active',
      currentPatientToken: null,
      avgConsultationMinutes: Number(avgConsultationMinutes || 10),
    };

    DB.addDoctor(newDoc);
    broadcastQueueUpdate();
    res.status(201).json(newDoc);
  });

  // PUT /api/doctors/:id (e.g. status updates)
  router.put('/doctors/:id', (req, res) => {
    const updated = DB.updateDoctor(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: 'Physician not found' });
    broadcastQueueUpdate();
    res.json(updated);
  });

  // GET /api/analytics
  router.get('/analytics', (req, res) => {
    res.json(DB.getAnalytics());
  });

  // GET /api/db-status
  router.get('/db-status', (req, res) => {
    res.json({ 
      connected: DB.isMongoConnected(),
      error: DB.getMongoConnectionError()
    });
  });

  return router;
}
