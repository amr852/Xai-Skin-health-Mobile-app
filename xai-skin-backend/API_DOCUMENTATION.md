# Xai Skin Health Backend API

## Setup Instructions

1. **Install dependencies**
   ```bash
   cd xai-skin-backend
   npm install
   ```

2. **Ensure MongoDB is running**
   ```bash
   mongod --dbpath "your_mongodb_data_path"
   ```
   Or if you're using MongoDB Atlas, update the `.env` file with your connection string.

3. **Configure environment variables**
   - The `.env` file is already created with default values
   - Update `JWT_SECRET` for production

4. **Start the backend server**
   ```bash
   npm start
   ```
   Or with nodemon for development:
   ```bash
   npx nodemon ./bin/www
   ```

The server will run on `http://localhost:3000` by default.

---

## API Endpoints

### Authentication

#### Register
- **POST** `/users/register`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "gender": "male",
    "dateOfBirth": "1990-01-01"
  }
  ```
- **Response:** `{ token, user }`

#### Login
- **POST** `/users/login`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response:** `{ token, user }`

### User Profile

#### Get Profile
- **GET** `/users/profile`
- **Headers:** `Authorization: Bearer {token}`
- **Response:** User object

#### Update Profile
- **PUT** `/users/profile`
- **Headers:** `Authorization: Bearer {token}`
- **Body:**
  ```json
  {
    "firstName": "John",
    "lastName": "Doe",
    "gender": "male",
    "dateOfBirth": "1990-01-01",
    "profilePicture": "url_to_image"
  }
  ```
- **Response:** `{ message, user }`

### Lesions (Skin Health Records)

#### Get All Lesions
- **GET** `/lesions`
- **Headers:** `Authorization: Bearer {token}`
- **Response:** Array of lesion objects

#### Get Single Lesion
- **GET** `/lesions/:id`
- **Headers:** `Authorization: Bearer {token}`
- **Response:** Lesion object

#### Create Lesion
- **POST** `/lesions`
- **Headers:** `Authorization: Bearer {token}`
- **Body:**
  ```json
  {
    "title": "Spot on arm",
    "description": "Red spot observed",
    "location": "right arm",
    "severity": "moderate",
    "imageUrl": "url_to_image",
    "notes": "Appeared after sun exposure",
    "vitals": {
      "temperature": 28,
      "humidity": 65,
      "uvIndex": 7
    }
  }
  ```
- **Response:** `{ message, lesion }`

#### Update Lesion
- **PUT** `/lesions/:id`
- **Headers:** `Authorization: Bearer {token}`
- **Body:** Same as create (all fields optional)
- **Response:** `{ message, lesion }`

#### Delete Lesion
- **DELETE** `/lesions/:id`
- **Headers:** `Authorization: Bearer {token}`
- **Response:** `{ message }`

---

## Testing the API

You can test the API using Postman, cURL, or integrate it with your React Native app.

### Example: cURL

```bash
# Register
curl -X POST http://localhost:3000/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","firstName":"Test","lastName":"User"}'

# Login
curl -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get Profile (replace TOKEN with actual token)
curl -X GET http://localhost:3000/users/profile \
  -H "Authorization: Bearer TOKEN"

# Create Lesion
curl -X POST http://localhost:3000/lesions \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Lesion","location":"arm","severity":"moderate"}'
```

---

## Database Schema

### User Collection
- `email` (String, unique)
- `password` (String, hashed)
- `firstName` (String)
- `lastName` (String)
- `dateOfBirth` (Date)
- `gender` (String)
- `profilePicture` (String)
- `createdAt` (Date)
- `updatedAt` (Date)

### Lesion Collection
- `userId` (ObjectId, reference to User)
- `title` (String)
- `description` (String)
- `location` (String)
- `severity` (String: low, moderate, high)
- `imageUrl` (String)
- `notes` (String)
- `status` (String: monitoring, improving, worsening, resolved)
- `vitals` (Object with temperature, humidity, uvIndex)
- `createdAt` (Date)
- `updatedAt` (Date)
- `dateObserved` (Date)

---

## Next Steps

1. Connect your React Native app to these endpoints
2. Store the JWT token in secure storage (AsyncStorage with encryption)
3. Add image upload functionality for lesion images
4. Implement AI analysis integration for lesion assessments
