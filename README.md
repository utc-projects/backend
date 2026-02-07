# Graduation Project Backend (Backend API)

API server for the Graduation Project (Đồ Án), handling tourism data, user authentication, and administrative approvals.

## Overview

This backend service manages the core data for the application, including:
- **Tourism Points:** Detailed information about locations.
- **Routes:** Curated travel routes connecting multiple points.
- **Service Providers:** Local businesses offering services.
- **Change Requests:** A workflow for users to suggest edits approved by admins.
- **User Management:** Authentication and role management (Admin, Approver, User).
- **Estimates:** Travel cost estimation logic.

It is built with **Node.js**, **Express**, and **MongoDB**.

## Tech Stack

- **Runtime:** Node.js (v18+ recommended)
- **Framework:** Express.js (v5) -> Fast, unopinionated web framework.
- **Database:** MongoDB (via Mongoose ODM) -> Schema-based NoSQL database.
- **Authentication:** JWT (JSON Web Tokens) & Bcrypt -> Secure password hashing and stateless auth.
- **File Handling:** Multer -> Handling `multipart/form-data` for image uploads.
- **Utilities:** `dotenv`, `cors`, `nodemon`.

## Prerequisites

Before starting, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v16 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) (running locally on port `27017` by default)

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory by copying the example:

```bash
cp .env.example .env
```

Update the variables in `.env` as needed:

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `PORT` | Local server port | `5001` |
| `MONGODB_URI` | MongoDB Connection String | `mongodb://localhost:27017/do_an_db` |
| `NODE_ENV` | Environment mode | `development` |
| `CLIENT_URL` | Frontend URL for CORS | `http://localhost:5173` |
| `JWT_SECRET` | Secret key for signing tokens | (Add your own secure string) |

### 4. Database Seeding (Optional)

You can populate the database with initial data using the provided scripts:

```bash
# Seed initial users (Admin/Approvers)
node src/scripts/seedUsers.js

# Seed sample tourism data
node src/scripts/seedDatabase.js
# OR
node src/scripts/seedProviders.js
```

### 5. Start the Server

**Development Mode (with auto-reload):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

The server will start at `http://localhost:5001`.
Health check endpoints: `http://localhost:5001/api/health`

## Project Structure

```
├── src/
│   ├── config/       # Database connection & env config
│   ├── controllers/  # Request logic (glue between routes & models)
│   ├── middlewares/  # Express middlewares (Auth, Uploads)
│   ├── models/       # Mongoose Schemas (Data definition)
│   ├── routes/       # API Route definitions
│   ├── scripts/      # Database seeding & utility scripts
│   └── app.js        # Express app setup
├── uploads/          # Directory for uploaded static files
├── server.js         # Entry point
└── package.json      # Dependencies & Scripts
```

## API Endpoints

| Resource | Base Path | Description |
|----------|-----------|-------------|
| **Auth** | `/api/auth` | Login, Register, Profile |
| **Points** | `/api/points` | CRUD Tourism Points |
| **Routes** | `/api/routes` | CRUD Travel Routes |
| **Providers** | `/api/providers` | CRUD Service Providers |
| **Requests** | `/api/change-requests` | Manage user edit proposals |
| **Permissions**| `/api/permissions` | Role & Access Control |
| **Notes** | `/api/notes` | Admin/User notes on entities |
| **Estimates** | `/api/estimates` | Cost calculation logic |

## Deployment

### Manual Deployment (PM2)

1. **Install PM2:**
   ```bash
   npm install -g pm2
   ```

2. **Start Application:**
   ```bash
   pm2 start server.js --name "tourism-backend"
   ```

3. **Monitor:**
   ```bash
   pm2 status
   pm2 logs
   ```

### Docker (Optional)

If deploying via Docker, create a `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5001
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t tourism-backend .
docker run -p 5001:5001 --env-file .env tourism-backend
```

## Troubleshooting

- **MongoDB Connection Error:** Ensure your local MongoDB service is running (`brew services start mongodb-community` on macOS or `sudo systemctl start mongod` on Linux).
- **CORS Issues:** Check `CLIENT_URL` in `.env` matches your frontend URL.
- **Permission Errors:** Ensure `node src/scripts/seedUsers.js` was run to create initial admin accounts.
