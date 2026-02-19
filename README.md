# app
Finacial Transparency Platform

## API Documentation

This project uses Swagger UI for API documentation.

To view the API docs, start the server and visit:
```
http://localhost:3229/api-docs
```

## Setup

### Requirements

| Tool | Version | Purpose |
|---|---|---|
| [Node.js](https://nodejs.org/en) | v18+ | JavaScript runtime |
| [MongoDB Community Server](https://www.mongodb.com/try/download/community) | Latest | Local database server |
| [MongoDB Compass](https://www.mongodb.com/products/tools/compass) | Latest | Visual database explorer |

---

### Installation

**1. Install Node.js**
Download and install from [nodejs.org](https://nodejs.org/en). Verify installation:
```bash
node -v
npm -v
```

**2. Install MongoDB Community Server**
Download from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community).
This runs the local database your application connects to.

> On Windows, the installer will offer to install MongoDB Compass at the same time — select yes to save a step.

**3. Install MongoDB Compass** *(optional but recommended)*
Download from [mongodb.com/products/tools/compass](https://www.mongodb.com/products/tools/compass).
Compass lets you visually browse your collections, run queries, and inspect documents without writing code.

**4. Connect Compass to your local server**
Open Compass and use this connection string:
```
mongodb://127.0.0.1:27017
```

---

### Install dependencies
```bash
npm install
```

### Run the application
```bash
npm run start
```


## Architecture

This project follows a layered architecture pattern:
```
Routes → Controllers → Services
```

| Layer | Responsibility |
|---|---|
| **Routes** | Define API endpoints and HTTP methods |
| **Controllers** | Handle request/response logic, delegates to services |
| **Services** | Business logic and database operations |

### Example flow
POST /users → createUser() (controller) → createUserService() (service)

### Folder structure
```
src/
├── routes/
├── controllers/
├── services/
└── models/
```
Create once we start implementing endpoints