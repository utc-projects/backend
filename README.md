# GTVT Hoc Tap - Backend

This is the backend API for the GTVT Hoc Tap project, built with [Node.js](https://nodejs.org/), [Express](https://expressjs.com/), and [MongoDB](https://www.mongodb.com/). It manages user authentication, data storage for tourism points and providers, and the request approval workflow.

## Features

- **RESTful API**: Endpoints for managing users, classes, courses, points, providers, and routes.
- **Authentication**: Secure JWT-based authentication with role-based authorization (Student, Lecturer, Admin).
- **Data Persistence**: MongoDB with Mongoose ODM.
- **File Uploads**: Image and video upload support using Multer.
- **Request Management**: Logic for handling change requests and approval flows.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose)
- **Auth**: JSON Web Tokens (JWT), bcryptjs
- **File Upload**: Multer
- **Middleware**: CORS, Dotenv

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- MongoDB (running locally or a cloud instance like MongoDB Atlas)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Create a `.env` file in the root directory (copy from `.env.example`).
   - Configure the following variables:
     ```env
     PORT=5001
     MONGO_URI=mongodb://localhost:27017/gtvt_hoc_tap
     JWT_SECRET=your_jwt_secret_key
     ```
   - Make sure your MongoDB instance is running.

4. Seed the database (optional but recommended for development):
   ```bash
   node src/scripts/seedDatabase.js
   ```

5. Start the server:
   - Development (with hot reload):
     ```bash
     npm run dev
     ```
   - Production:
     ```bash
     npm start
     ```

6. The API will be available at `http://localhost:5001`.

## API Documentation

Key endpoints include:

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login
- `GET /api/points` - Get all tourism points
- `GET /api/providers` - Get all service providers
- `GET /api/change-requests` - Get pending change requests (Admin/Lecturer)
- `PUT /api/change-requests/:id/approve` - Approve a request

## Project Structure

- `src/controllers`: Request handlers logic.
- `src/models`: Mongoose schemas and models.
- `src/routes`: API route definitions.
- `src/middlewares`: Auth and validation middlewares.
- `src/scripts`: Database seeding and utility scripts.
- `uploads`: Directory for uploaded media files.

## Contributors

- Project Team

## License

[ISC](LICENSE)
