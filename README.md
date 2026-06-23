# 🏥 Queue Cure '26 - Intelligent Healthcare Queue Management Platform

Queue Cure '26 is a premium full-stack, real-time healthcare queue management platform engineered to resolve the paper-token bottleneck that disrupts modern clinical operations. By unifying and aligning receptionists, physicians, and waiting patients in physical synchronization, Queue Cure replaces outdated clipboards with elegant, responsive digital diagnostic telemetry.

---

## 🚀 Key Highlights & Capabilities

*   **⚡ Real-Time Synchronization (Socket.IO)**: Updates patient queues, physician attendance flags, diagnostic notes, and timers instantly across reception desks, doctor cabins, and large lounges.
*   **📊 Integrated Analytics Dashboard**: High-fidelity custom SVG charts monitor hourly traffic admissions, daily distribution histograms, and relative doctor consultation performance metrics.
*   **🧠 Predictive Smart Wait Estimation**: Uses historical consultation speeds, active patient ahead loads, and individual doctor metrics to deliver accurate estimated wait and call times.
*   **🏥 High-Visibility TV Monitor Display**: Implements a dedicated overhead waiting board including pulsating caller notifications, live room maps, vacant states, and progress bars.
*   **📱 Seamless Mobile Waiting Lounge**: Patients enter their mobile numbers to retrieve an interactive digital clinical ticket stub showing their exact status with simulated barcodes on standard touch views.

---

## 🛠️ Folder Architecture Layout

```text
/
├── server.ts                 # Master Full-Stack bootstrap (Express + Sockets.IO + Vite)
├── server/
│   ├── db.ts                 # SQLite-equivalent JSON Document DB (Auto seeding on boot)
│   └── routes.ts             # REST Controllers (Auth, Patient CRUD, Queue actions, settings)
├── src/
│   ├── main.tsx              # Application index lifecycle
│   ├── App.tsx               # Master React context, socket client, and Router
│   ├── types.ts              # Universal clinical domain typescript declarations
│   ├── services/
│   │   └── api.ts            # Axios-equivalent fetching engine with Bearer JWT injection
│   └── components/
│       ├── ReceptionControl.tsx # Receptionists' intake & rapid call console
│       ├── WaitingTVBoard.tsx   # Lounge wide high contrast display map
│       ├── PatientPortal.tsx    # Digital ticket search lounge
│       ├── DoctorPortal.tsx     # Physicians' cabin workspaces (Simulator)
│       └── AnalyticsCharts.tsx  # Dynamic vector charts
```

---

## 🧬 Smart Wait & Estimation Logic Formula

Our scheduling and predictive wait model calculations apply the following logic:

$$\text{Estimated Wait Time} = N \times T_d$$

Where:
*   $N$ is the number of **Patients Ahead** assigned to the same doctor's room.
*   $T_d$ is the **Doctor's specific average consultation speed** (e.g. 8 mins / patient, dynamically updated as the doctor marks consultations completed).
*   If a doctor has no completed patients yet, the system falls back to the clinical default set in the `Settings`.

---

## 🖥️ How to Run & Direct Testing Steps

### 1. Verification & Fast Build
Verify TypeScript compilation and package status by calling the build pipeline:
```bash
npm run build
```

### 2. Launch Local Servers
Run the full-stack development workspace on Port `3000`:
```bash
npm run dev
```

### 3. Rapid Testing Guide (End-to-End Simulation)
To experience the true power of Socket.IO real-time linking, open the app in **three parallel browser tabs or split-screen preview panels**:

1.  **Tab 1 (Patient Lounge)**: Set to **Patient Portal** (default home). This represents what patients see on their phones or self-service kiosks.
2.  **Tab 2 (Overhead TV Board)**: Set to **Overhead Display**. This represents the large ceiling-mounted TV in the physical waiting room.
3.  **Tab 3 (Doctor Cabin)**: Set to **Doctor Cabin**, select *Dr. Marcus Vance*, and toggle his status to `active`.
4.  **Tab 4 (Reception Desk)**: Select **Cabin Login** -> click the **💡 Use Demo Credentials** quick link -> enter the desk.
    *   *Admit a Patient*: Enter "Bruce Wayne", Gender "Male", 40, Assigned doctor "Dr. Marcus Vance", reason "Post-Traumatic body pain", Priority "Emergency", and click **Issue Token**.
    *   *Watch Real-time magic*:
        *   An automatic token (e.g., `E-001` corresponding to Emergency) is generated.
        *   A toast alerts all active screens.
        *   "Bruce Wayne" instantly appears in Dr. Vance's pending patient queue list in **Tab 3**!
        *   "Patients Waiting" on the Overhead TV Board (**Tab 2**) elevates instantly.
    *   *Summon Patient*:
        *   In Tab 3 (Doctor Cabin), click **Summon Next Token**.
        *   The Overhead TV Board instantly rings with a large alert announcing: **"Now Serving E-001 - Bruce Wayne! Proceed immediately to Dr. Marcus Vance in Room 104"**!
        *   The active token updates dynamically to `E-001` across all monitors.
        *   The patient searches their phone number in Tab 1 (Patient Lounge) and views their updated status: **Proceed Immediately to Room 104**.
