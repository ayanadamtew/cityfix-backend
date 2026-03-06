<div align="center">
  <img src="https://raw.githubusercontent.com/ayanadamtew/cityfix-mobile/main/assets/images/app_icon.png" alt="CityFix Logo" width="120" />
  
  # CityFix Backend API
  **High-Performance Node.js Infrastructure for Urban Civic Management**

  [![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
  [![Express.js](https://img.shields.io/badge/Express.js-5.x-black?logo=express&logoColor=white)](https://expressjs.com/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
  [![Firebase](https://img.shields.io/badge/Firebase-Admin-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
  [![Jest](https://img.shields.io/badge/Testing-Jest-C21325?logo=jest&logoColor=white)](https://jestjs.io/)

  <p align="center">
    A robust, secure, and scalable RESTful API powering the CityFix ecosystem. Engineered to handle geospatial data processing, real-time civic issue synchronization, and secure administrative operations.
  </p>
</div>

<br />

## 🌟 Architecture Overview

The **CityFix Backend** serves as the central data processing and routing engine for both the CityFix Mobile App (Citizen facing) and the CityFix Admin Dashboard (Municipality facing). 

Built on a modern **Node.js/Express** foundation, the architecture emphasizes security, real-time bi-directional communication, and efficient geospatial querying critical for smart-city operations.

---

## 🚀 Core Capabilities

### 🔐 Multi-Tier Security & Authentication
- **Firebase Auth Integration**: Secure JWT verification bridging mobile and web clients.
- **Role-Based Middleware**: Enforced `requireAuth` and `requireRole` guards ensuring clear boundaries between Citizen and Admin operations.
- **Hardened Endpoints**: Comprehensive implementation of Helmet, CORS, and Express-Validator to prevent injection attacks and ensure strict data payloads.

### 📍 Geospatial Issue Management
- **GeoJSON Support**: Natively leverages MongoDB's geospatial indexing (`2dsphere`) to handle fast, radius-based queries for infrastructure issues.
- **Incident Lifecycle Management**: Full CRUD capabilities for civic reports, tracking status changes, severity, and photo evidentiary links (Firebase Storage).

### ⚡ Real-Time Operations Pipeline
- **Socket.io Integration**: Pushes instantaneous event notifications to the Admin Dashboard upon new citizen reports, eliminating polling overhead and reducing time-to-awareness.
- **Automated Routing Services**: Intelligent routing logic (`routingService.js`) to categorize and assign issues based on municipal department domains.

### 🗳️ Civic Engagement Systems
- **Voting & Analytics Engine**: Secure upvoting mechanisms (`voteService.js`) to gauge community prioritization of issues, coupled with temporal analytics (`analyticsService.js`) for municipal reporting.

---

## 🛠️ Technology Stack

| Category | Technology |
| :--- | :--- |
| **Runtime Environment**| Node.js |
| **API Framework** | Express 5.x |
| **Database/ORM** | MongoDB & Mongoose 9.x |
| **Authentication** | Firebase Admin SDK |
| **Real-Time Pub/Sub** | Socket.io 4.x |
| **Validation** | express-validator |
| **Security/Middleware**| Helmet, Morgan, CORS, dotenv |
| **Testing Suite** | Jest & Supertest |

---

## 🏗️ Local Development Setup

### Prerequisites
- Node.js (v20+ recommended)
- A running MongoDB instance (Local or Atlas)
- Firebase Project configured with a generated `serviceAccountKey.json` or equivalent environment variables.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ayanadamtew/cityfix-backend.git
   ```

2. **Navigate to the directory:**
   ```bash
   cd cityfix-backend
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Environment Configuration:**
   Create a `.env` file in the root directory. You can supply Firebase credentials either via a file path OR discrete variables (preferred for production integrations like Render).

   ```env
   # Server Config
   PORT=5000
   
   # Database
   MONGODB_URI=mongodb://localhost:27017/cityfix

   # Firebase Setup (Option 1: File Path for local dev)
   # FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
   
   # Firebase Setup (Option 2: Direct variables for production)
   FIREBASE_PROJECT_ID=cityfix-xxxxx
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@cityfix.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourKeyHere\n-----END PRIVATE KEY-----\n"
   ```

5. **Start the Development Server (with nodemon):**
   ```bash
   npm run dev
   ```
   *The API will be accessible at `http://localhost:5000`.*

---

## 🧪 Testing

The backend includes a comprehensive testing suite utilizing **Jest** and **Supertest** for endpoint validation, alongside an in-memory MongoDB server for isolated testing environments.

To execute the test suite:
```bash
npm test
```

---

## 📂 Project Structure

```text
src/
├── config/              # Infrastructure initialization
│   ├── db.js            # MongoDB connection logic
│   └── firebase.js      # Firebase Admin SDK initialization
├── controllers/         # Request handlers & busines logic coordination
│   ├── authController.js
│   ├── issueController.js
│   └── adminController.js
├── middlewares/         # Request interceptors
│   ├── requireAuth.js   # JWT verification
│   ├── requireRole.js   # RBAC enforcement
│   ├── validate.js      # Express-validator wrapper
│   └── errorHandler.js  # Global error trapping
├── routes/              # API endpoint definitions
│   ├── authRoutes.js
│   ├── issueRoutes.js
│   └── adminRoutes.js
├── services/            # Core business logic & external integrations
│   ├── routingService.js
│   ├── voteService.js
│   └── analyticsService.js
└── app.js               # Express application composition
server.js                # Server entry point & Socket.io attachment
```

---

## 🤝 Contributing

This repository is maintained by the CityFix core team. When contributing, please ensure:
- All new endpoints are thoroughly documented and covered by a corresponding test in the `tests/` directory.
- `express-validator` chains are implemented for all specific body/query parameters.

---

## 📄 License

This project is licensed under the ISC License.

---
<p align="center">
  <i>The invisible engine driving smarter cities.</i>
</p>
