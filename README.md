# StayMate

**A Centralized Hostel & Mess Booking Marketplace**

---

## 🔗 Live Demo & Source Code

- **Live Website:** [http://stay-mate-bucket.s3-website-us-east-1.amazonaws.com/](http://staymate-frontend-bucket.s3-website-us-east-1.amazonaws.com)
- **GitHub Repository:** [Insert Your GitHub Repo Link Here](https://github.com/your-username/staymate)

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Architecture](#architecture)
- [AWS Services Used](#aws-services-used)
- [Implementation](#implementation)
- [Security](#security)
- [Results](#results)
- [Future Work](#future-work)
- [References](#references)

---

## Project Overview

StayMate is a centralized platform designed to simplify the process of searching, comparing, and booking verified hostels and mess facilities for university students. Traditional methods are often unreliable, time-consuming, or unverified. StayMate addresses this by providing a **secure, scalable, and user-friendly solution** built on **AWS Serverless Architecture**.

The platform ensures:

- **Trust:** Verified listings with image galleries.
- **Transparency:** Student reviews and ratings.
- **Efficiency:** Streamlined booking workflows for both Hostels and Mess Services.
- **Scalability:** Cost-effective infrastructure using AWS Learner Lab constraints.

---

## Features

### For Students

- **Smart Search:** Filter Hostels and Messes by city, price range, and amenities.
- **Detailed Listings:** View room types, facility images, and mess menus.
- **Reviews & Ratings:** Read and write peer reviews for transparency.
- **Booking Management:** Track booking status (Pending/Confirmed) and active subscriptions.

### For Owners

- **Hostel Dashboard:** Manage property details, room availability, and **Approve/Reject** booking requests.
- **Mess Dashboard:** Manage monthly meal plans and view **Active Subscribers** (Instant Subscription model).
- **Image Management:** Securely upload property images using S3 Pre-signed URLs.

---

## Architecture

The system utilizes a **Serverless 3-Tier Architecture** adapted for the AWS Academy Learner Lab environment:

1. **Frontend:** React.js application hosting on **Amazon S3** (Static Website Hosting).
2. **API Layer:** **Amazon API Gateway** serving as the RESTful entry point.
3. **Compute:** **AWS Lambda** (Node.js/Express) handling all business logic securely.
4. **Storage:**
   - **Amazon S3** for storing user-uploaded media (Hostel/Mess photos).
   - **Amazon RDS (PostgreSQL)** for structured relational data (Users, Bookings, Reviews).
5. **Monitoring:** **Amazon CloudWatch** for application logging and debugging.

![MVP Architecture Diagram](mvp_architecture_diagram.png)

---

## AWS Services Used

| Service                | Purpose                                  |
| ---------------------- | ---------------------------------------- |
| **Amazon S3**          | Frontend hosting & Media (Image) storage |
| **AWS Lambda**         | Serverless backend business logic        |
| **Amazon API Gateway** | RESTful API management                   |
| **Amazon RDS**         | PostgreSQL Database for relational data  |
| **AWS IAM**            | Role-based permissions & security        |
| **Amazon CloudWatch**  | Server logs & error monitoring           |

---

## Implementation

### Frontend

- Built with **React.js** and **Bootstrap 5**.
- Consumes REST APIs to render dynamic dashboards for Students, Hostel Owners, and Mess Owners.

### Backend

- **Node.js (Express)** application wrapped in a monolithic AWS Lambda function.
- Handles complex logic including:
  - **Booking Approval Workflow** (Pending $\to$ Confirmed) for Hostels.
  - **Instant Activation** logic for Mess Subscriptions.
  - **S3 Pre-signed URL** generation for secure client-side uploads.

### Database (PostgreSQL)

Relational schema designed to handle:

- Users (RBAC: Student, Hostel Owner, Mess Owner)
- Hostels & Rooms (One-to-Many relationship)
- Mess Services & Subscriptions
- Reviews (Linked to Students and Properties)

### API Endpoints Overview

| Method | Endpoint                | Description                                        |
| :----- | :---------------------- | :------------------------------------------------- |
| `GET`  | `/hostels`, `/messes`   | Search properties with filters                     |
| `POST` | `/book`                 | Handle Room Booking (Pending) or Mess Sub (Active) |
| `GET`  | `/bookings`             | Fetch Student Dashboard data                       |
| `GET`  | `/mess-subscribers/:id` | Fetch Active Subscribers for Mess Owners           |
| `POST` | `/get-upload-url`       | Generate secure S3 upload link                     |

---

## Security

- **Data Privacy:** User passwords are hashed using **bcrypt** before storage.
- **Network Security:** RDS is secured via Security Groups allowing traffic only from trusted sources.
- **Access Control:** IAM Roles follow the principle of **Least Privilege** for Lambda and S3 access.
- **Secure Uploads:** Direct S3 uploads are restricted via Pre-signed URLs with short expiration times.

---

## Results

- **Functional Marketplace:** Successfully connected students with service providers.
- **Real-time Interaction:** Instant updates on dashboards for bookings and subscriptions.
- **Cost Efficiency:** Zero idle server costs due to the serverless nature of Lambda and S3.

---

## Future Work

- **Payment Integration:** Stripe/Razorpay for processing security deposits.
- **Real-time Chat:** Socket.io implementation for direct Student-Owner communication.
- **AI Recommendations:** Machine learning model to suggest hostels based on user preferences.
- **Mobile App:** React Native port for iOS and Android.

---

## References

- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [Amazon RDS for PostgreSQL](https://aws.amazon.com/rds/postgresql/)
- [React.js Documentation](https://react.dev)
- [Node-Postgres (pg) Library](https://node-postgres.com/)
