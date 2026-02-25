# CityFix API Reference

**Base URL:** `https://<your-domain>/api`  
**Version:** 1.0  
**Authentication:** Firebase ID Token (`Bearer <token>` in `Authorization` header)

---

## Table of Contents

1. [Authentication & Users](#1-authentication--users)
2. [Issues (Public & Citizen)](#2-issues-public--citizen)
3. [Admin](#3-admin)
4. [Health Check](#4-health-check)
5. [Data Models](#5-data-models)
6. [Error Responses](#6-error-responses)
7. [Role Summary](#7-role-summary)

---

## Authentication

All protected endpoints require a Firebase ID Token sent as a Bearer token in the `Authorization` header.

```http
Authorization: Bearer <firebase-id-token>
```

**Roles:**

| Role | Description |
|---|---|
| `CITIZEN` | Regular app user who can report and vote on issues |
| `SECTOR_ADMIN` | Department admin who manages issues in their sector |
| `SUPER_ADMIN` | Platform admin with full visibility and analytics |

---

## 1. Authentication & Users

### POST `/api/auth/register`

Register a new user in MongoDB after Firebase Auth signup. Idempotent — calling again for the same Firebase UID returns the existing user.

**Auth:** Required (`Bearer <token>`)  
**Roles:** Any authenticated Firebase user

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `fullName` | `string` | ✅ | User's full name |
| `phoneNumber` | `string` | ❌ | User's phone number |
| `role` | `string` | ❌ | `CITIZEN` (default), `SECTOR_ADMIN`, or `SUPER_ADMIN` |
| `department` | `string` | ✅ if `SECTOR_ADMIN` | `Water`, `Waste`, `Road`, or `Electricity` |

**Example Request:**
```json
{
  "fullName": "Abebe Girma",
  "phoneNumber": "+251911000000",
  "role": "CITIZEN"
}
```

**Responses:**

| Status | Description |
|---|---|
| `201 Created` | User registered successfully |
| `200 OK` | User already registered (returns existing user) |
| `422 Unprocessable Entity` | Validation error |
| `401 Unauthorized` | Missing or invalid Firebase token |

**201 Response Body:**
```json
{
  "message": "User registered successfully.",
  "user": {
    "_id": "64abc123...",
    "firebaseUid": "abc123uid",
    "email": "abebe@example.com",
    "fullName": "Abebe Girma",
    "role": "CITIZEN",
    "phoneNumber": "+251911000000",
    "fcmToken": null,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### GET `/api/users/me`

Returns the currently authenticated user's profile.

**Auth:** Required  
**Roles:** Any

**Responses:**

| Status | Description |
|---|---|
| `200 OK` | User object |
| `401 Unauthorized` | Missing or invalid token |

**200 Response Body:**
```json
{
  "_id": "64abc123...",
  "firebaseUid": "abc123uid",
  "email": "abebe@example.com",
  "fullName": "Abebe Girma",
  "role": "CITIZEN",
  "phoneNumber": "+251911000000",
  "department": null,
  "fcmToken": null,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

---

## 2. Issues (Public & Citizen)

### GET `/api/issues`

Public feed of all issue reports. No authentication required.

**Auth:** Not required

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `sort` | `string` | `recent` (default, newest first) or `urgent` (most votes first) |
| `kebele` | `string` | Filter by kebele/locality name |

**Example:**
```
GET /api/issues?sort=urgent&kebele=Bole
```

**200 Response Body:**
```json
[
  {
    "_id": "64abc001...",
    "category": "Road",
    "description": "Large pothole near the roundabout",
    "status": "Pending",
    "urgencyCount": 12,
    "photoUrl": "https://...",
    "location": {
      "latitude": 9.0247,
      "longitude": 38.7468,
      "address": "Bole Road",
      "kebele": "Bole"
    },
    "citizenId": { "_id": "64abc123...", "fullName": "Abebe Girma" },
    "assignedAdminId": { "_id": "64abc456...", "fullName": "Admin User", "department": "Road" },
    "draftedAt": null,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
]
```

---

### POST `/api/issues`

Report a new civic issue. Automatically routes to a matching Sector Admin by category.

**Auth:** Required  
**Roles:** `CITIZEN`

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `category` | `string` | ✅ | `Water`, `Waste`, `Road`, or `Electricity` |
| `description` | `string` | ✅ | Description of the issue |
| `photoUrl` | `string` | ❌ | URL of an uploaded photo |
| `location.latitude` | `number` | ❌ | GPS latitude |
| `location.longitude` | `number` | ❌ | GPS longitude |
| `location.address` | `string` | ❌ | Street address |
| `location.kebele` | `string` | ❌ | Kebele/locality name |
| `draftedAt` | `string` (ISO 8601) | ❌ | Original capture time for offline-synced reports |

**Example Request:**
```json
{
  "category": "Water",
  "description": "Broken water pipe leaking on main street",
  "photoUrl": "https://storage.example.com/photo.jpg",
  "location": {
    "latitude": 9.0247,
    "longitude": 38.7468,
    "address": "Main Street",
    "kebele": "Kirkos"
  },
  "draftedAt": "2025-01-01T09:00:00.000Z"
}
```

**Responses:**

| Status | Description |
|---|---|
| `201 Created` | Issue created |
| `422 Unprocessable Entity` | Validation error |
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Role not allowed |

---

### GET `/api/issues/mine`

Get all issues submitted by the authenticated citizen.

**Auth:** Required  
**Roles:** `CITIZEN`

**200 Response Body:** Array of issue objects (same structure as the public feed, without `citizenId` population).

---

### GET `/api/issues/:id`

Fetch a single issue with all its comments.

**Auth:** Not required

**Path Parameters:**

| Parameter | Description |
|---|---|
| `id` | MongoDB ObjectId of the issue |

**Responses:**

| Status | Description |
|---|---|
| `200 OK` | Issue and comments |
| `404 Not Found` | Issue not found |

**200 Response Body:**
```json
{
  "issue": {
    "_id": "64abc001...",
    "category": "Road",
    "description": "Large pothole near the roundabout",
    "status": "Pending",
    "urgencyCount": 12,
    "citizenId": { "_id": "64abc123...", "fullName": "Abebe Girma" },
    "assignedAdminId": { "_id": "64abc456...", "fullName": "Admin User", "department": "Road" },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  "comments": [
    {
      "_id": "64abc789...",
      "issueId": "64abc001...",
      "text": "This has been here for weeks!",
      "authorId": { "_id": "64abc123...", "fullName": "Abebe Girma", "role": "CITIZEN" },
      "createdAt": "2025-01-02T00:00:00.000Z"
    }
  ]
}
```

---

### POST `/api/issues/:id/vote`

Toggle an urgency vote on an issue. Voting twice removes the vote (toggle behaviour).

**Auth:** Required  
**Roles:** `CITIZEN`

**Path Parameters:**

| Parameter | Description |
|---|---|
| `id` | MongoDB ObjectId of the issue |

**Responses:**

| Status | Description |
|---|---|
| `200 OK` | Vote toggled |
| `404 Not Found` | Issue not found |

**200 Response Body:**
```json
{
  "voted": true,
  "urgencyCount": 13
}
```

---

### POST `/api/issues/:id/comments`

Add a comment to an issue.

**Auth:** Required  
**Roles:** Any authenticated user

**Path Parameters:**

| Parameter | Description |
|---|---|
| `id` | MongoDB ObjectId of the issue |

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `text` | `string` | ✅ | Comment body text |

**Responses:**

| Status | Description |
|---|---|
| `201 Created` | Comment created |
| `422 Unprocessable Entity` | Validation error |
| `404 Not Found` | Issue not found |

**201 Response Body:**
```json
{
  "_id": "64abc789...",
  "issueId": "64abc001...",
  "text": "This has been here for weeks!",
  "authorId": { "_id": "64abc123...", "fullName": "Abebe Girma", "role": "CITIZEN" },
  "createdAt": "2025-01-02T00:00:00.000Z"
}
```

---

### POST `/api/issues/:id/report`

Flag an issue as inappropriate for admin review.

**Auth:** Required  
**Roles:** `CITIZEN`

**Path Parameters:**

| Parameter | Description |
|---|---|
| `id` | MongoDB ObjectId of the issue |

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `reason` | `string` | ✅ | Reason for the report |

**Responses:**

| Status | Description |
|---|---|
| `201 Created` | Issue flagged |
| `404 Not Found` | Issue not found |
| `422 Unprocessable Entity` | Validation error |

**201 Response Body:**
```json
{
  "message": "Issue reported for review.",
  "report": {
    "_id": "64abcdef...",
    "issueId": "64abc001...",
    "citizenId": "64abc123...",
    "reason": "Spam or misleading content",
    "createdAt": "2025-01-02T00:00:00.000Z"
  }
}
```

---

### POST `/api/issues/:id/feedback`

Submit a star rating after an issue is resolved. One feedback per citizen per issue (upsert).

**Auth:** Required  
**Roles:** `CITIZEN`

**Path Parameters:**

| Parameter | Description |
|---|---|
| `id` | MongoDB ObjectId of the issue |

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `rating` | `integer` (1–5) | ✅ | Satisfaction rating |
| `comment` | `string` | ❌ | Optional text feedback |

**Responses:**

| Status | Description |
|---|---|
| `201 Created` | Feedback submitted / updated |
| `404 Not Found` | Issue not found |
| `422 Unprocessable Entity` | Validation error |

**201 Response Body:**
```json
{
  "_id": "64abcfed...",
  "issueId": "64abc001...",
  "citizenId": "64abc123...",
  "rating": 4,
  "comment": "Fixed quickly, thank you!",
  "createdAt": "2025-01-05T00:00:00.000Z"
}
```

---

## 3. Admin

All admin endpoints require authentication and a `SECTOR_ADMIN` or `SUPER_ADMIN` role (except Analytics which is `SUPER_ADMIN` only).

### GET `/api/admin/issues`

Fetch issues for admin review.
- **Sector Admin:** returns only issues assigned to them.
- **Super Admin:** returns all issues.

**Auth:** Required  
**Roles:** `SECTOR_ADMIN`, `SUPER_ADMIN`

**200 Response Body:** Array of issue objects with citizen contact info populated:
```json
[
  {
    "_id": "64abc001...",
    "category": "Water",
    "description": "Broken water pipe",
    "status": "Pending",
    "urgencyCount": 5,
    "citizenId": {
      "_id": "64abc123...",
      "fullName": "Abebe Girma",
      "email": "abebe@example.com",
      "phoneNumber": "+251911000000"
    },
    "assignedAdminId": { "_id": "64abc456...", "fullName": "Admin User", "department": "Water" },
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
]
```

---

### PUT `/api/admin/issues/:id/status`

Update the status of an issue.
- **Sector Admin:** can only update issues assigned to them.
- **Super Admin:** can update any issue.
- Sends a push notification to the citizen when status changes to `Resolved`.

**Auth:** Required  
**Roles:** `SECTOR_ADMIN`, `SUPER_ADMIN`

**Path Parameters:**

| Parameter | Description |
|---|---|
| `id` | MongoDB ObjectId of the issue |

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | `string` | ✅ | `In Progress` or `Resolved` |

**Example Request:**
```json
{
  "status": "In Progress"
}
```

**Responses:**

| Status | Description |
|---|---|
| `200 OK` | Updated issue object |
| `404 Not Found` | Issue not found or not assigned to you |
| `422 Unprocessable Entity` | Invalid status value |

---

### GET `/api/admin/analytics`

Aggregated platform statistics for the Super Admin dashboard.

**Auth:** Required  
**Roles:** `SUPER_ADMIN` only

**200 Response Body:**
```json
{
  "totalIssues": 150,
  "byStatus": {
    "Pending": 60,
    "In Progress": 45,
    "Resolved": 45
  },
  "byCategory": {
    "Water": 40,
    "Waste": 35,
    "Road": 50,
    "Electricity": 25
  },
  "avgResolutionTimeDays": 3.2,
  "avgFeedbackRating": 4.1
}
```
> **Note:** The exact shape of the analytics response depends on the `analyticsService` aggregation pipeline. The fields above are illustrative.

---

## 4. Health Check

### GET `/health`

Simple liveness check. No authentication required.

**200 Response Body:**
```json
{
  "status": "ok",
  "service": "CityFix API"
}
```

---

## 5. Data Models

### User

| Field | Type | Values / Notes |
|---|---|---|
| `_id` | `ObjectId` | MongoDB ID |
| `firebaseUid` | `string` | Firebase Auth UID (unique) |
| `email` | `string` | Lowercased |
| `fullName` | `string` | |
| `phoneNumber` | `string` | Optional |
| `role` | `string` | `CITIZEN`, `SECTOR_ADMIN`, `SUPER_ADMIN` |
| `department` | `string` | `Water`, `Waste`, `Road`, `Electricity` — required for `SECTOR_ADMIN` |
| `fcmToken` | `string \| null` | Firebase Cloud Messaging token for push notifications |
| `createdAt` | `ISO 8601 string` | Auto-set |
| `updatedAt` | `ISO 8601 string` | Auto-set |

---

### IssueReport

| Field | Type | Values / Notes |
|---|---|---|
| `_id` | `ObjectId` | MongoDB ID |
| `citizenId` | `ObjectId` | Reference to `User` |
| `assignedAdminId` | `ObjectId \| null` | Reference to `User` (auto-routed) |
| `category` | `string` | `Water`, `Waste`, `Road`, `Electricity` |
| `description` | `string` | |
| `photoUrl` | `string \| null` | |
| `location.latitude` | `number` | Optional |
| `location.longitude` | `number` | Optional |
| `location.address` | `string` | Optional |
| `location.kebele` | `string` | Optional |
| `status` | `string` | `Pending`, `In Progress`, `Resolved` |
| `urgencyCount` | `number` | Aggregated vote total |
| `draftedAt` | `Date \| null` | Offline-captured timestamp |
| `createdAt` | `ISO 8601 string` | Auto-set |
| `updatedAt` | `ISO 8601 string` | Auto-set |

---

### Comment

| Field | Type | Notes |
|---|---|---|
| `_id` | `ObjectId` | |
| `issueId` | `ObjectId` | Reference to `IssueReport` |
| `authorId` | `ObjectId` | Reference to `User` |
| `text` | `string` | |
| `createdAt` | `ISO 8601 string` | |

---

### Feedback

| Field | Type | Notes |
|---|---|---|
| `_id` | `ObjectId` | |
| `issueId` | `ObjectId` | Reference to `IssueReport` |
| `citizenId` | `ObjectId` | Reference to `User` |
| `rating` | `number` | Integer 1–5 |
| `comment` | `string` | Optional |
| `createdAt` | `ISO 8601 string` | |

---

### UrgencyVote

| Field | Type | Notes |
|---|---|---|
| `_id` | `ObjectId` | |
| `issueId` | `ObjectId` | Reference to `IssueReport` |
| `citizenId` | `ObjectId` | Reference to `User` |
| `createdAt` | `ISO 8601 string` | |

---

### ReportedPost

| Field | Type | Notes |
|---|---|---|
| `_id` | `ObjectId` | |
| `issueId` | `ObjectId` | Reference to `IssueReport` |
| `citizenId` | `ObjectId` | Reference to `User` |
| `reason` | `string` | |
| `createdAt` | `ISO 8601 string` | |

---

## 6. Error Responses

All errors follow a consistent JSON format:

```json
{
  "message": "Human-readable error message.",
  "errors": [
    {
      "field": "category",
      "message": "category must be Water, Waste, Road, or Electricity."
    }
  ]
}
```

> The `errors` array is only present for `422 Unprocessable Entity` validation failures.

| HTTP Status | Meaning |
|---|---|
| `200 OK` | Success (or idempotent re-register) |
| `201 Created` | Resource created |
| `400 Bad Request` | Malformed request |
| `401 Unauthorized` | Missing or invalid Firebase token |
| `403 Forbidden` | Authenticated but insufficient role |
| `404 Not Found` | Resource not found |
| `422 Unprocessable Entity` | Validation failed |
| `500 Internal Server Error` | Unexpected server error |

---

## 7. Role Summary

| Endpoint | CITIZEN | SECTOR_ADMIN | SUPER_ADMIN | Public |
|---|:---:|:---:|:---:|:---:|
| `GET /health` | ✅ | ✅ | ✅ | ✅ |
| `POST /api/auth/register` | ✅ | ✅ | ✅ | — |
| `GET /api/users/me` | ✅ | ✅ | ✅ | — |
| `GET /api/issues` | ✅ | ✅ | ✅ | ✅ |
| `GET /api/issues/mine` | ✅ | — | — | — |
| `POST /api/issues` | ✅ | — | — | — |
| `GET /api/issues/:id` | ✅ | ✅ | ✅ | ✅ |
| `POST /api/issues/:id/vote` | ✅ | — | — | — |
| `POST /api/issues/:id/comments` | ✅ | ✅ | ✅ | — |
| `POST /api/issues/:id/report` | ✅ | — | — | — |
| `POST /api/issues/:id/feedback` | ✅ | — | — | — |
| `GET /api/admin/issues` | — | ✅ | ✅ | — |
| `PUT /api/admin/issues/:id/status` | — | ✅ | ✅ | — |
| `GET /api/admin/analytics` | — | — | ✅ | — |
