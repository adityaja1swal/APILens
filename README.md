# 🔍 APILens: Security-Focused API Analysis Pipeline

APILens is a cutting-edge, agent-driven platform designed to discover, test, and secure API endpoints. It utilizes a streamlined 3-agent pipeline to provide comprehensive security analysis and remediation strategies.

---

## 🚀 Key Features

### 🛡️ 3-Agent Security Pipeline
- **Explorer Agent**: Automatically discovers and maps API endpoints, structures, and schemas.
- **Tester Agent**: Executes a battery of security tests, including OWASP Top 10 checks, fuzzer attacks, and logic validation.
- **Guardian Agent**: Analyzes vulnerabilities, provides proof-of-concept (PoC) exploits, and generates actionable remediation steps.

### 💎 Premium Design
- **Modern UI**: Built with React, Vite, and Framer Motion for smooth, interactive experiences.
- **Real-time Feedback**: Live status updates via Socket.io.
- **Deep Insights**: Detailed vulnerability reporting with code snippets and remediation guides.

---

## 🛠️ Technology Stack

### Backend
- **Core**: Node.js & Express
- **Real-time**: Socket.io
- **AI Integration**: Anthropic SDK (Claude)
- **Utilities**: uuid, node-fetch, dotenv

### Frontend
- **Framework**: React 19 + Vite
- **Animations**: Framer Motion
- **Visuals**: Recharts (Analytics), React-Markdown
- **Styling**: Vanilla CSS (Hand-crafted premium aesthetics)

---

## 🔧 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/adityaja1swal/APILens.git
   cd APILens
   ```

2. **Setup Backend**:
   ```bash
   cd backend
   npm install
   ```
   Create a `.env` file in the `backend` directory:
   ```env
   ANTHROPIC_API_KEY=your_api_key_here
   PORT=5000
   ```

3. **Setup Frontend**:
   ```bash
   cd ../frontend
   npm install
   ```

### Running the Application

1. **Start the Backend Server**:
   ```bash
   cd backend
   node server.js
   ```

2. **Start the Frontend Development Server**:
   ```bash
   cd frontend
   npm run dev
   ```

---

## 📂 Project Structure

```text
APILens/
├── backend/          # Node.js Express server
│   ├── agents/      # Agent logic (Explorer, Tester, Guardian)
│   ├── routes/      # API routes
│   └── server.js     # Entry point
├── frontend/         # React application
│   ├── src/
│   │   ├── components/  # UI Components
│   │   └── assets/      # Static assets
│   └── vite.config.js   # Vite configuration
└── .gitignore        # Global git exclusions
```

---

## 📜 License
This project is licensed under the ISC License.
