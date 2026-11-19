# PropertyCare
The website/mobile app is to help homeowners maintain properties.
PropertyCare is a small maintenance request system for property managers, tenants, and workers. It includes a dashboard, property listings, photo uploads, JWT authentication, and request status tracking.

It started as a Node.js/Express project and uses SQLite for local data storage.

[Features]
Account login with JWT authentication
Create maintenance requests
Upload photos with requests
Filter and search requests
Track open, assigned, in-progress, completed, and closed work
View request details
Mobile-friendly Bootstrap interface
Built With
Node.js
Express
Sequelize
SQLite
JSON Web Tokens
bcrypt
Multer
Bootstrap 5
Jest and Supertest
Getting Started

[1. Install dependencies]
bash
npm install

[2. Create an environment file]
Create a .env file in the project root:

env
PORT=3000
JWT_SECRET=replace_this_with_a_random_secret
DB_STORAGE=./maintenance.sqlite
NODE_ENV=development
ADMIN_EMAIL=admin@propertycare.com
ADMIN_PASSWORD=admin123
You do not need to configure MySQL for the normal SQLite setup.

[3. Start the application]
bash
npm start
For automatic restarts while developing:

[bash]
npm run dev
Open:

[Text]
http://localhost:3000
Default Login
A development admin account is created automatically if one does not already exist:

[Text]
Email: admin@propertycare.com
Password: admin123
Change these credentials before deploying the app.

[Project Structure]
Text
.
├── public/
│   ├── index.html
│   ├── login.html
│   ├── new-request.html
│   ├── public-request.html
│   ├── view.html
│   └── style.css
├── routes/
│   ├── auth.js
│   ├── properties.js
│   └── requests.js
├── models/
│   ├── index.js
│   ├── user.js
│   ├── property.js
│   ├── maintenanceRequest.js
│   └── photo.js
├── middleware/
│   └── auth.js
├── uploads/
├── app.js
├── server.js
├── package.json
└── package-lock.json
Running Tests
bash
npm test
Jest tests run with Supertest and an in-memory SQLite database.

Main API Routes
Method	Route	Description
POST	/api/auth/login	Log in and receive a JWT
GET	/api/properties	List properties
GET	/api/requests	List maintenance requests
POST	/api/requests	Create a maintenance request
GET	/api/requests/:id	View a maintenance request
PUT	/api/requests/:id	Update a maintenance request
PATCH	/api/requests/:id/status	Update request status
PATCH	/api/requests/:id/assign	Assign a worker
DELETE	/api/requests/:id	Delete a maintenance request
GET	/health	Check whether the server is running
Protected routes expect:

[HTTP]
Authorization: Bearer YOUR_JWT_TOKEN
Request Photos
Uploaded images are stored in the uploads directory and served from:

[Text]
/uploads/<filename>
Photo uploads are limited to image files with a maximum size of 5–10 MB, depending on the route configuration.

[Environment Notes]
.env values are loaded through dotenv
SQLite is used for local development
The database file is created automatically
Set NODE_ENV=production when deploying
Set a strong JWT_SECRET
Do not use the default admin password in production
If the project is deployed to a writable host, make sure uploads/ and the SQLite database directory can be written to
Possible Improvements
Add account registration
Hash the seeded admin password through the User model
Add role-based page controls
Improve worker assignment
Add automated tests
Add image deletion
Move to PostgreSQL or MySQL for production
Add deployment and backup instructions
